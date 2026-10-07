import { test } from "node:test";
import assert from "node:assert/strict";
import { isQRReferenceValid, isSCORReferenceValid } from "swissqrbill/utils";
import { ApiError, type ApiContext } from "@/lib/api-context";
import { addCareLevel, createRate, saveBillingSettings } from "@/lib/billing";
import {
  cancelInvoice,
  createInvoices,
  invoiceDetail,
  invoiceReference,
  invoiceRun,
  saveBillingAddress,
  saveInvoiceSettings,
} from "@/lib/invoices";
import { apiContextFor, createResident, fixture, q } from "../support/db";

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof ApiError, String(error));
    return error;
  }
  assert.fail("Fehler erwartet");
}

const withBilling = (ctx: ApiContext) =>
  ({
    ...ctx,
    actor: { ...ctx.actor, permissions: [...new Set([...ctx.actor.permissions, "billing.manage"])] },
  }) as ApiContext;

const creditor = {
  name: "Heim Sonnenhalde",
  street: "Seeweg",
  building: "4",
  zip: "8000",
  city: "Zürich",
  country: "CH",
};
const address = (name: string) => ({
  name,
  street: "Bergstrasse",
  building: "12",
  zip: "8001",
  city: "Zürich",
  country: "CH",
});

test("Rechnungen: Voraussetzungen, Erstellen mit fortlaufender Nummer, QR-Referenz, Storno und neu verrechnen", async () => {
  const f = await fixture();
  const nurse = await apiContextFor(f, "anna");
  const office = withBilling(await apiContextFor(f, "leadA"));
  const erna = await createResident(f, "Erna Muster");
  const hans = await createResident(f, "Hans Beispiel");
  const later = await createResident(f, "Lisa Später");
  await q(`UPDATE carecore_resident_stays SET started_at = '2026-03-03T10:00:00Z' WHERE resident_id = ANY($1)`, [
    [erna, hans],
  ]);
  assert.equal((await failure(invoiceRun(nurse, "2026-03"))).status, 403);

  let run = await invoiceRun(office, "2026-03");
  assert.deepEqual(run.missing, [
    "Regel zum Austrittstag (unter „Taxen der Einrichtung“)",
    "Name und Adresse der Einrichtung",
    "IBAN",
    "Zahlungsfrist",
  ]);
  assert.equal(run.monthClosed, true);
  assert.deepEqual(
    run.rows.map((row) => row.residentId).sort(),
    [erna, hans].sort(),
    "nur Personen mit Aufenthalt im Monat",
  );
  assert.ok(!run.rows.some((row) => row.residentId === later));
  assert.match((await failure(createInvoices(office, { month: "2026-03" }))).message, /Es fehlen noch/);

  // Zahlungsangaben prüfen.
  assert.match(
    (await failure(saveInvoiceSettings(office, { creditor, iban: "CH00 1234", paymentDays: 30 }))).message,
    /IBAN ist ungültig/,
  );
  assert.match(
    (
      await failure(
        saveInvoiceSettings(office, {
          creditor: { ...creditor, city: "" },
          iban: "CH4431999123000889012",
          paymentDays: 30,
        }),
      )
    ).message,
    /Postleitzahl und Ort/,
  );
  assert.match(
    (await failure(saveInvoiceSettings(office, { creditor, iban: "CH4431999123000889012", paymentDays: 500 }))).message,
    /Zahlungsfrist/,
  );
  await saveInvoiceSettings(office, { creditor, iban: "CH44 3199 9123 0008 8901 2", paymentDays: 30 });
  await saveBillingSettings(office, { dischargeDayBilled: false });
  await createRate(office, {
    name: "Pension",
    category: "pension",
    payer: "resident",
    validFrom: "2026-01-01",
    amountCents: 10000,
  });
  await createRate(office, {
    name: "Pflegestufe 2 · KVG",
    category: "care",
    careLevel: "Pflegestufe 2",
    payer: "insurer",
    validFrom: "2026-01-01",
    amountCents: 1920,
  });
  await addCareLevel(office, { residentId: erna, level: "Pflegestufe 2", validFrom: "2026-03-03" });

  run = await invoiceRun(office, "2026-03");
  assert.deepEqual(run.missing, []);
  assert.equal(run.qrBill, true);
  const ernaRow = run.rows.find((row) => row.residentId === erna);
  // 3.–31. März: 29 Tage × 100.00; Pflege zahlt die Krankenversicherung (nicht auf der Rechnung der Person).
  assert.equal(ernaRow?.totalCents, 290000);
  assert.equal(ernaRow?.hasAddress, false);

  // Laufender Monat: erst nach Monatsende.
  const current = run.today.slice(0, 7);
  assert.match((await failure(createInvoices(office, { month: current }))).message, /nach Monatsende/);

  let result = await createInvoices(office, { month: "2026-03" });
  assert.deepEqual(result.created, []);
  assert.deepEqual(
    result.skipped.map((entry) => entry.reason),
    ["keine Rechnungsadresse", "keine Rechnungsadresse"],
  );
  await saveBillingAddress(office, {
    residentId: erna,
    address: { ...address("Erna Muster"), addition: "c/o Tochter" },
  });
  await saveBillingAddress(office, { residentId: hans, address: address("Hans Beispiel") });
  result = await createInvoices(office, { month: "2026-03" });
  assert.deepEqual(result.created.map((entry) => entry.number).sort(), [1, 2]);
  const again = await createInvoices(office, { month: "2026-03" });
  assert.deepEqual(again.created, []);
  assert.deepEqual(
    again.skipped.map((entry) => entry.reason),
    ["bereits verrechnet", "bereits verrechnet"],
  );

  run = await invoiceRun(office, "2026-03");
  const invoiceId = run.rows.find((row) => row.residentId === erna)?.invoice?.id ?? "";
  const detail = await invoiceDetail(office, invoiceId);
  assert.equal(detail.invoice.totalCents, 290000);
  assert.deepEqual(
    detail.invoice.lines.map((line) => [line.name, line.fullDays, line.amountCents]),
    [["Pension", 29, 290000]],
  );
  assert.equal(detail.invoice.recipient.addition, "c/o Tochter");
  assert.equal(detail.invoice.iban, "CH4431999123000889012");
  assert.ok(isQRReferenceValid(detail.invoice.reference), "QR-Referenz mit Prüfziffer");
  assert.match(detail.paymentPart ?? "", /^<svg[^>]+width="210mm" height="105mm"/);
  assert.equal(
    new Date(`${detail.invoice.dueOn}T00:00:00Z`).getTime() -
      new Date(`${detail.invoice.issuedOn}T00:00:00Z`).getTime(),
    30 * 86_400_000,
  );

  // Festgehalten: eine spätere Preisänderung ändert die Rechnung nicht.
  const prices = `UPDATE carecore_billing_rate_prices SET amount_cents = $2
    WHERE rate_id IN (SELECT id FROM carecore_billing_rates WHERE organization_id = $1 AND name = 'Pension')`;
  await q(prices, [f.org, 99999]);
  assert.equal((await invoiceDetail(office, invoiceId)).invoice.totalCents, 290000);
  await q(prices, [f.org, 10000]);

  // Storno mit Grund, danach neu verrechnen mit der nächsten Nummer.
  assert.match((await failure(cancelInvoice(office, invoiceId, { reason: " " }))).message, /Grund/);
  await cancelInvoice(office, invoiceId, { reason: "Abwesenheit nachgetragen" });
  assert.equal((await failure(cancelInvoice(office, invoiceId, { reason: "x" }))).status, 409);
  assert.equal((await invoiceDetail(office, invoiceId)).paymentPart, null, "kein Zahlteil auf stornierten Rechnungen");
  result = await createInvoices(office, { month: "2026-03", residentIds: [erna] });
  assert.deepEqual(
    result.created.map((entry) => entry.number),
    [3],
  );
  run = await invoiceRun(office, "2026-03");
  assert.deepEqual(
    run.cancelled.map((entry) => [entry.number, entry.reason]),
    [[detail.invoice.number, "Abwesenheit nachgetragen"]],
  );
  const log = await q<{ action: string }>(
    `SELECT action FROM carecore_audit_log WHERE entity_type = 'invoice' AND after_data->>'residentId' = $1 ORDER BY created_at`,
    [erna],
  );
  assert.deepEqual(
    log.map((row) => row.action),
    ["created", "cancelled", "created"],
  );

  // Andere Einrichtungen sehen die Rechnung nicht.
  const other = withBilling(await apiContextFor(await fixture(), "leadA"));
  assert.equal((await failure(invoiceDetail(other, invoiceId))).status, 404);
  assert.equal((await failure(cancelInvoice(other, invoiceId, { reason: "x" }))).status, 404);
});

test("Rechnungen: Referenz je Konto (QR-IBAN, IBAN, ausserhalb der Schweiz)", () => {
  assert.ok(isQRReferenceValid(invoiceReference("CH4431999123000889012", 42)));
  const scor = invoiceReference("CH9300762011623852957", 42);
  assert.match(scor, /^RF\d{2}42$/);
  assert.ok(isSCORReferenceValid(scor));
  assert.equal(invoiceReference("DE89370400440532013000", 42), "");
});

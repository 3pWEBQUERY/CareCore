import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-context";
import { completeKompass, discardKompass, kompassDetail, saveKompassDraft, startKompass } from "@/lib/kompass";
import { KOMPASS_DOMAINS, KOMPASS_INSTRUMENT, NOT_APPLICABLE, SCALES } from "@/lib/kompass-instrument";
import { raiWorkplace } from "@/lib/rai";
import { apiContextFor, createResident, fixture, q } from "../support/db";

const failure = async (promise: Promise<unknown>) =>
  promise.then(
    () => ({ status: 200, message: "" }),
    (error) => ({
      status: error instanceof ApiError ? error.status : 500,
      message: error instanceof Error ? error.message : String(error),
    }),
  );

const zurichDay = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date(Date.now() + offset * 86_400_000));

// Alle Fragen beantworten und je Bereich über den Handlungsbedarf entscheiden (Mobilität mit Handlungsbedarf).
function fullPatch(level = 0) {
  const answers: Record<string, string> = {};
  const domains: Record<string, Record<string, unknown>> = {};
  for (const domain of KOMPASS_DOMAINS) {
    for (const item of domain.items) {
      const options = SCALES[item.scale].options;
      answers[`${domain.id}.${item.id}`] = options[Math.min(level, options.length - 1)].value;
    }
    domains[domain.id] = { need: false };
  }
  domains.mobility = { need: true, needText: "Begleitung beim Aufstehen am Morgen", resources: "Geht gerne spazieren" };
  return { answers, domains };
}

test("Kompass: beginnen, automatisch speichern, Abschluss nur vollständig, Fristen der Einrichtung, Protokoll", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const residentId = await createResident(f);
  const start = { occasion: "admission", assessedOn: zurichDay(0) };

  // Beginnen: Anlass, Datum nicht in der Zukunft, Verantwortliche nur mit Berechtigung (Pflege hat sie nicht).
  assert.match((await failure(startKompass(ctx, residentId, { ...start, occasion: "x" }))).message, /Anlass/);
  assert.match(
    (await failure(startKompass(ctx, residentId, { ...start, assessedOn: zurichDay(2) }))).message,
    /Zukunft/,
  );
  assert.match(
    (await failure(startKompass(ctx, residentId, { ...start, assessorId: f.people.max }))).message,
    /darf keine Abklärungen/,
  );
  const { id } = await startKompass(ctx, residentId, start);
  assert.equal((await failure(startKompass(ctx, residentId, start))).status, 409, "nur ein Entwurf je Person");
  let detail = await kompassDetail(ctx, residentId);
  assert.equal(detail.draft?.id, id);
  assert.equal(detail.draft?.instrument, KOMPASS_INSTRUMENT);
  assert.equal(detail.draft?.assessorId, f.people.anna, "ohne Wahl ist die Person selbst verantwortlich");
  assert.equal(detail.settings.intervalMonths, null);

  // Speichern ändert nur die geschickten Felder; ungültige Antworten werden abgewiesen.
  assert.match(
    (await failure(saveKompassDraft(ctx, residentId, { id, patch: { answers: { "mobility.transfer": "9" } } })))
      .message,
    /Aufstehen und Hinsetzen/,
  );
  assert.match(
    (
      await failure(
        saveKompassDraft(ctx, residentId, { id, patch: { answers: { "mobility.transfer": NOT_APPLICABLE } } }),
      )
    ).message,
    /ungültig/,
  );
  await saveKompassDraft(ctx, residentId, { id, patch: { answers: { "mobility.transfer": "2" } } });
  const saved = await saveKompassDraft(ctx, residentId, {
    id,
    patch: {
      answers: { "mobility.stairs": NOT_APPLICABLE },
      domains: { mobility: { wishes: "Morgens zuerst Kaffee" } },
    },
  });
  assert.ok(saved.progress > 0 && saved.progress < 100);
  detail = await kompassDetail(ctx, residentId);
  assert.equal(detail.draft?.kompass?.answers["mobility.transfer"], "2", "frühere Antwort bleibt");
  assert.equal(detail.draft?.kompass?.answers["mobility.stairs"], NOT_APPLICABLE);
  assert.equal(detail.draft?.kompass?.domains.mobility.wishes, "Morgens zuerst Kaffee");
  await saveKompassDraft(ctx, residentId, { id, patch: { answers: { "mobility.stairs": null } } });
  assert.equal((await kompassDetail(ctx, residentId)).draft?.kompass?.answers["mobility.stairs"], undefined);

  // Abschliessen erst vollständig; Handlungsbedarf „Ja“ verlangt eine Beschreibung.
  assert.match((await failure(completeKompass(ctx, residentId, { id }))).message, /Zum Abschliessen fehlt noch/);
  const patch = fullPatch();
  await saveKompassDraft(ctx, residentId, {
    id,
    patch: { ...patch, domains: { ...patch.domains, mobility: { need: true, needText: "" } } },
  });
  assert.match(
    (await failure(completeKompass(ctx, residentId, { id }))).message,
    /Bewegung & Mobilität: Handlungsbedarf festhalten/,
  );
  await saveKompassDraft(ctx, residentId, { id, patch });
  const done = await completeKompass(ctx, residentId, { id });
  assert.equal(done.dueOn, null, "ohne Frist der Einrichtung keine automatische Fälligkeit");
  assert.equal((await failure(saveKompassDraft(ctx, residentId, { id, patch }))).status, 409, "abgeschlossen");
  detail = await kompassDetail(ctx, residentId);
  assert.equal(detail.draft, null);
  assert.equal(detail.previous?.id, id);
  assert.equal(detail.previous?.completedBy, "Anna Müller");
  assert.equal(detail.previous?.kompass?.domains.mobility.needText, "Begleitung beim Aufstehen am Morgen");

  // Arbeitskorb: Handlungsbedarf je Person; Fristen nach den Einstellungen der Einrichtung.
  let row = (await raiWorkplace(ctx)).residents.find((item) => item.id === residentId)!;
  assert.equal(row.state, "current");
  assert.equal(row.needs, 1);
  assert.equal(row.dueOn, null);
  await q(
    `UPDATE carecore_organizations SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{app}',
       '{"kompassIntervalMonths": {"enabled": true, "value": 6}, "kompassAdmissionDays": {"enabled": true, "value": 14}}')
     WHERE id = $1`,
    [f.org],
  );
  const second = await startKompass(ctx, residentId, { occasion: "change", assessedOn: zurichDay(0) });
  await saveKompassDraft(ctx, residentId, { id: second.id, patch: fullPatch(1) });
  const next = await completeKompass(ctx, residentId, { id: second.id });
  const sixMonths = new Date(`${zurichDay(0)}T12:00:00Z`);
  sixMonths.setUTCMonth(sixMonths.getUTCMonth() + 6);
  assert.equal(next.dueOn, sixMonths.toISOString().slice(0, 10));
  detail = await kompassDetail(ctx, residentId);
  assert.deepEqual(
    detail.history.map((item) => item.id),
    [second.id, id],
    "die neuere zuerst, die frühere bleibt im Verlauf",
  );
  row = (await raiWorkplace(ctx)).residents.find((item) => item.id === residentId)!;
  assert.equal(row.dueOn, next.dueOn);
  assert.equal(row.reason, "Folgeabklärung (alle 6 Monate)");

  // Neue Person mit Eintrittsdatum: erste Abklärung nach der Frist der Einrichtung.
  const newcomer = await createResident(f, "Otto Neu");
  await q(`UPDATE carecore_residents SET admitted_on = $2 WHERE id = $1`, [newcomer, zurichDay(-20)]);
  const fresh = (await raiWorkplace(ctx)).residents.find((item) => item.id === newcomer)!;
  assert.equal(fresh.dueOn, zurichDay(-6));
  assert.equal(fresh.state, "overdue");
  assert.equal(fresh.reason, "Erste Abklärung nach Eintritt");

  // Verwerfen nur mit Grund; der Entwurf verschwindet aus Verlauf und Arbeitskorb.
  const third = await startKompass(ctx, newcomer, { occasion: "admission", assessedOn: zurichDay(0) });
  assert.match((await failure(discardKompass(ctx, newcomer, { id: third.id, reason: " " }))).message, /Grund/);
  await discardKompass(ctx, newcomer, { id: third.id, reason: "versehentlich begonnen" });
  assert.equal((await kompassDetail(ctx, newcomer)).draft, null);
  assert.equal((await kompassDetail(ctx, newcomer)).history.length, 0);

  const log = await q<{ action: string }>(
    `SELECT action FROM carecore_audit_log WHERE entity_type = 'rai_assessment' AND after_data ->> 'residentId' = ANY($1)
     ORDER BY created_at, action`,
    [[residentId, newcomer]],
  );
  assert.deepEqual(
    log.map((item) => item.action),
    ["started", "completed", "started", "completed", "started", "discarded"],
  );

  // Andere Einrichtung: kein Zugriff.
  const other = await apiContextFor(await fixture(), "anna");
  assert.equal((await failure(kompassDetail(other, residentId))).status, 404);
  assert.equal((await failure(startKompass(other, residentId, start))).status, 404);
  assert.equal((await failure(saveKompassDraft(other, residentId, { id: randomUUID(), patch }))).status, 404);
});

test("Kompass: Hinweise aus der Akte je Bereich (nur Fakten, ohne Bewertung)", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const residentId = await createResident(f);
  await q(
    `INSERT INTO carecore_resident_belongings (id, organization_id, resident_id, kind, name, marking)
     VALUES ($1, $2, $3, 'aid', 'Rollator', 'blau')`,
    [randomUUID(), f.org, residentId],
  );
  await q(
    `INSERT INTO carecore_resident_diagnoses (id, organization_id, resident_id, label, kind) VALUES ($1, $2, $3, 'Diabetes mellitus Typ 2', 'main')`,
    [randomUUID(), f.org, residentId],
  );
  await q(
    `INSERT INTO carecore_quality_events (id, organization_id, resident_id, type, occurred_at, description)
     VALUES ($1, $2, $3, 'Sturz', NOW() - INTERVAL '3 days', 'Im Badezimmer ausgerutscht')`,
    [randomUUID(), f.org, residentId],
  );
  const { context } = await kompassDetail(ctx, residentId);
  assert.deepEqual(context.aids, [{ label: "Rollator", detail: "blau", href: "/c/bewohner" }]);
  assert.deepEqual(
    context.diagnoses.map((fact) => [fact.label, fact.detail]),
    [["Diabetes mellitus Typ 2", "Hauptdiagnose"]],
  );
  assert.equal(context.falls.length, 1);
  assert.match(context.falls[0].label, /^Sturz am \d{2}\.\d{2}\.\d{4}$/);
  assert.equal(context.falls[0].detail, "Im Badezimmer ausgerutscht");
  assert.deepEqual(context.wounds, []);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { saveQualification } from "@/lib/roster/settings-service";
import { fixture, q, qualify, type Fixture } from "../support/db";

// Wirksame Berechtigungen, wie sie Anmeldung, Navigation und Zweitunterschrift verwenden.
const canMedicate = async (f: Fixture, person: string) => {
  const [row] = await q<{ permissions: string[] | null }>(`SELECT carecore_effective_permissions($1) AS permissions`, [
    f.people[person],
  ]);
  return (row.permissions ?? []).includes("medication.manage");
};

const isoDay = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

test("Medikation: Leitung immer, Pflege nur mit gültiger HF- oder FaGe-Qualifikation", async () => {
  const f = await fixture();
  assert.equal(await canMedicate(f, "leadA"), true, "Leitung darf Medikation");
  assert.equal(await canMedicate(f, "anna"), false, "Pflege ohne Qualifikation nicht");

  await qualify(f, "anna", "FAGE");
  assert.equal(await canMedicate(f, "anna"), true, "Fachperson Gesundheit");
  await qualify(f, "max", "HF");
  assert.equal(await canMedicate(f, "max"), true, "Pflegefachperson HF");
  await qualify(f, "lea", "SRK");
  assert.equal(await canMedicate(f, "lea"), false, "Pflegehelfer:in SRK nicht");

  // Abgelaufene oder noch nicht gültige Qualifikationen zählen nicht.
  await qualify(f, "ben", "HF", "2000-01-01", isoDay(-2));
  assert.equal(await canMedicate(f, "ben"), false, "abgelaufen");
  await qualify(f, "sam", "FAGE", isoDay(3));
  assert.equal(await canMedicate(f, "sam"), false, "erst ab übermorgen gültig");

  // Qualifikationen einer anderen Organisation zählen nicht.
  const other = await fixture();
  await q(
    `INSERT INTO carecore_employee_qualifications (user_id, qualification_id, valid_from)
     SELECT $1, id, '2000-01-01' FROM carecore_qualifications WHERE organization_id = $2 AND code = 'HF'`,
    [f.people.lea, other.org],
  );
  assert.equal(await canMedicate(f, "lea"), false, "fremde Organisation");
});

test("Medikationsrecht einer Qualifikation wird in den Einstellungen gesetzt und protokolliert", async () => {
  const f = await fixture();
  const lead = await f.ctx("leadA");
  await saveQualification(lead, { code: "fh", name: "Pflegefachperson FH", grantsMedication: true });
  await qualify(f, "anna", "FH");
  assert.equal(await canMedicate(f, "anna"), true);

  // Ohne Häkchen gespeichert: Recht entfällt; vorher/nachher steht im Protokoll.
  await saveQualification(lead, { code: "FH", name: "Pflegefachperson FH" });
  assert.equal(await canMedicate(f, "anna"), false);
  const audit = await q<{ before_data: { grantsMedication: boolean }; after_data: { grantsMedication: boolean } }>(
    `SELECT before_data, after_data FROM carecore_roster_audit
     WHERE organization_id = $1 AND entity_type = 'qualification' ORDER BY created_at DESC LIMIT 1`,
    [f.org],
  );
  assert.deepEqual([audit[0].before_data.grantsMedication, audit[0].after_data.grantsMedication], [true, false]);
  await assert.rejects(saveQualification(lead, { code: "FH", name: "FH", grantsMedication: "ja" }), /ungültig/);
  await assert.rejects(saveQualification(await f.ctx("anna"), { code: "X", name: "X", grantsMedication: true }));
});

test("Rollen ohne Qualifikationspflicht behalten die Medikation unverändert", async () => {
  const f = await fixture();
  const key = `test-${randomUUID().slice(0, 8)}`;
  await q(
    `INSERT INTO carecore_roles (id, key, name, permissions) VALUES ($1, $2, 'Test', '["medication.manage"]'::jsonb)`,
    [randomUUID(), key],
  );
  await q(`UPDATE carecore_users SET role = $2 WHERE id = $1`, [f.people.anna, key]);
  assert.equal(await canMedicate(f, "anna"), true);
  await q(`UPDATE carecore_roles SET medication_requires_qualification = TRUE WHERE key = $1`, [key]);
  assert.equal(await canMedicate(f, "anna"), false);
  const [arzt] = await q<{ permissions: string[] }>(`SELECT permissions FROM carecore_roles WHERE key = 'arzt'`);
  assert.ok(arzt.permissions.includes("medication.manage"), "Ärztlicher Dienst unverändert");
});

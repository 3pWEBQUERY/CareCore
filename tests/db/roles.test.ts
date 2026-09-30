import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createManagedRole,
  deleteManagedRole,
  listManagedRoles,
  updateManagedRole,
  updateManagedUser,
} from "@/lib/admin-users";
import { fixture, q } from "../support/db";

const rejected = (promise: Promise<unknown>) =>
  promise.then(
    () => "ok",
    (error: Error) => error.message,
  );

test("Rollen: eigene Rollen gehören der Einrichtung – andere sehen, vergeben, ändern und löschen sie nicht", async () => {
  const mine = await fixture();
  const other = await fixture();
  const key = `praktikum-${randomUUID().slice(0, 8)}`;
  const roles = await createManagedRole(mine.people.leadA, {
    key,
    name: "Praktikum",
    permissions: ["residents.read"],
  });
  const created = roles.find((role) => role.key === key);
  assert.ok(created, "in der eigenen Einrichtung sichtbar");
  const stored = await q<{ organization_id: string }>(`SELECT organization_id FROM carecore_roles WHERE id = $1`, [
    created.id,
  ]);
  assert.equal(stored[0].organization_id, mine.org);

  const foreignList = await listManagedRoles(other.people.leadA);
  assert.equal(
    foreignList.some((role) => role.key === key),
    false,
    "andere Einrichtung sieht die Rolle nicht",
  );
  assert.ok(
    foreignList.some((role) => role.systemRole),
    "Systemrollen sehen alle",
  );

  // Vergeben: nur in der eigenen Einrichtung.
  const profile = { displayName: "Anna Test", username: `anna-${randomUUID().slice(0, 8)}`, role: key };
  assert.equal(await rejected(updateManagedUser(other.people.leadA, other.people.anna, profile)), "ROLE_NOT_FOUND");
  await updateManagedUser(mine.people.leadA, mine.people.anna, profile);
  const assigned = await q<{ role: string }>(`SELECT role FROM carecore_users WHERE id = $1`, [mine.people.anna]);
  assert.equal(assigned[0].role, key);
  assert.equal(
    (await listManagedRoles(mine.people.leadA)).find((role) => role.key === key)?.userCount,
    1,
    "Anzahl der Personen nur aus der eigenen Einrichtung",
  );

  // Ändern und Löschen durch eine andere Einrichtung schlagen fehl, ohne die Rolle anzutasten.
  assert.equal(
    await rejected(updateManagedRole(other.people.leadA, created.id, { name: "Übernommen", permissions: [] })),
    "ROLE_NOT_FOUND",
  );
  assert.equal(await rejected(deleteManagedRole(other.people.leadA, created.id)), "ROLE_NOT_FOUND");
  const unchanged = await q<{ name: string; permissions: string[] }>(
    `SELECT name, permissions FROM carecore_roles WHERE id = $1`,
    [created.id],
  );
  assert.deepEqual(unchanged[0], { name: "Praktikum", permissions: ["residents.read"] });
  const foreignAudit = await q(
    `SELECT 1 FROM carecore_audit_log WHERE entity_type = 'role' AND entity_id = $1 AND organization_id = $2`,
    [created.id, other.org],
  );
  assert.equal(foreignAudit.length, 0, "kein Protokolleintrag für die fremde Einrichtung");

  // Die eigene Einrichtung ändert und löscht (nach dem Entzug) wie bisher.
  await updateManagedRole(mine.people.leadA, created.id, { name: "Praktikum Pflege", permissions: ["residents.read"] });
  assert.equal(await rejected(deleteManagedRole(mine.people.leadA, created.id)), "ROLE_IN_USE");
  await updateManagedUser(mine.people.leadA, mine.people.anna, { ...profile, role: "pflege" });
  await deleteManagedRole(mine.people.leadA, created.id);
  assert.equal(
    (await listManagedRoles(mine.people.leadA)).some((role) => role.key === key),
    false,
  );
});

test("Leitung: verabreicht Medikamente immer – weder entziehbar noch an eine Qualifikation gebunden", async () => {
  const f = await fixture();
  const [leitung] = await q<{ id: string; permissions: string[]; medication_requires_qualification: boolean }>(
    `SELECT id, permissions, medication_requires_qualification FROM carecore_roles WHERE key = 'leitung'`,
  );
  const effective = async () =>
    (await q<{ p: string[] }>(`SELECT carecore_effective_permissions($1) AS p`, [f.people.leadA]))[0].p;
  try {
    await updateManagedRole(f.people.leadA, leitung.id, {
      name: "Leitung",
      permissions: leitung.permissions.filter((permission) => permission !== "medication.administer"),
      medicationRequiresQualification: true,
    });
    const [after] = await q<{ permissions: string[]; medication_requires_qualification: boolean }>(
      `SELECT permissions, medication_requires_qualification FROM carecore_roles WHERE id = $1`,
      [leitung.id],
    );
    assert.ok(after.permissions.includes("medication.administer"), "Recht bleibt");
    assert.equal(after.medication_requires_qualification, false, "keine Qualifikation verlangt");
    assert.ok((await effective()).includes("medication.administer"), "Leitung ohne Qualifikation darf verabreichen");
  } finally {
    await q(`UPDATE carecore_roles SET permissions = $2::jsonb, medication_requires_qualification = $3 WHERE id = $1`, [
      leitung.id,
      JSON.stringify(leitung.permissions),
      leitung.medication_requires_qualification,
    ]);
  }
});

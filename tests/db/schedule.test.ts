import { test } from "node:test";
import assert from "node:assert/strict";
import { RosterError } from "@/lib/roster/errors";
import { periodAction } from "@/lib/roster/period-service";
import { getSchedule } from "@/lib/roster/schedule";
import { changeShift, createShift } from "@/lib/roster/shift-service";
import { fixture, q } from "../support/db";

const code = (error: unknown) => (error instanceof RosterError ? error.code : String(error));
const expectCode = async (promise: Promise<unknown>, expected: string) =>
  assert.equal(await promise.then(() => "OK", code), expected);

test("Leitung plant eigene Mitarbeitende; fremde Wohngruppe und fremde Personen werden abgelehnt", async () => {
  const f = await fixture();
  const lead = await f.ctx("leadA");
  const early = await f.type("F");
  const created = await createShift(lead, {
    unitId: f.units.a,
    employeeId: f.people.anna,
    shiftTypeId: early,
    date: "2026-11-10",
  });
  assert.equal(created.shiftIds.length, 1);
  const [row] = await q<{ employee_id: string; source: string; version: number }>(
    `SELECT employee_id, source, version FROM carecore_roster_shifts WHERE id = $1`,
    [created.shiftIds[0]],
  );
  assert.deepEqual(row, { employee_id: f.people.anna, source: "MANUAL", version: 1 });
  const [audit] = await q<{ n: number }>(`SELECT COUNT(*)::int AS n FROM carecore_roster_audit WHERE entity_id = $1`, [
    created.shiftIds[0],
  ]);
  assert.equal(audit.n, 1);

  // Person aus Wohngruppe B in Wohngruppe A einplanen.
  await expectCode(
    createShift(lead, { unitId: f.units.a, employeeId: f.people.ben, shiftTypeId: early, date: "2026-11-10" }),
    "RULE_VIOLATION",
  );
  // Wohngruppe B existiert für Leitung A nicht.
  await expectCode(
    createShift(lead, { unitId: f.units.b, employeeId: f.people.ben, shiftTypeId: early, date: "2026-11-10" }),
    "NOT_FOUND",
  );
});

test("Mitarbeitende können keine Dienste anlegen oder fremde Dienste ändern", async () => {
  const f = await fixture();
  const lead = await f.ctx("leadA");
  const anna = await f.ctx("anna");
  const early = await f.type("F");
  const { shiftIds } = await createShift(lead, {
    unitId: f.units.a,
    employeeId: f.people.max,
    shiftTypeId: early,
    date: "2026-11-11",
  });
  await expectCode(
    createShift(anna, { unitId: f.units.a, employeeId: f.people.anna, shiftTypeId: early, date: "2026-11-12" }),
    "FORBIDDEN",
  );
  await expectCode(
    changeShift(anna, shiftIds[0], {
      action: "move",
      expectedVersion: 1,
      employeeId: f.people.anna,
      date: "2026-11-11",
    }),
    "FORBIDDEN",
  );
  const [row] = await q<{ employee_id: string }>(`SELECT employee_id FROM carecore_roster_shifts WHERE id = $1`, [
    shiftIds[0],
  ]);
  assert.equal(row.employee_id, f.people.max);
});

test("Ruhezeit blockiert, veraltete Version wird erkannt", async () => {
  const f = await fixture();
  const lead = await f.ctx("leadA");
  await createShift(lead, {
    unitId: f.units.a,
    employeeId: f.people.anna,
    shiftTypeId: await f.type("S"),
    date: "2026-11-12",
  });
  const blocked = await createShift(lead, {
    unitId: f.units.a,
    employeeId: f.people.anna,
    shiftTypeId: await f.type("F"),
    date: "2026-11-13",
  }).catch((error: RosterError) => error);
  assert.ok(blocked instanceof RosterError);
  assert.equal(blocked.code, "RULE_VIOLATION");
  assert.match(blocked.message, /liegen nur 9:00 h statt 11:00 h/);

  const { shiftIds } = await createShift(lead, {
    unitId: f.units.a,
    employeeId: f.people.max,
    shiftTypeId: await f.type("F"),
    date: "2026-11-14",
  });
  await changeShift(lead, shiftIds[0], {
    action: "move",
    expectedVersion: 1,
    employeeId: f.people.max,
    date: "2026-11-15",
  });
  await expectCode(
    changeShift(lead, shiftIds[0], {
      action: "move",
      expectedVersion: 1,
      employeeId: f.people.max,
      date: "2026-11-16",
    }),
    "STALE_VERSION",
  );
});

test("Warnungen brauchen Bestätigung mit Begründung", async () => {
  const f = await fixture();
  const lead = await f.ctx("leadA");
  const late = await f.type("S");
  await q(
    `INSERT INTO carecore_staffing_requirements (care_unit_id, shift_type_id, date, min_count) VALUES ($1, $2, '2026-11-18', 2)`,
    [f.units.a, late],
  );
  const a = await createShift(lead, {
    unitId: f.units.a,
    employeeId: f.people.anna,
    shiftTypeId: late,
    date: "2026-11-18",
  });
  await createShift(lead, { unitId: f.units.a, employeeId: f.people.max, shiftTypeId: late, date: "2026-11-18" });
  const pending = await changeShift(lead, a.shiftIds[0], { action: "delete", expectedVersion: 1 }).catch(
    (e: RosterError) => e,
  );
  assert.ok(pending instanceof RosterError);
  assert.equal(pending.code, "CONFIRMATION_REQUIRED");
  assert.ok(pending.violations?.some((v) => v.code === "MIN_STAFFING"));
  await expectCode(
    changeShift(lead, a.shiftIds[0], { action: "delete", expectedVersion: 1, acknowledgedWarnings: ["MIN_STAFFING"] }),
    "INVALID",
  );
  await changeShift(lead, a.shiftIds[0], {
    action: "delete",
    expectedVersion: 1,
    acknowledgedWarnings: ["MIN_STAFFING"],
    overrideReason: "Anna ist auf Fortbildung",
  });
  const [audit] = await q<{ reason: string }>(
    `SELECT reason FROM carecore_roster_audit WHERE entity_id = $1 AND action = 'deleted'`,
    [a.shiftIds[0]],
  );
  assert.match(audit.reason, /Fortbildung.*MIN_STAFFING/);
});

test("Entwürfe sind für Mitarbeitende unsichtbar; Veröffentlichen benachrichtigt und maskiert Abwesenheiten", async () => {
  const f = await fixture();
  const lead = await f.ctx("leadA");
  await createShift(lead, {
    unitId: f.units.a,
    employeeId: f.people.anna,
    shiftTypeId: await f.type("F"),
    date: "2026-12-01",
  });
  await createShift(lead, {
    unitId: f.units.a,
    employeeId: f.people.max,
    shiftTypeId: await f.type("K"),
    date: "2026-12-01",
  });
  const anna = await f.ctx("anna");
  const draft = await getSchedule(anna, { unitId: f.units.a, year: 2026, month: 12 });
  assert.equal(draft.shifts.length, 0);

  const plan = await getSchedule(lead, { unitId: f.units.a, year: 2026, month: 12 });
  assert.equal(plan.period?.status, "DRAFT");
  await periodAction(lead, plan.period!.id, { action: "publish", expectedVersion: plan.period!.version });
  const [notes] = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM carecore_notifications WHERE type = 'shift_schedule_published' AND user_id = ANY($1::uuid[])`,
    [[f.people.anna, f.people.max]],
  );
  assert.equal(notes.n, 2);

  const published = await getSchedule(anna, { unitId: f.units.a, year: 2026, month: 12 });
  const maxAbsence = published.shifts.find((s) => s.employeeId === f.people.max);
  assert.equal(maxAbsence?.name, "Abwesend");
  assert.equal(maxAbsence?.absenceKind, null);
  assert.equal(published.shifts.find((s) => s.employeeId === f.people.anna)?.name, "Frühdienst");

  // Änderung am veröffentlichten Plan benachrichtigt die betroffene Person.
  const annaShift = published.shifts.find((s) => s.employeeId === f.people.anna)!;
  await changeShift(lead, annaShift.id, {
    action: "update",
    expectedVersion: annaShift.version,
    shiftTypeId: await f.type("S"),
  });
  const [changed] = await q<{ body: string }>(
    `SELECT body FROM carecore_notifications WHERE user_id = $1 AND type = 'shift_shift_changed' ORDER BY created_at DESC LIMIT 1`,
    [f.people.anna],
  );
  assert.match(changed.body, /Frühdienst .* → .*Spätdienst/);
});

test("Leitung B sieht Wohngruppe A nicht", async () => {
  const f = await fixture();
  await expectCode(getSchedule(await f.ctx("leadB"), { unitId: f.units.a, year: 2026, month: 12 }), "NOT_FOUND");
});

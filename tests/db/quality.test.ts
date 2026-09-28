import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, type ApiContext } from "@/lib/api-context";
import { actionsData, createAction, reportEvent, updateAction, updateEvent } from "@/lib/quality";
import { apiContextFor, createResident, fixture, q } from "../support/db";

const failure = async (promise: Promise<unknown>) =>
  promise.then(
    () => ({ status: 200, message: "" }),
    (error) => ({
      status: error instanceof ApiError ? error.status : 500,
      message: error instanceof Error ? error.message : String(error),
    }),
  );

const manager = (ctx: ApiContext): ApiContext => ({
  ...ctx,
  actor: { ...ctx.actor, permissions: [...ctx.actor.permissions, "quality.manage"] },
});

test("Qualitätsmassnahme bearbeiten speichert die Änderungen (nicht nur den Status)", async () => {
  const f = await fixture();
  const lead = manager(await apiContextFor(f, "leadA"));
  const actionId = await createAction(lead, { title: "Doppelkontrolle", dueOn: "2030-01-15", ownerId: f.people.anna });
  await updateAction(lead, actionId, {
    title: "Doppelkontrolle Hochrisiko",
    description: "Insulin und Opioide",
    dueOn: "2030-02-01",
    ownerId: f.people.max,
    status: "planned",
  });
  const [row] = await q<{ title: string; description: string; owner_user_id: string; due: string; status: string }>(
    `SELECT title, description, owner_user_id, to_char(due_on, 'YYYY-MM-DD') AS due, status FROM carecore_quality_actions WHERE id = $1`,
    [actionId],
  );
  assert.deepEqual(row, {
    title: "Doppelkontrolle Hochrisiko",
    description: "Insulin und Opioide",
    owner_user_id: f.people.max,
    due: "2030-02-01",
    status: "planned",
  });
  // Neue verantwortliche Person wird benachrichtigt.
  const [notified] = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM carecore_notifications WHERE user_id = $1 AND type = 'quality_action'`,
    [f.people.max],
  );
  assert.equal(notified.n, 1);

  assert.match((await failure(updateAction(lead, actionId, { status: "done", note: "ok" }))).message, /Wirksamkeit/);
  await updateAction(lead, actionId, { status: "done", effectiveness: "effective", note: "Keine Fehler mehr" });
  assert.equal((await failure(updateAction(lead, actionId, { status: "open" }))).status, 409);
  assert.equal((await failure(updateAction(lead, actionId, { title: "x", dueOn: "2030-01-01" }))).status, 409);
  assert.equal((await actionsData(lead)).stats.doneThisYear >= 0, true);
});

test("Qualitätsereignis: Meldung benachrichtigt die Verantwortlichen, Abschluss mit Ergebnis, fremde Organisation 404", async () => {
  const f = await fixture();
  const reporter = await apiContextFor(f, "anna");
  const lead = manager(await apiContextFor(f, "leadA"));
  const residentId = await createResident(f);
  // Die Leitung hat quality.manage (Grunddaten) und wird benachrichtigt.
  const eventId = await reportEvent(reporter, {
    type: "Sturz",
    severity: "critical",
    description: "Im Zimmer gestürzt",
    occurredAt: new Date().toISOString(),
    residentId,
  });
  const notified = await q<{ user_id: string; priority: string }>(
    `SELECT user_id, priority FROM carecore_notifications WHERE type = 'quality_event' AND user_id = ANY($1::uuid[])`,
    [[f.people.leadA, f.people.leadB]],
  );
  assert.equal(notified.length, 2);
  assert.ok(notified.every((row) => row.priority === "high"));
  assert.equal((await failure(updateEvent(reporter, eventId, { status: "investigating" }))).status, 403);
  assert.match((await failure(updateEvent(lead, eventId, { status: "resolved" }))).message, /Ergebnis/);
  await updateEvent(lead, eventId, { status: "closed", resolution: "Sensormatte eingesetzt" });
  assert.equal((await failure(updateEvent(lead, eventId, { severity: "info" }))).status, 409);
  const other = manager(await apiContextFor(await fixture(), "leadA"));
  assert.equal((await failure(updateEvent(other, eventId, { status: "open" }))).status, 404);
  assert.match(
    (
      await failure(
        reportEvent(reporter, {
          type: "Sturz",
          severity: "info",
          description: "x",
          occurredAt: "2999-01-01T00:00:00Z",
        }),
      )
    ).message,
    /Zukunft/,
  );
});

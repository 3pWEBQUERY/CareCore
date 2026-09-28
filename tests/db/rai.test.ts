import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "@/lib/api-context";
import { raiResidentDetail, saveRaiAssessment } from "@/lib/rai";
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

test("RAI-Erfassung: Entwurf, Abschluss nur vollständig, kein Datum in der Zukunft, in der Akte protokolliert", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const residentId = await createResident(f);
  const base = { instrument: "interRAI LTCF", assessedOn: zurichDay(0) };
  assert.match((await failure(saveRaiAssessment(ctx, residentId, { ...base, instrument: "X" }))).message, /Instrument/);
  assert.match(
    (await failure(saveRaiAssessment(ctx, residentId, { ...base, assessedOn: zurichDay(2) }))).message,
    /Zukunft/,
  );
  assert.match(
    (await failure(saveRaiAssessment(ctx, residentId, { ...base, scores: { Alltag: 7 } }))).message,
    /ungültig/,
  );
  // Verantwortlich nur Personen mit RAI-Berechtigung (Pflege hat sie nicht).
  assert.match(
    (await failure(saveRaiAssessment(ctx, residentId, { ...base, assessorId: f.people.max }))).message,
    /RAI-Berechtigung/,
  );
  const draft = await saveRaiAssessment(ctx, residentId, { ...base, scores: { Alltag: 2 } });
  assert.equal(draft.status, "in_progress");
  assert.match(
    (await failure(saveRaiAssessment(ctx, residentId, { ...base, scores: { Alltag: 2 }, complete: true }))).message,
    /alle Bereiche/,
  );
  const done = await saveRaiAssessment(ctx, residentId, {
    ...base,
    scores: { Alltag: 2, Kognition: 1, Stimmung: 0, Gesundheit: 3 },
    notes: "Stabil",
    complete: true,
  });
  assert.equal(done.id, draft.id, "der Entwurf wird abgeschlossen");
  assert.equal(done.status, "current");
  assert.ok(done.dueOn && done.dueOn > zurichDay(0));
  assert.equal((await raiResidentDetail(ctx, residentId)).history.length, 1);

  const log = await q<{ action: string }>(
    `SELECT action FROM carecore_audit_log WHERE entity_type = 'rai_assessment' AND after_data ->> 'residentId' = $1 ORDER BY created_at`,
    [residentId],
  );
  assert.deepEqual(
    log.map((row) => row.action),
    ["created", "completed"],
  );
  const other = await apiContextFor(await fixture(), "anna");
  assert.equal((await failure(raiResidentDetail(other, residentId))).status, 404);
  assert.equal((await failure(saveRaiAssessment(other, residentId, base))).status, 404);
});

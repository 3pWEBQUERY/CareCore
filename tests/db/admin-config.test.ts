import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "@/lib/api-context";
import { readHiddenVitals, saveHiddenVitals } from "@/lib/settings";
import { recordMeasurements, vitalsOverview } from "@/lib/vitals";
import { apiContextFor, createResident, fixture } from "../support/db";

const status = async (promise: Promise<unknown>) =>
  promise.then(
    () => 200,
    (error) => (error instanceof ApiError ? error.status : 500),
  );

test("Vitalparameter: Einrichtung blendet Blutzucker aus – keine neue Messung, Übersicht ohne alten Wert", async () => {
  const f = await fixture();
  const lead = await apiContextFor(f, "leadA");
  const anna = await apiContextFor(f, "anna");
  const residentId = await createResident(f);
  await recordMeasurements(anna, { residentId, values: { Blutzucker: { value: 25 } } });
  const before = (await vitalsOverview(anna)).residents.find((resident) => resident.id === residentId)!;
  assert.equal(before.latest.Blutzucker?.status, "critical");

  assert.equal(await status(saveHiddenVitals(lead, { hidden: ["Unbekannt"] })), 400);
  assert.equal(
    await status(
      saveHiddenVitals(lead, {
        hidden: ["Blutdruck", "Puls", "Temperatur", "Sauerstoffsättigung", "Blutzucker", "Gewicht"],
      }),
    ),
    400,
    "mindestens ein Vitalparameter bleibt",
  );
  assert.deepEqual(await saveHiddenVitals(lead, { hidden: ["Blutzucker"] }), ["Blutzucker"]);
  assert.deepEqual(await readHiddenVitals(lead), ["Blutzucker"]);

  assert.equal(await status(recordMeasurements(anna, { residentId, values: { Blutzucker: { value: 6 } } })), 400);
  await recordMeasurements(anna, { residentId, values: { Puls: { value: 72 } } });
  const after = (await vitalsOverview(anna)).residents.find((resident) => resident.id === residentId)!;
  assert.equal(after.latest.Blutzucker, undefined);
  assert.equal(after.status, "normal", "ausgeblendeter kritischer Wert zählt nicht");
});

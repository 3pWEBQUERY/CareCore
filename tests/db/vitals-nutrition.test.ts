import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "@/lib/api-context";
import { addFluid, addMeal, hideEntry, residentNutrition, savePlan } from "@/lib/nutrition";
import { listThresholds, recordMeasurements, removeThreshold, residentVitals, saveThreshold } from "@/lib/vitals";
import { apiContextFor, createResident, fixture, q } from "../support/db";

const failure = async (promise: Promise<unknown>) =>
  promise.then(
    () => ({ status: 200, message: "" }),
    (error) => ({
      status: error instanceof ApiError ? error.status : 500,
      message: error instanceof Error ? error.message : String(error),
    }),
  );

const residentLog = (residentId: string) =>
  q<{ entity_type: string; action: string }>(
    `SELECT entity_type, action FROM carecore_audit_log
     WHERE entity_id = $1 OR COALESCE(after_data ->> 'residentId', before_data ->> 'residentId') = $1::text
     ORDER BY created_at`,
    [residentId],
  ).then((rows) => rows.map((row) => `${row.entity_type}:${row.action}`));

test("Vitalwerte: Plausibilität, persönlicher Zielbereich und Protokoll in der Akte", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const residentId = await createResident(f);
  assert.match(
    (await failure(recordMeasurements(ctx, { residentId, values: { Puls: { value: 400 } } }))).message,
    /nicht plausibel/,
  );
  assert.match(
    (await failure(recordMeasurements(ctx, { residentId, values: { Blutdruck: { value: 120, secondary: 130 } } })))
      .message,
    /diastolische/,
  );
  assert.match(
    (
      await failure(
        recordMeasurements(ctx, {
          residentId,
          measuredAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
          values: { Puls: { value: 70 } },
        }),
      )
    ).message,
    /7 Tage/,
  );
  // Ohne persönlichen Zielbereich gilt der Standard (Blutdruck 100–140, Alarm ab 180).
  assert.deepEqual(
    await recordMeasurements(ctx, { residentId, values: { Blutdruck: { value: 150, secondary: 90 } } }),
    [{ metric: "Blutdruck", status: "attention" }],
  );
  assert.match(
    (await failure(saveThreshold(ctx, { residentId, metric: "Blutdruck", targetLower: 100, targetUpper: 160 })))
      .message,
    /Begründung/,
  );
  assert.match(
    (
      await failure(
        saveThreshold(ctx, {
          residentId,
          metric: "Blutdruck",
          targetLower: 100,
          targetUpper: 160,
          criticalUpper: 150,
          reason: "ärztlich",
        }),
      )
    ).message,
    /ausserhalb/,
  );
  const thresholdId = await saveThreshold(ctx, {
    residentId,
    metric: "Blutdruck",
    targetLower: 100,
    targetUpper: 160,
    criticalUpper: 190,
    reason: "Anordnung Dr. Muster",
  });
  assert.deepEqual(
    await recordMeasurements(ctx, { residentId, values: { Blutdruck: { value: 150, secondary: 90 } } }),
    [{ metric: "Blutdruck", status: "normal" }],
    "persönlicher Zielbereich gilt",
  );
  assert.equal((await residentVitals(ctx, residentId, "Blutdruck", 7)).measurements.length, 2);
  assert.equal((await listThresholds(ctx)).personal.length, 1);

  // Andere Organisationen sehen und entfernen den Zielbereich nicht.
  const other = await apiContextFor(await fixture(), "anna");
  assert.equal((await listThresholds(other)).personal.length, 0);
  assert.equal((await failure(removeThreshold(other, thresholdId, () => true, "x"))).status, 404);
  assert.equal((await failure(removeThreshold(ctx, thresholdId, () => false, "x"))).status, 403);
  assert.deepEqual(await removeThreshold(ctx, thresholdId, () => true, "Anordnung beendet"), { residentId });
  assert.equal((await failure(removeThreshold(ctx, thresholdId, () => true, "doppelt"))).status, 404);

  assert.deepEqual(await residentLog(residentId), [
    "vital_measurements:recorded",
    "vital_threshold:saved",
    "vital_measurements:recorded",
    "vital_threshold:removed",
  ]);
});

test("Ernährung: Plan, Trink- und Essprotokoll, Korrektur mit Grund – alles in der Akte", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const residentId = await createResident(f);
  assert.match(
    (
      await failure(
        savePlan(ctx, residentId, { diet: "Normalkost", texture: "Normal", fluidTargetMl: 2000, fluidLimitMl: 1500 }),
      )
    ).message,
    /Trinkmengenbegrenzung/,
  );
  await savePlan(ctx, residentId, { diet: "Normalkost", texture: "Normal", fluidTargetMl: 1500 });
  await savePlan(ctx, residentId, { diet: "Normalkost", texture: "Weich", fluidTargetMl: 1500 });
  const [plans] = await q<{ n: number }>(
    `SELECT COUNT(*) FILTER (WHERE active)::int AS n FROM carecore_nutrition_plans WHERE resident_id = $1`,
    [residentId],
  );
  assert.equal(plans.n, 1, "nur ein aktiver Plan");

  assert.match((await failure(addFluid(ctx, { residentId, amountMl: 5 }))).message, /Trinkmenge/);
  const fluid = await addFluid(ctx, { residentId, amountMl: 200, beverage: "Wasser" });
  await addFluid(ctx, { residentId, amountMl: 150 });
  assert.match((await failure(addMeal(ctx, { residentId, meal: "Frühstück", portionPercent: 25 }))).message, /Grund/);
  await addMeal(ctx, { residentId, meal: "Frühstück", portionPercent: 25, note: "Appetitlosigkeit" });

  assert.match((await failure(hideEntry(ctx, "fluid", fluid, ""))).message, /Grund/);
  const other = await apiContextFor(await fixture(), "anna");
  assert.equal((await failure(hideEntry(other, "fluid", fluid, "falsch"))).status, 404);
  await hideEntry(ctx, "fluid", fluid, "falscher Bewohner");
  assert.equal((await failure(hideEntry(ctx, "fluid", fluid, "doppelt"))).status, 404);

  const today = await residentNutrition(ctx, residentId, null);
  assert.equal(
    today.fluids.reduce((sum, entry) => sum + entry.amountMl, 0),
    150,
    "ausgeblendete Einträge zählen nicht",
  );
  assert.equal(today.meals.length, 1);
  assert.deepEqual(await residentLog(residentId), [
    "nutrition_plan:created",
    "nutrition_plan:replaced",
    "fluid_entry:created",
    "fluid_entry:created",
    "meal_entry:created",
    "fluid_entry:hidden",
  ]);
});

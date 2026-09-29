import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "@/lib/api-context";
import { readSettings, readTerminology, saveTerminology } from "@/lib/settings";
import { apiContextFor, fixture, q } from "../support/db";

const status = async (promise: Promise<unknown>) =>
  promise.then(
    () => 200,
    (error) => (error instanceof ApiError ? error.status : 500),
  );

test("Terminologie: Einrichtung wählt Patient, ungültige Werte abgelehnt, Protokoll, andere Einstellungen bleiben", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "leadA");
  const before = await readSettings(ctx);
  assert.equal(await readTerminology(ctx), "resident");
  assert.equal(await saveTerminology(ctx, { value: "patient" }), "patient");
  assert.equal(await readTerminology(ctx), "patient");
  assert.deepEqual(await readSettings(ctx), before, "Einstellungen der Konfiguration bleiben unverändert");
  assert.equal(await status(saveTerminology(ctx, { value: "kunde" })), 400);
  assert.equal(await status(saveTerminology(ctx, {})), 400);
  assert.equal(await readTerminology(ctx), "patient");
  const [audit] = await q<{ before_data: unknown; after_data: unknown }>(
    `SELECT before_data, after_data FROM carecore_audit_log WHERE organization_id = $1 AND entity_type = 'setting' AND action = 'terminology'`,
    [f.org],
  );
  assert.deepEqual(audit, { before_data: { value: "resident" }, after_data: { value: "patient" } });
});

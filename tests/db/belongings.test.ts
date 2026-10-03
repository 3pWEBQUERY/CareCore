import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, type ApiContext } from "@/lib/api-context";
import { belongingList, createBelonging, removeBelonging, updateBelonging } from "@/lib/belongings";
import { transferSheet } from "@/lib/resident-transfer";
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

test("Hilfsmittel und Gegenstände: erfassen, ändern mit Konfliktschutz, nicht mehr vorhanden, Überleitungsbogen", async () => {
  const f = await fixture();
  const nurse = await apiContextFor(f, "anna");
  const reader = {
    ...nurse,
    actor: { ...nurse.actor, permissions: nurse.actor.permissions.filter((p) => p !== "residents.write") },
  } as ApiContext;
  const erna = await createResident(f, "Erna Muster");

  assert.equal((await failure(createBelonging(reader, erna, { name: "Brille" }))).status, 403);
  assert.equal((await failure(createBelonging(nurse, erna, { name: " " }))).message, "Bitte den Gegenstand angeben.");
  assert.equal(
    (await failure(createBelonging(nurse, erna, { name: "Brille", kind: "geld" }))).message,
    "Bitte Hilfsmittel oder persönlichen Gegenstand wählen.",
  );

  await createBelonging(nurse, erna, { name: "Ehering", kind: "personal", marking: "Gravur „E. 1962“" });
  let list = await createBelonging(nurse, erna, {
    name: "Hörgerät rechts",
    kind: "aid",
    marking: "Name auf Etui",
    location: "Nachttisch",
  });
  assert.deepEqual(
    list.belongings.map((item) => [item.name, item.kind]),
    [
      ["Hörgerät rechts", "aid"],
      ["Ehering", "personal"],
    ],
  );
  const hearing = list.belongings[0];
  list = await updateBelonging(nurse, hearing.id, { ...hearing, location: "Schublade Bad" });
  assert.equal(list.belongings[0].location, "Schublade Bad");
  assert.equal((await failure(updateBelonging(nurse, hearing.id, { ...hearing }))).status, 409, "alter Stand");

  assert.deepEqual((await transferSheet(nurse, erna)).belongings, [
    { name: "Hörgerät rechts", kind: "aid", marking: "Name auf Etui" },
    { name: "Ehering", kind: "personal", marking: "Gravur „E. 1962“" },
  ]);

  const ring = list.belongings[1];
  assert.equal((await failure(removeBelonging(nurse, ring.id, { reason: "" }))).message, "Bitte den Grund angeben.");
  list = await removeBelonging(nurse, ring.id, { reason: "der Tochter mitgegeben" });
  assert.equal(list.belongings[1].removed?.reason, "der Tochter mitgegeben");
  assert.equal((await failure(removeBelonging(nurse, ring.id, { reason: "nochmals" }))).status, 409);
  assert.deepEqual(
    (await transferSheet(nurse, erna)).belongings.map((item) => item.name),
    ["Hörgerät rechts"],
  );

  const audit = await q<{ action: string; after_data: Record<string, unknown> }>(
    `SELECT action, after_data FROM carecore_audit_log WHERE entity_type = 'resident_belonging'
       AND after_data ->> 'residentId' = $1 ORDER BY created_at`,
    [erna],
  );
  assert.deepEqual(
    audit.map((row) => row.action),
    ["created", "created", "updated", "removed"],
  );
  assert.equal(audit[2].after_data.storedAt, "Schublade Bad");

  const other = await fixture();
  const stranger = await apiContextFor(other, "anna");
  assert.equal((await failure(belongingList(stranger, erna))).status, 404);
  assert.equal((await failure(updateBelonging(stranger, hearing.id, { name: "x" }))).status, 404);
});

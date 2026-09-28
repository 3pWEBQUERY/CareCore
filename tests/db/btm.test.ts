import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-context";
import { hashPassword } from "@/lib/auth";
import { btmBook, btmOverview, countStock, setControlled } from "@/lib/medication-btm";
import { correctStock, receiveStock } from "@/lib/medication-stock";
import { apiContextFor, createResident, fixture, q, type Fixture } from "../support/db";

const PASSWORD = "Zeugin-Test-2026";

const failure = async (promise: Promise<unknown>) =>
  promise.then(
    () => ({ status: 200, message: "" }),
    (error) => ({
      status: error instanceof ApiError ? error.status : 500,
      message: error instanceof Error ? error.message : String(error),
    }),
  );

// Zeuginnen und Zeugen melden sich mit Benutzername und Passwort an.
async function withPasswords(f: Fixture) {
  const hash = await hashPassword(PASSWORD);
  await q(`UPDATE carecore_users SET password_hash = $1 WHERE id = ANY($2::uuid[])`, [hash, Object.values(f.people)]);
  const usernames = await q<{ id: string; username: string }>(
    `SELECT id, username FROM carecore_users WHERE id = ANY($1::uuid[])`,
    [Object.values(f.people)],
  );
  const name = (person: string) => usernames.find((row) => row.id === f.people[person])!.username;
  return (person: string, password = PASSWORD) => ({ username: name(person), password });
}

// BtM-Präparat mit Stationsbestand von 10 Stück im Wohnbereich A.
async function btmStock(f: Fixture) {
  const medication = randomUUID();
  const stock = randomUUID();
  await q(
    `INSERT INTO carecore_medications (id, organization_id, name, strength, is_controlled) VALUES ($1, $2, 'Morphin', '10 mg', TRUE)`,
    [medication, f.org],
  );
  await q(
    `INSERT INTO carecore_medication_stock (id, organization_id, care_unit_id, medication_id, quantity, unit) VALUES ($1, $2, $3, $4, 10, 'Tabletten')`,
    [stock, f.org, f.units.a, medication],
  );
  return { medication, stock };
}

test("BtM-Eingang: nur mit gültiger Zweitunterschrift einer berechtigten anderen Person", async () => {
  const f = await fixture();
  const witness = await withPasswords(f);
  const ctx = await apiContextFor(f, "anna");
  const { stock } = await btmStock(f);
  const receipt = (extra: Record<string, unknown>) =>
    receiveStock(ctx, { stockId: stock, quantity: 5, note: "Lieferung", ...extra });

  assert.match((await failure(receipt({}))).message, /Zweitunterschrift/);
  assert.equal((await failure(receipt({ witness: witness("max", "falsch") }))).status, 403);
  assert.match((await failure(receipt({ witness: witness("anna") }))).message, /anderen Person/);
  // Die Leitung hat im Testmandanten keine Medikationsberechtigung.
  assert.match((await failure(receipt({ witness: witness("leadA") }))).message, /nicht für Medikation berechtigt/);
  // Eine Person einer anderen Organisation zählt nicht.
  const other = await fixture();
  const otherWitness = await withPasswords(other);
  assert.match((await failure(receipt({ witness: otherWitness("max") }))).message, /Organisation/);

  await receipt({ witness: witness("max") });
  const [row] = await q<{ quantity: string }>(`SELECT quantity FROM carecore_medication_stock WHERE id = $1`, [stock]);
  assert.equal(Number(row.quantity), 15);
  const book = await btmBook(ctx, stock);
  assert.equal(book.entries[0].kind, "receipt");
  assert.equal(book.entries[0].witness, "Max Meier");
  assert.equal(book.entries[0].balance, 15);
  assert.equal(book.opening, 10, "Bestand vor der ersten Buchung wird als Übertrag ausgewiesen");
});

test("BtM-Bestandskontrolle: Differenz nur mit Begründung, Buchung und Kontrolle gemeinsam", async () => {
  const f = await fixture();
  const witness = await withPasswords(f);
  const ctx = await apiContextFor(f, "anna");
  const { stock } = await btmStock(f);

  // Stimmt der Bestand, entsteht nur die Kontrolle, keine Buchung.
  assert.deepEqual(await countStock(ctx, stock, { counted: 10, witness: witness("max") }), {
    difference: 0,
    witness: "Max Meier",
  });
  assert.match((await failure(countStock(ctx, stock, { counted: 9, witness: witness("max") }))).message, /begründen/);
  assert.match(
    (await failure(countStock(ctx, stock, { counted: 9, note: "Tablette zerbrochen" }))).message,
    /Zweitunterschrift/,
  );
  await countStock(ctx, stock, { counted: 9, note: "Tablette zerbrochen", witness: witness("lea") });

  const book = await btmBook(ctx, stock);
  assert.equal(book.stock.quantity, 9);
  assert.deepEqual(
    book.entries.map((entry) => [entry.kind, entry.delta, entry.balance, entry.expected, entry.counted]),
    [
      ["count", -1, 9, 10, 9],
      ["count", 0, 10, 10, 10],
    ],
  );
  const overview = await btmOverview(ctx);
  assert.equal(overview.items[0].lastCount?.counted, 9);
  assert.equal(overview.items[0].lastCount?.witness, "Lea Beispiel");
  // Nicht-BtM-Bestände werden hier nicht kontrolliert.
  const plain = randomUUID();
  const med = randomUUID();
  await q(`INSERT INTO carecore_medications (id, organization_id, name) VALUES ($1, $2, 'Paracetamol')`, [med, f.org]);
  await q(
    `INSERT INTO carecore_medication_stock (id, organization_id, care_unit_id, medication_id, quantity, unit) VALUES ($1, $2, $3, $4, 5, 'Stk.')`,
    [plain, f.org, f.units.a, med],
  );
  assert.equal((await failure(countStock(ctx, plain, { counted: 5, witness: witness("max") }))).status, 400);
});

test("BtM-Buchungen und -Kontrollen sind unveränderlich", async () => {
  const f = await fixture();
  const witness = await withPasswords(f);
  const ctx = await apiContextFor(f, "anna");
  const { stock } = await btmStock(f);
  await countStock(ctx, stock, { counted: 8, note: "Differenz bei Übergabe", witness: witness("max") });
  const [movement] = await q<{ id: string }>(`SELECT id FROM carecore_medication_stock_movements WHERE stock_id = $1`, [
    stock,
  ]);
  await assert.rejects(
    q(`UPDATE carecore_medication_stock_movements SET delta = -1 WHERE id = $1`, [movement.id]),
    /nicht geändert/,
  );
  await assert.rejects(
    q(`DELETE FROM carecore_medication_stock_movements WHERE id = $1`, [movement.id]),
    /nicht gelöscht/,
  );
  await assert.rejects(
    q(`UPDATE carecore_btm_counts SET counted_quantity = 10 WHERE stock_id = $1`, [stock]),
    /nicht geändert/,
  );
  await assert.rejects(q(`DELETE FROM carecore_btm_counts WHERE stock_id = $1`, [stock]), /nicht gelöscht/);
});

test("Korrektur und Entsorgung von BtM über die Bestände verlangen ebenfalls die Zweitunterschrift", async () => {
  const f = await fixture();
  const witness = await withPasswords(f);
  const ctx = await apiContextFor(f, "anna");
  const { stock } = await btmStock(f);
  const residentId = await createResident(f);
  assert.match(
    (await failure(correctStock(ctx, stock, { quantity: 7, reason: "disposal", note: "Verfallen" }))).message,
    /Zweitunterschrift/,
  );
  await correctStock(ctx, stock, { quantity: 7, reason: "disposal", note: "Verfallen", witness: witness("max") });
  const book = await btmBook(ctx, stock);
  assert.deepEqual(
    [book.entries[0].kind, book.entries[0].delta, book.entries[0].witness],
    ["disposal", -3, "Max Meier"],
  );
  // Neuer Bestand eines BtM-Präparats (Bewohnerbestand) ebenfalls nur mit Zweitunterschrift.
  const newStock = { name: "Morphin", strength: "10 mg", unit: "Tabletten", quantity: 20, residentId };
  assert.match((await failure(receiveStock(ctx, newStock))).message, /Zweitunterschrift/);
  await receiveStock(ctx, { ...newStock, witness: witness("lea") });
  // Andere Präparate brauchen weiterhin keine Zweitunterschrift.
  await receiveStock(ctx, { name: "Paracetamol", strength: "500 mg", unit: "Tabletten", quantity: 20, residentId });
});

test("BtM-Kennzeichnung: Aufheben nur mit Begründung, beides protokolliert", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const medication = randomUUID();
  await q(`INSERT INTO carecore_medications (id, organization_id, name) VALUES ($1, $2, 'Oxycodon')`, [
    medication,
    f.org,
  ]);
  await setControlled(ctx, medication, { controlled: true });
  assert.match((await failure(setControlled(ctx, medication, { controlled: false }))).message, /begründen/);
  await setControlled(ctx, medication, { controlled: false, reason: "Irrtümlich gekennzeichnet" });
  const audit = await q<{ action: string }>(
    `SELECT action FROM carecore_audit_log WHERE entity_id = $1 ORDER BY created_at`,
    [medication],
  );
  assert.deepEqual(
    audit.map((row) => row.action),
    ["btm_marked", "btm_unmarked"],
  );
  const other = await fixture();
  assert.equal(
    (await failure(setControlled(await apiContextFor(other, "anna"), medication, { controlled: true }))).status,
    404,
  );
});

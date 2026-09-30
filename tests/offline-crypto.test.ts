import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { importPrivateKey, importPublicKey, isSealed, seal, unseal } from "../lib/offline-crypto.ts";
import { offlineKeyPair } from "../lib/offline-key.ts";

const entry = {
  url: "/api/vitals/measurements",
  body: { note: "Erna Muster klagt über Schwindel" },
  label: "Vitalwerte",
};

test("Offline: Schlüsselpaar je Person aus dem Serverschlüssel, stabil und verschieden", () => {
  const secret = randomBytes(32);
  const a = offlineKeyPair("user-a", secret)!;
  assert.deepEqual(offlineKeyPair("user-a", secret), a, "gleiche Person, gleicher Schlüssel");
  assert.notEqual(offlineKeyPair("user-b", secret)!.publicJwk.x, a.publicJwk.x);
  assert.notEqual(offlineKeyPair("user-a", randomBytes(32))!.publicJwk.x, a.publicJwk.x);
  assert.equal(offlineKeyPair("user-a", null), null, "ohne Serverschlüssel keine Offline-Speicherung");
  assert.equal("d" in a.publicJwk, false, "der öffentliche Teil enthält keinen privaten Schlüssel");
});

test("Offline: verschlüsselt ohne Klartext, nur mit dem privaten Schlüssel der Person lesbar", async () => {
  const secret = randomBytes(32);
  const mine = offlineKeyPair("user-a", secret)!;
  const other = offlineKeyPair("user-b", secret)!;
  const sealed = await seal(await importPublicKey(mine.publicJwk), entry);
  assert.ok(isSealed(sealed));
  assert.equal(JSON.stringify(sealed).includes("Schwindel"), false, "kein Klartext auf dem Gerät");
  assert.deepEqual(await unseal(await importPrivateKey(mine.privateJwk), sealed), entry);
  await assert.rejects(unseal(await importPrivateKey(other.privateJwk), sealed), "fremder Schlüssel scheitert");
  const tampered = { ...sealed, data: `${sealed.data.startsWith("A") ? "B" : "A"}${sealed.data.slice(1)}` };
  await assert.rejects(unseal(await importPrivateKey(mine.privateJwk), tampered), "veränderte Daten fallen auf");
  const again = await seal(await importPublicKey(mine.publicJwk), entry);
  assert.notEqual(again.data, sealed.data, "jeder Eintrag mit eigenem Einmalschlüssel");
});

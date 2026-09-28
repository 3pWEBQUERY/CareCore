import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-context";
import { hidePhoto, listPhotos, readPhoto, storePhoto } from "@/lib/wound-photos";
import { addEntry, createWound, listEntries, setWoundStatus, updateWound, woundsOverview } from "@/lib/wounds";
import { apiContextFor, createResident, fixture, q } from "../support/db";

const failure = async (promise: Promise<unknown>) =>
  promise.then(
    () => ({ status: 200, message: "" }),
    (error) => ({
      status: error instanceof ApiError ? error.status : 500,
      message: error instanceof Error ? error.message : String(error),
    }),
  );

const isoDay = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

// Einträge im Änderungsprotokoll der Akte (wie die Karte „Änderungsprotokoll“ sie sucht).
const residentLog = (residentId: string) =>
  q<{ entity_type: string; action: string }>(
    `SELECT entity_type, action FROM carecore_audit_log
     WHERE entity_id = $1 OR COALESCE(after_data ->> 'residentId', before_data ->> 'residentId') = $1::text
     ORDER BY created_at`,
    [residentId],
  );

const wound = (residentId: string, extra: Record<string, unknown> = {}) => ({
  residentId,
  woundType: "Dekubitus",
  category: "Kategorie 2",
  bodyLocation: "Sakralbereich",
  discoveredOn: isoDay(-1),
  careIntervalDays: 2,
  origin: "inhouse",
  ...extra,
});

test("Wunde anlegen, bearbeiten, dokumentieren und abschliessen – alles im Änderungsprotokoll der Akte", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const residentId = await createResident(f);
  const id = await createWound(ctx, {
    ...wound(residentId),
    initialEntry: { lengthCm: 3, widthCm: 2, tissue: "Granulation" },
  });
  await updateWound(ctx, id, { ...wound(residentId), careIntervalDays: 3, treatmentPlan: "Hydrokolloid" });
  await addEntry(ctx, id, { lengthCm: 2.5, widthCm: 2, woundStatus: "healing" });
  assert.equal((await listEntries(ctx, id)).entries.length, 2);
  assert.equal((await woundsOverview(ctx, false)).wounds[0].status, "healing");

  assert.match((await failure(setWoundStatus(ctx, id, "closed", ""))).message, /Grund/);
  await setWoundStatus(ctx, id, "closed", "vollständig epithelisiert");
  assert.equal((await failure(addEntry(ctx, id, { note: "Kontrolle" }))).status, 409, "abgeschlossen");
  await setWoundStatus(ctx, id, "closed", "doppelt");
  await setWoundStatus(ctx, id, "active", "");

  assert.deepEqual(
    (await residentLog(residentId)).map((row) => `${row.entity_type}:${row.action}`),
    ["wound:created", "wound:updated", "wound_entry:documented", "wound:status_closed", "wound:status_active"],
    "gleicher Status wird nicht erneut protokolliert",
  );
});

test("Wunde: ungültige Angaben werden abgelehnt statt stillschweigend verworfen", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const residentId = await createResident(f);
  assert.match((await failure(createWound(ctx, wound(residentId, { discoveredOn: isoDay(2) })))).message, /Zukunft/);
  assert.match((await failure(createWound(ctx, wound(residentId, { careIntervalDays: 21 })))).message, /Intervall/);
  assert.match((await failure(createWound(ctx, wound(residentId, { careIntervalDays: "2" })))).message, /Intervall/);
  assert.match((await failure(createWound(ctx, wound(residentId, { category: null })))).message, /Kategorie/);

  // Verantwortlich: nur aktive Personen der eigenen Organisation.
  await q(`UPDATE carecore_users SET active = FALSE WHERE id = $1`, [f.people.max]);
  assert.match(
    (await failure(createWound(ctx, wound(residentId, { responsibleId: f.people.max })))).message,
    /nicht aktiv/,
  );
  const other = await fixture();
  assert.match(
    (await failure(createWound(ctx, wound(residentId, { responsibleId: other.people.anna })))).message,
    /Organisation/,
  );

  const id = await createWound(ctx, wound(residentId, { careIntervalDays: null }));
  assert.match(
    (await failure(updateWound(ctx, id, wound(residentId, { discoveredOn: isoDay(3) })))).message,
    /Zukunft/,
  );

  // Körpermarkierung eines anderen Bewohners lässt sich nicht verknüpfen.
  const otherResident = await createResident(f, "Otto Anders");
  const marker = randomUUID();
  await q(
    `INSERT INTO carecore_body_observations (id, resident_id, kind, label, location, body_x, body_y, body_z)
     VALUES ($1, $2, 'wound', 'Rötung', 'Ferse', 0, 0, 0)`,
    [marker, otherResident],
  );
  assert.match(
    (await failure(updateWound(ctx, id, wound(residentId, { bodyObservationId: marker })))).message,
    /Markierung/,
  );
});

test("Wunden anderer Organisationen sind nicht sichtbar", async () => {
  const f = await fixture();
  const residentId = await createResident(f);
  const id = await createWound(await apiContextFor(f, "anna"), wound(residentId));
  const other = await apiContextFor(await fixture(), "anna");
  assert.equal((await woundsOverview(other, true)).wounds.length, 0);
  assert.equal((await failure(listEntries(other, id))).status, 404);
  assert.equal((await failure(addEntry(other, id, { note: "x" }))).status, 404);
  assert.equal((await failure(setWoundStatus(other, id, "closed", "x"))).status, 404);
  assert.equal((await failure(listPhotos(other, id))).status, 404);
});

test("Wundfotos: nur echte Bilder, Ausblenden mit Grund, beides im Protokoll", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const residentId = await createResident(f);
  const id = await createWound(ctx, wound(residentId));
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a1f2ff6e0000000049454e44ae426082",
    "hex",
  );
  const form = (bytes: Buffer, consent = "true") => {
    const data = new FormData();
    data.set("file", new File([new Uint8Array(bytes)], "foto.png", { type: "image/png" }));
    data.set("consent", consent);
    return data;
  };
  assert.match((await failure(storePhoto(ctx, id, form(png, "false")))).message, /Einwilligung/);
  assert.match((await failure(storePhoto(ctx, id, form(Buffer.from("<svg></svg>"))))).message, /JPEG/);
  const photoId = await storePhoto(ctx, id, form(png));
  assert.equal((await readPhoto(ctx, photoId)).mimeType, "image/png");
  assert.equal((await failure(readPhoto(await apiContextFor(await fixture(), "anna"), photoId))).status, 404);

  assert.match((await failure(hidePhoto(ctx, photoId, ""))).message, /Grund/);
  await hidePhoto(ctx, photoId, "unscharf");
  assert.equal((await failure(hidePhoto(ctx, photoId, "nochmals"))).status, 404);
  assert.equal((await listPhotos(ctx, id)).length, 0);
  const log = (await residentLog(residentId)).map((row) => `${row.entity_type}:${row.action}`);
  assert.deepEqual(log.slice(-2), ["wound_photo:uploaded", "wound_photo:hidden"]);
});

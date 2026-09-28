import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, type ApiContext } from "@/lib/api-context";
import { createDocument, documentAction, listDocuments, newVersion } from "@/lib/documents";
import { apiContextFor, fixture, q } from "../support/db";

const failure = async (promise: Promise<unknown>) =>
  promise.then(
    () => ({ status: 200, message: "" }),
    (error) => ({
      status: error instanceof ApiError ? error.status : 500,
      message: error instanceof Error ? error.message : String(error),
    }),
  );

const quality = (ctx: ApiContext): ApiContext => ({
  ...ctx,
  actor: { ...ctx.actor, permissions: [...ctx.actor.permissions, "quality.manage"] },
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  data.set("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "standard.pdf", { type: "application/pdf" }));
  return data;
};

const activeVersions = (title: string) =>
  q<{ version_no: number }>(
    `SELECT version_no FROM carecore_documents WHERE title = $1 AND status = 'active' ORDER BY version_no`,
    [title],
  ).then((rows) => rows.map((row) => row.version_no));

test("Standards: je Dokument nur eine Folgeversion, nie zwei gültige Fassungen", async () => {
  const f = await fixture();
  const lead = quality(await apiContextFor(f, "leadA"));
  const title = `Sturzprophylaxe ${f.org.slice(0, 6)}`;
  assert.equal(
    (
      await failure(
        createDocument(await apiContextFor(f, "anna"), form({ kind: "standard", title, category: "Pflegestandard" })),
      )
    ).status,
    403,
    "Standards veröffentlicht das Qualitätsmanagement",
  );
  const v1 = await createDocument(
    lead,
    form({ kind: "standard", title, category: "Pflegestandard", requiresAck: "true" }),
  );
  const [notified] = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM carecore_notifications WHERE type = 'standard' AND link_url LIKE $1`,
    [`%${v1}`],
  );
  assert.equal(notified.n, 6, "alle anderen aktiven Personen der Organisation");

  const v2 = await newVersion(lead, v1, form({ changeNote: "Neue Skala", status: "draft" }));
  assert.equal((await failure(newVersion(lead, v1, form({ changeNote: "Nochmals", status: "draft" })))).status, 409);
  await documentAction(lead, v2, { action: "publish" });
  assert.deepEqual(await activeVersions(title), [2]);
  // Ersetzte Fassungen bleiben unverändert.
  assert.equal(
    (await failure(documentAction(lead, v1, { action: "update", title: "Geändert", category: "Hygiene" }))).status,
    409,
  );

  // Lesen & bestätigen: einmal protokolliert, auch bei wiederholtem Klick.
  const anna = await apiContextFor(f, "anna");
  await documentAction(anna, v2, { action: "ack" });
  await documentAction(anna, v2, { action: "ack" });
  const [acks] = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM carecore_audit_log WHERE entity_id = $1 AND action = 'acknowledged'`,
    [v2],
  );
  assert.equal(acks.n, 1);
  const standard = (await listDocuments(anna, new URLSearchParams({ kind: "standard" }))).documents.find(
    (doc) => doc.id === v2,
  );
  assert.ok(standard?.acknowledgedAt);

  assert.match((await failure(documentAction(lead, v2, { action: "archive" }))).message, /Grund/);
  await documentAction(lead, v2, { action: "archive", reason: "Durch Weisung ersetzt" });
  assert.deepEqual(await activeVersions(title), []);
  const other = quality(await apiContextFor(await fixture(), "leadA"));
  assert.equal((await failure(documentAction(other, v2, { action: "read" }))).status, 404);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import type { ApiContext } from "@/lib/api-context";
import catalog from "@/locales/catalog.json" with { type: "json" };
import { releasedLanguages } from "@/lib/languages";
import {
  dictionaryFor,
  languageStates,
  listTranslations,
  reviewTranslations,
  saveTranslation,
  setLanguageReleased,
} from "@/lib/translations";
import { savePreferences } from "@/lib/user-settings";
import { apiContextFor, fixture, q } from "../support/db";

const rejected = (promise: Promise<unknown>) =>
  promise.then(
    () => "ok",
    (error: Error) => error.message,
  );

async function admin(): Promise<ApiContext> {
  const f = await fixture();
  const lead = await apiContextFor(f, "leadA");
  return { ...lead, actor: { ...lead.actor, permissions: [...lead.actor.permissions, "administration.manage"] } };
}

test("Übersetzungen: nur Katalogtexte, Platzhalter bleiben, Entwürfe nur zum Prüfen, Freigabe der Sprache", async () => {
  const ctx = await admin();
  await q(`DELETE FROM carecore_translations WHERE locale = 'hu'`);
  await q(`DELETE FROM carecore_languages WHERE locale = 'hu'`);
  const text = catalog.strings.find((source) => source === "Speichern")!;
  const pattern = catalog.patterns.find((source) => /\{0\}/.test(source) && /\{1\}/.test(source))!;
  assert.ok(text && pattern, "Katalog enthält Texte und Muster");

  assert.equal(
    await rejected(saveTranslation(ctx, { locale: "hu", source: "Gibt es nicht im Katalog", target: "x" })),
    "Dieser Text steht nicht im Katalog.",
  );
  assert.equal(
    await rejected(saveTranslation(ctx, { locale: "de", source: text, target: "x" })),
    "Unbekannte Sprache.",
  );
  assert.match(
    await rejected(saveTranslation(ctx, { locale: "hu", source: pattern, target: "csak {0}" })),
    /Platzhalter müssen erhalten bleiben/,
  );
  await saveTranslation(ctx, { locale: "hu", source: text, target: "Mentés" });
  await saveTranslation(ctx, { locale: "hu", source: pattern, target: "{1} … {0}", reviewed: true });

  // Mitarbeitende: nur Geprüftes; die Administration beim Prüfen auch Entwürfe.
  assert.deepEqual(await dictionaryFor(ctx.sql, "hu", false), { strings: {}, patterns: { [pattern]: "{1} … {0}" } });
  assert.equal((await dictionaryFor(ctx.sql, "hu", true)).strings[text], "Mentés");
  const state = (await languageStates(ctx.sql)).find((entry) => entry.locale === "hu")!;
  assert.deepEqual([state.reviewed, state.drafts, state.released], [1, 1, false]);

  const drafts = await listTranslations(ctx, { locale: "hu", filter: "draft", query: "", offset: 0 });
  assert.deepEqual(
    drafts.entries.map((entry) => entry.source),
    [text],
  );
  assert.equal(await reviewTranslations(ctx, "hu", [text, "nicht im Katalog"]), 1);
  assert.equal((await dictionaryFor(ctx.sql, "hu", false)).strings[text], "Mentés");

  // Freigabe: erst dann wählbar für Mitarbeitende.
  const staff = await apiContextFor(await fixture(), "anna");
  assert.equal((await releasedLanguages(ctx.sql)).includes("hu"), false);
  assert.equal(await rejected(savePreferences(staff.actor, { language: "hu" })), "Sprache: Wert ist ungültig.");
  await setLanguageReleased(ctx, "hu", true);
  assert.ok((await releasedLanguages(ctx.sql)).includes("hu"));
  assert.equal((await savePreferences(staff.actor, { language: "hu" })).language, "hu");
  await setLanguageReleased(ctx, "hu", false);

  const audit = await q<{ action: string }>(
    `SELECT action FROM carecore_audit_log WHERE entity_type IN ('translation', 'language') AND actor_user_id = $1 ORDER BY created_at`,
    [ctx.actor.id],
  );
  assert.deepEqual(
    audit.map((row) => row.action),
    ["saved", "reviewed", "reviewed_page", "released", "withdrawn"],
  );
});

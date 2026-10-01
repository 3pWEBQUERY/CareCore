import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDashboardLayout } from "@/lib/dashboard-layout";

// Gespeichertes Arbeitsplatz-Layout: alte Layouts (nur Reihenfolge/ausgeblendet) bleiben gültig; Kopfbereich und
// Breiten werden geprüft, ungültige Angaben abgelehnt.
test("Arbeitsplatz-Layout: alte und neue Form, Prüfung von Kopfbereich und Breiten", () => {
  assert.deepEqual(normalizeDashboardLayout({ order: ["summary", "summary", "tasks"], hidden: [] }), {
    order: ["summary", "tasks"],
    hidden: [],
  });
  assert.deepEqual(
    normalizeDashboardLayout({
      order: ["notes", "news"],
      hidden: ["shortcuts"],
      top: ["today", "news"],
      sizes: { notes: "half", news: "full" },
    }),
    { order: ["notes", "news"], hidden: ["shortcuts"], top: ["today", "news"], sizes: { notes: "half", news: "full" } },
  );
  assert.equal(normalizeDashboardLayout({ order: [], hidden: [], sizes: { notes: "riesig" } }), null);
  assert.equal(normalizeDashboardLayout({ order: [], hidden: [], sizes: ["half"] }), null);
  assert.equal(normalizeDashboardLayout({ order: [], hidden: [], top: "notes" }), null);
  assert.equal(normalizeDashboardLayout({ order: Array.from({ length: 51 }, (_, i) => `w${i}`), hidden: [] }), null);
  assert.equal(normalizeDashboardLayout({ hidden: [] }), null);
});

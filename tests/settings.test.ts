import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSettings } from "../lib/settings-shared.ts";
import { notifyCategory, resolvePreferences, START_PAGES } from "../lib/user-settings-shared.ts";
import { CARE_LEVELS } from "../lib/care-levels.ts";
import { raiProgress, scoreFromLabel, RAI_SCORES } from "../lib/rai-shared.ts";

test("organisation settings fall back to safe defaults", () => {
  const settings = resolveSettings({ documentationReminder: { enabled: false, value: 999 }, keyboardShortcuts: "x" });
  assert.equal(settings.documentationReminder.enabled, false);
  assert.equal(settings.documentationReminder.value, 24, "out of range falls back to the default");
  assert.equal(settings.keyboardShortcuts.enabled, true);
  assert.equal(settings.navigationBadges.value, null);
});

test("personal preferences default to everything on", () => {
  const preferences = resolvePreferences(null);
  assert.ok(Object.values(preferences.notify).every(Boolean));
  assert.equal(preferences.textSize, "standard");
  assert.equal(preferences.startPage, "home");
  const custom = resolvePreferences({ notify: { supply: false }, startPage: "med", textSize: "huge" });
  assert.equal(custom.notify.supply, false);
  assert.equal(custom.notify.tasks, true);
  assert.equal(custom.textSize, "standard");
  assert.ok(START_PAGES[custom.startPage].path.startsWith("/c"));
});

test("notification types map to their category", () => {
  assert.equal(notifyCategory("task_due"), "tasks");
  assert.equal(notifyCategory("shift_reminder"), "schedule");
  assert.equal(notifyCategory("supply_low"), "supply");
  assert.equal(notifyCategory("support_request"), null);
});

test("Swiss care levels: 12 levels", () => {
  assert.equal(CARE_LEVELS.length, 12);
  assert.equal(CARE_LEVELS[11], "Pflegestufe 12");
});

test("RAI progress counts the four domains and the note", () => {
  assert.equal(raiProgress({}, ""), 0);
  assert.equal(raiProgress({ Alltag: 2, Kognition: 1 }, ""), 40);
  assert.equal(raiProgress({ Alltag: 0, Kognition: 1, Stimmung: 2, Gesundheit: 4 }, "Notiz"), 100);
  assert.equal(scoreFromLabel(RAI_SCORES[3]), 3);
  assert.equal(scoreFromLabel("unbekannt"), undefined);
});

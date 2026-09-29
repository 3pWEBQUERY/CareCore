import { test } from "node:test";
import assert from "node:assert/strict";
import { mentionedMembers } from "@/lib/messenger-shared";

const members = [
  { user_id: "a", display_name: "Anna Müller" },
  { user_id: "b", display_name: "Anna Müller-Meier" },
  { user_id: "c", display_name: "Max Meier" },
];

test("Erwähnungen: vollständiger Name, Gross-/Kleinschreibung egal, längster Name zuerst", () => {
  assert.deepEqual(mentionedMembers("Kannst du @anna müller kurz anrufen?", members), ["a"]);
  assert.deepEqual(mentionedMembers("@Anna Müller-Meier bitte übernehmen", members), ["b"]);
  assert.deepEqual(mentionedMembers("@Max Meier und @Anna Müller, danke", members).sort(), ["a", "c"]);
});

test("Erwähnungen: nur echte Namensgrenzen, keine Treffer ohne @", () => {
  assert.deepEqual(mentionedMembers("Anna Müller ist heute da", members), []);
  assert.deepEqual(mentionedMembers("@Max Meierhofer kommt später", members), []);
  assert.deepEqual(mentionedMembers("@Max Meier.", members), ["c"]);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-context";
import { reactionsFor, sendMessage, toggleReaction } from "@/lib/messenger";
import { apiContextFor, fixture, q } from "../support/db";

const status = async (promise: Promise<unknown>) =>
  promise.then(
    () => 200,
    (error) => (error instanceof ApiError ? error.status : 500),
  );

async function conversation(org: string, kind: "direct" | "group", members: string[], title: string | null = null) {
  const id = randomUUID();
  await q(
    `INSERT INTO carecore_conversations (id, organization_id, title, kind, created_by) VALUES ($1, $2, $3, $4, $5)`,
    [id, org, title, kind, members[0]],
  );
  for (const userId of members)
    await q(`INSERT INTO carecore_conversation_members (conversation_id, user_id) VALUES ($1, $2)`, [id, userId]);
  return id;
}

const notificationsFor = (userId: string) =>
  q<{ type: string; priority: string; title: string; body: string }>(
    "SELECT type, priority, title, body FROM carecore_notifications WHERE user_id = $1 AND type LIKE 'message_%' ORDER BY created_at",
    [userId],
  );

test("Messenger: Gruppe benachrichtigt nur Erwähnte, Direktnachricht die andere Person", async () => {
  const f = await fixture();
  const anna = await apiContextFor(f, "anna");
  const group = await conversation(f.org, "group", [f.people.anna, f.people.max, f.people.lea], "Frühdienst");
  const sent = await sendMessage(anna, group, "@Max Meier bitte Zimmer 12 übernehmen");
  assert.deepEqual(sent.mentions, [f.people.max]);
  const [maxNote] = await notificationsFor(f.people.max);
  assert.equal(maxNote.type, "message_mention");
  assert.equal(maxNote.priority, "high");
  assert.equal(maxNote.title, "Anna Müller hat dich erwähnt");
  assert.equal(maxNote.body, "Frühdienst: @Max Meier bitte Zimmer 12 übernehmen");
  assert.equal((await notificationsFor(f.people.lea)).length, 0);

  const direct = await conversation(f.org, "direct", [f.people.anna, f.people.lea]);
  await sendMessage(anna, direct, "Danke dir!");
  const [leaNote] = await notificationsFor(f.people.lea);
  assert.equal(leaNote.type, "message_direct");
  assert.equal(leaNote.title, "Nachricht von Anna Müller");

  // Nicht-Mitglieder erreichen die Unterhaltung nicht; leere Nachrichten werden abgewiesen.
  assert.equal(await status(sendMessage(await apiContextFor(f, "ben"), group, "Hallo")), 403);
  assert.equal(await status(sendMessage(anna, group, "   ")), 400);
});

test("Messenger: Reaktion setzen und wieder entfernen, nur aus der festen Auswahl", async () => {
  const f = await fixture();
  const anna = await apiContextFor(f, "anna");
  const max = await apiContextFor(f, "max");
  const group = await conversation(f.org, "group", [f.people.anna, f.people.max], "Team");
  const { id } = await sendMessage(anna, group, "Übergabe ist fertig");

  assert.deepEqual(await toggleReaction(max, id, "👍"), { active: true });
  await toggleReaction(anna, id, "👍");
  await toggleReaction(anna, id, "✅");
  let [thumbs, check] = (await reactionsFor(max, [id])).get(id) ?? [];
  assert.equal(thumbs.emoji, "👍");
  assert.equal(thumbs.count, 2);
  assert.equal(thumbs.mine, true);
  assert.deepEqual(thumbs.names, ["Max Meier", "Anna Müller"]);
  assert.equal(check.mine, false);

  assert.deepEqual(await toggleReaction(max, id, "👍"), { active: false });
  [thumbs] = (await reactionsFor(max, [id])).get(id) ?? [];
  assert.equal(thumbs.count, 1);
  assert.equal(thumbs.mine, false);

  assert.equal(await status(toggleReaction(max, id, "🔥")), 400);
  assert.equal(await status(toggleReaction(await apiContextFor(f, "ben"), id, "👍")), 403);
});

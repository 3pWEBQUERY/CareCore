import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, type ApiContext, type Row } from "@/lib/api-context";
import {
  MESSAGE_REACTIONS,
  mentionedMembers,
  type MessageReaction,
  type ReactionSummary,
} from "@/lib/messenger-shared";

async function membersOf(ctx: ApiContext, conversationId: string) {
  const rows = (await ctx.sql`
    SELECT cm.user_id, u.display_name, c.kind, c.title
    FROM carecore_conversation_members cm
    JOIN carecore_conversations c ON c.id = cm.conversation_id AND c.organization_id = ${ctx.actor.organizationId}
    JOIN carecore_users u ON u.id = cm.user_id
    WHERE cm.conversation_id = ${conversationId}`) as Row[];
  if (!rows.some((row) => row.user_id === ctx.actor.id))
    throw new ApiError("Kein Zugriff auf diese Unterhaltung.", 403);
  return rows.map((row) => ({
    user_id: String(row.user_id),
    display_name: String(row.display_name),
    kind: String(row.kind),
    title: (row.title as string | null) ?? null,
  }));
}

// Nachricht senden: Erwähnte Mitglieder und bei Direktnachrichten die andere Person werden benachrichtigt
// (auch als Push); in Gruppen ohne Erwähnung bleibt es beim Zähler ungelesener Nachrichten.
export async function sendMessage(ctx: ApiContext, conversationInput: unknown, textInput: unknown) {
  const conversationId = assertUuid(conversationInput, "Unterhaltung");
  const text = typeof textInput === "string" ? textInput.trim().slice(0, 5000) : "";
  if (!text) throw new ApiError("Die Nachricht darf nicht leer sein.");
  const members = await membersOf(ctx, conversationId);
  const mentions = mentionedMembers(text, members).filter((id) => id !== ctx.actor.id);
  const direct = members[0]?.kind === "direct";
  const place = direct ? "Direktnachricht" : (members[0]?.title ?? "Gruppe");
  const preview = text.length > 140 ? `${text.slice(0, 139)}…` : text;
  const link = `/c/carecore-one/messenger?conversation=${conversationId}`;
  const id = randomUUID();
  const recipients = members
    .map((member) => member.user_id)
    .filter((userId) => userId !== ctx.actor.id && (direct || mentions.includes(userId)));
  await ctx.sql.transaction([
    ctx.sql`INSERT INTO carecore_messages (id, conversation_id, author_user_id, body, mentions)
      VALUES (${id}, ${conversationId}, ${ctx.actor.id}, ${text}, ${JSON.stringify(mentions)}::jsonb)`,
    ctx.sql`UPDATE carecore_conversations SET updated_at = NOW() WHERE id = ${conversationId}`,
    ...recipients.map(
      (userId) => ctx.sql`
        INSERT INTO carecore_notifications (id, user_id, title, body, type, priority, link_url, entity_type, entity_id)
        VALUES (${randomUUID()}, ${userId},
          ${mentions.includes(userId) ? `${ctx.actor.display_name} hat dich erwähnt` : `Nachricht von ${ctx.actor.display_name}`},
          ${`${place}: ${preview}`}, ${mentions.includes(userId) ? "message_mention" : "message_direct"},
          ${mentions.includes(userId) ? "high" : "normal"}, ${link}, 'message', ${id})`,
    ),
  ]);
  return { id, mentions };
}

// Reaktion setzen oder wieder entfernen (nur Mitglieder der Unterhaltung).
export async function toggleReaction(ctx: ApiContext, messageInput: unknown, emojiInput: unknown) {
  const messageId = assertUuid(messageInput, "Nachricht");
  const emoji = String(emojiInput) as MessageReaction;
  if (!MESSAGE_REACTIONS.includes(emoji)) throw new ApiError("Diese Reaktion ist nicht verfügbar.");
  const rows = (await ctx.sql`SELECT conversation_id FROM carecore_messages WHERE id = ${messageId}`) as Row[];
  if (!rows[0]) throw new ApiError("Nachricht nicht gefunden.", 404);
  await membersOf(ctx, String(rows[0].conversation_id));
  const removed = (await ctx.sql`
    DELETE FROM carecore_message_reactions WHERE message_id = ${messageId} AND user_id = ${ctx.actor.id} AND emoji = ${emoji}
    RETURNING message_id`) as Row[];
  if (removed[0]) return { active: false };
  await ctx.sql`INSERT INTO carecore_message_reactions (message_id, user_id, emoji) VALUES (${messageId}, ${ctx.actor.id}, ${emoji})
    ON CONFLICT DO NOTHING`;
  return { active: true };
}

// Reaktionen je Nachricht, in der festen Reihenfolge der Auswahl.
export async function reactionsFor(ctx: ApiContext, messageIds: string[]) {
  const result = new Map<string, ReactionSummary[]>();
  if (!messageIds.length) return result;
  const rows = (await ctx.sql`
    SELECT r.message_id, r.emoji, COUNT(*)::int AS count, BOOL_OR(r.user_id = ${ctx.actor.id}) AS mine,
      array_agg(u.display_name ORDER BY r.created_at) AS names
    FROM carecore_message_reactions r JOIN carecore_users u ON u.id = r.user_id
    WHERE r.message_id = ANY(${messageIds}::uuid[])
    GROUP BY r.message_id, r.emoji`) as Row[];
  for (const row of rows) {
    const list = result.get(String(row.message_id)) ?? [];
    list.push({
      emoji: row.emoji as MessageReaction,
      count: Number(row.count),
      mine: Boolean(row.mine),
      names: (row.names as string[]) ?? [],
    });
    result.set(String(row.message_id), list);
  }
  for (const list of result.values())
    list.sort((a, b) => MESSAGE_REACTIONS.indexOf(a.emoji) - MESSAGE_REACTIONS.indexOf(b.emoji));
  return result;
}

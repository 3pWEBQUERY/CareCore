import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";

type ConversationRow = { id: string; title: string | null; kind: "direct" | "group" | "channel"; updated_at: string };

async function context() {
  const actor = await carecoreActor();
  if (!actor?.organizationId) return null;
  return { actor, sql: carecoreDb() };
}

function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET(request: Request) {
  try {
    const active = await context();
    if (!active) return error("Bitte erneut anmelden.", 401);
    const { actor, sql } = active;
    const requestedId = new URL(request.url).searchParams.get("conversationId");
    const conversations = await sql`
      SELECT c.id, c.title, c.kind, c.updated_at
      FROM carecore_conversations c
      INNER JOIN carecore_conversation_members own_membership ON own_membership.conversation_id = c.id
      WHERE own_membership.user_id = ${actor.id} AND c.organization_id = ${actor.organizationId}
      ORDER BY c.updated_at DESC
    ` as unknown as ConversationRow[];
    const members = await sql`
      SELECT cm.conversation_id, u.id AS user_id, u.display_name, u.role
      FROM carecore_conversation_members cm
      INNER JOIN carecore_conversation_members own_membership ON own_membership.conversation_id = cm.conversation_id AND own_membership.user_id = ${actor.id}
      INNER JOIN carecore_users u ON u.id = cm.user_id
      ORDER BY u.display_name
    ` as unknown as Array<{ conversation_id: string; user_id: string; display_name: string; role: string }>;
    const lastMessages = await sql`
      SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.body, m.created_at, u.display_name AS author_name
      FROM carecore_messages m
      INNER JOIN carecore_conversation_members own_membership ON own_membership.conversation_id = m.conversation_id AND own_membership.user_id = ${actor.id}
      LEFT JOIN carecore_users u ON u.id = m.author_user_id
      ORDER BY m.conversation_id, m.created_at DESC
    ` as unknown as Array<{ conversation_id: string; body: string; created_at: string; author_name: string | null }>;
    const unread = await sql`
      SELECT own_membership.conversation_id, COUNT(m.id)::int AS unread_count
      FROM carecore_conversation_members own_membership
      LEFT JOIN carecore_messages m ON m.conversation_id = own_membership.conversation_id
        AND m.created_at > COALESCE(own_membership.last_read_at, 'epoch'::timestamptz)
        AND m.author_user_id <> ${actor.id}
      WHERE own_membership.user_id = ${actor.id}
      GROUP BY own_membership.conversation_id
    ` as unknown as Array<{ conversation_id: string; unread_count: number }>;
    const people = await sql`
      SELECT u.id, u.display_name, u.role, COALESCE(p.job_title, '') AS job_title, COALESCE(cu.name, '') AS care_unit_name
      FROM carecore_users u
      INNER JOIN carecore_user_profiles p ON p.user_id = u.id
      LEFT JOIN carecore_care_units cu ON cu.id = p.primary_care_unit_id
      WHERE p.organization_id = ${actor.organizationId} AND u.active = TRUE
      ORDER BY u.display_name
    ` as unknown as Array<{ id: string; display_name: string; role: string; job_title: string; care_unit_name: string }>;
    const selectedId = conversations.some((conversation) => conversation.id === requestedId) ? requestedId! : conversations[0]?.id ?? null;
    if (selectedId) await sql`UPDATE carecore_conversation_members SET last_read_at = NOW() WHERE conversation_id = ${selectedId} AND user_id = ${actor.id}`;
    const messages = selectedId ? await sql`
      SELECT m.id, m.body, m.created_at, m.edited_at, m.author_user_id, COALESCE(u.display_name, 'Unbekannt') AS author_name
      FROM carecore_messages m
      LEFT JOIN carecore_users u ON u.id = m.author_user_id
      WHERE m.conversation_id = ${selectedId}
      ORDER BY m.created_at ASC
    ` as unknown as Array<{ id: string; body: string; created_at: string; edited_at: string | null; author_user_id: string | null; author_name: string }> : [];
    const memberMap = new Map<string, typeof members>(); members.forEach((member) => memberMap.set(member.conversation_id, [...(memberMap.get(member.conversation_id) ?? []), member]));
    const lastMap = new Map(lastMessages.map((message) => [message.conversation_id, message]));
    const unreadMap = new Map(unread.map((item) => [item.conversation_id, Number(item.unread_count)]));
    return NextResponse.json({
      actor: { id: actor.id, displayName: actor.display_name },
      conversations: conversations.map((conversation) => ({ ...conversation, members: memberMap.get(conversation.id) ?? [], lastMessage: lastMap.get(conversation.id) ?? null, unreadCount: unreadMap.get(conversation.id) ?? 0 })),
      people,
      selectedId,
      messages,
    });
  } catch (cause) {
    console.error("Conversation request failed", cause);
    return error("Nachrichten konnten nicht geladen werden.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const active = await context();
    if (!active) return error("Bitte erneut anmelden.", 401);
    const { actor, sql } = active;
    const body = await request.json() as { action?: string; conversationId?: string; text?: string; title?: string; kind?: string; memberIds?: string[] };
    if (body.action === "message") {
      const text = body.text?.trim();
      if (!body.conversationId || !text) return error("Die Nachricht darf nicht leer sein.");
      const membership = await sql`SELECT conversation_id FROM carecore_conversation_members WHERE conversation_id = ${body.conversationId} AND user_id = ${actor.id} LIMIT 1`;
      if (!membership[0]) return error("Kein Zugriff auf diese Unterhaltung.", 403);
      await sql`INSERT INTO carecore_messages (id, conversation_id, author_user_id, body) VALUES (${randomUUID()}, ${body.conversationId}, ${actor.id}, ${text.slice(0, 5000)})`;
      await sql`UPDATE carecore_conversations SET updated_at = NOW() WHERE id = ${body.conversationId}`;
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    if (body.action === "conversation") {
      const kind = body.kind === "direct" ? "direct" : "group";
      const selectedMembers = [...new Set((body.memberIds ?? []).filter((id): id is string => typeof id === "string"))].filter((id) => id !== actor.id);
      if (!selectedMembers.length) return error(kind === "direct" ? "Wähle eine Person für die Direktnachricht aus." : "Wähle mindestens eine Person für die Gruppe aus.");
      const available = await Promise.all(selectedMembers.map(async (userId) => {
        const rows = await sql`SELECT u.id FROM carecore_users u INNER JOIN carecore_user_profiles p ON p.user_id = u.id WHERE p.organization_id = ${actor.organizationId} AND u.active = TRUE AND u.id = ${userId} LIMIT 1`;
        return rows[0]?.id;
      }));
      if (available.length !== selectedMembers.length) return error("Eine ausgewählte Person ist nicht verfügbar.");
      const id = randomUUID();
      const title = kind === "direct" ? null : body.title?.trim().slice(0, 180);
      if (kind === "group" && !title) return error("Bitte gib der Gruppe einen Namen.");
      await sql`INSERT INTO carecore_conversations (id, organization_id, title, kind, created_by) VALUES (${id}, ${actor.organizationId}, ${title}, ${kind}, ${actor.id})`;
      for (const userId of [actor.id, ...selectedMembers]) await sql`INSERT INTO carecore_conversation_members (conversation_id, user_id, last_read_at) VALUES (${id}, ${userId}, ${userId === actor.id ? new Date() : null})`;
      return NextResponse.json({ id }, { status: 201 });
    }
    return error("Unbekannte Aktion.");
  } catch (cause) {
    console.error("Conversation update failed", cause);
    return error("Die Nachricht konnte nicht gespeichert werden.", 500);
  }
}

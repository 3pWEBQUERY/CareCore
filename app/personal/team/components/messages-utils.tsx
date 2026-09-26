"use client";

export type Member = { conversation_id: string; user_id: string; display_name: string; role: string };

export type Person = { id: string; display_name: string; role: string; job_title: string; care_unit_name: string };

export type Message = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author_user_id: string | null;
  author_name: string;
};

export type Conversation = {
  id: string;
  title: string | null;
  kind: "direct" | "group" | "channel";
  updated_at: string;
  members: Member[];
  lastMessage: { body: string; created_at: string; author_name: string | null } | null;
  unreadCount: number;
};

export type ChatData = {
  actor: { id: string; displayName: string };
  conversations: Conversation[];
  people: Person[];
  selectedId: string | null;
  messages: Message[];
};

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function time(value: string) {
  return new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

export function titleFor(conversation: Conversation, actorId: string) {
  if (conversation.kind !== "direct") return conversation.title || "Team-Unterhaltung";
  return (
    conversation.members
      .filter((member) => member.user_id !== actorId)
      .map((member) => member.display_name)
      .join(", ") || "Direktnachricht"
  );
}

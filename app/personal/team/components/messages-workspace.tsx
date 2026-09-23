"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CaretRight, ChatsCircle, Check, MagnifyingGlass, PaperPlaneTilt, Plus, UsersThree, X } from "@phosphor-icons/react";
import ModulePageShell from "@/app/components/module-page-shell";

type Member = { conversation_id: string; user_id: string; display_name: string; role: string };
type Person = { id: string; display_name: string; role: string; job_title: string; care_unit_name: string };
type Message = { id: string; body: string; created_at: string; edited_at: string | null; author_user_id: string | null; author_name: string };
type Conversation = { id: string; title: string | null; kind: "direct" | "group" | "channel"; updated_at: string; members: Member[]; lastMessage: { body: string; created_at: string; author_name: string | null } | null; unreadCount: number };
type ChatData = { actor: { id: string; displayName: string }; conversations: Conversation[]; people: Person[]; selectedId: string | null; messages: Message[] };

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function time(value: string) { return new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function dateLabel(value: string) { return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit" }).format(new Date(value)); }
function titleFor(conversation: Conversation, actorId: string) {
  if (conversation.kind !== "direct") return conversation.title || "Team-Unterhaltung";
  return conversation.members.filter((member) => member.user_id !== actorId).map((member) => member.display_name).join(", ") || "Direktnachricht";
}

export default function MessagesWorkspace() {
  const [data, setData] = useState<ChatData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [editor, setEditor] = useState<"direct" | "group" | null>(null);
  const [groupTitle, setGroupTitle] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (conversationId?: string | null) => {
    const response = await fetch(`/api/conversations${conversationId ? `?conversationId=${conversationId}` : ""}`, { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { setNotice(payload?.error || "Nachrichten konnten nicht geladen werden."); return; }
    setData(payload); setSelectedId(payload.selectedId);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => { void load(selectedId); }, 12000);
    return () => window.clearInterval(timer);
  }, [load, selectedId]);

  const selected = data?.conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const filtered = useMemo(() => (data?.conversations ?? []).filter((conversation) => {
    const haystack = `${titleFor(conversation, data?.actor.id ?? "")} ${conversation.lastMessage?.body ?? ""}`.toLocaleLowerCase("de-CH");
    return haystack.includes(query.trim().toLocaleLowerCase("de-CH"));
  }), [data, query]);

  function selectConversation(id: string) { setText(""); void load(id); }
  function openEditor(kind: "direct" | "group", personId?: string) { setEditor(kind); setGroupTitle(""); setMemberIds(personId ? [personId] : []); setNotice(""); }
  function toggleMember(id: string) { setMemberIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }

  async function createConversation(event: FormEvent) {
    event.preventDefault(); if (!editor) return;
    setBusy(true); setNotice("");
    const response = await fetch("/api/conversations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "conversation", kind: editor, title: groupTitle, memberIds }) });
    const result = await response.json().catch(() => null); setBusy(false);
    if (!response.ok) { setNotice(result?.error || "Unterhaltung konnte nicht erstellt werden."); return; }
    setEditor(null); await load(result.id);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault(); if (!selectedId || !text.trim()) return;
    setBusy(true); setNotice("");
    const response = await fetch("/api/conversations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "message", conversationId: selectedId, text }) });
    const result = await response.json().catch(() => null); setBusy(false);
    if (!response.ok) { setNotice(result?.error || "Nachricht konnte nicht gesendet werden."); return; }
    setText(""); await load(selectedId);
  }

  return <ModulePageShell activeModule="messenger" activeChild="Nachrichten" pageClass="messages-page">{() => <main className="workspace messages-workspace">
    <header className="messages-heading">
      <div><p className="eyebrow">CareCore Team</p><h1>Nachrichten</h1><p>Direkt im Team abstimmen, Gruppen organisieren und den Pflegealltag nachvollziehbar begleiten.</p></div>
      <div className="messages-heading-actions"><button className="secondary-button" onClick={() => openEditor("direct")}><ChatsCircle weight="bold"/> Neue Nachricht</button><button className="primary-button" onClick={() => openEditor("group")}><Plus weight="bold"/> Gruppe erstellen</button></div>
    </header>

    {notice && <div className="messages-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Hinweis schließen"><X/></button></div>}
    <section className="messages-layout" aria-label="Teamnachrichten">
      <aside className="messages-conversations">
        <div className="messages-panel-heading"><div><p className="eyebrow">Unterhaltungen</p><strong>{data ? `${data.conversations.length} aktiv` : "Laden…"}</strong></div></div>
        <label className="messages-search"><MagnifyingGlass/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chats durchsuchen"/></label>
        <div className="messages-conversation-list">
          {filtered.map((conversation) => <button key={conversation.id} className={`messages-conversation ${conversation.id === selectedId ? "is-active" : ""}`} onClick={() => selectConversation(conversation.id)}>
            <span className={`messages-avatar ${conversation.kind !== "direct" ? "is-group" : ""}`}>{conversation.kind === "direct" ? initials(titleFor(conversation, data?.actor.id ?? "")) : <UsersThree weight="bold"/>}</span>
            <span className="messages-conversation-copy"><strong>{titleFor(conversation, data?.actor.id ?? "")}</strong><small>{conversation.lastMessage ? `${conversation.lastMessage.author_name || ""}: ${conversation.lastMessage.body}` : "Noch keine Nachricht"}</small></span>
            <span className="messages-conversation-meta"><time>{conversation.lastMessage ? time(conversation.lastMessage.created_at) : dateLabel(conversation.updated_at)}</time>{conversation.unreadCount > 0 && <b>{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}</b>}</span>
          </button>)}
          {data && !filtered.length && <p className="messages-empty-list">Keine Unterhaltung gefunden.</p>}
        </div>
      </aside>

      <section className="messages-thread">
        {selected && data ? <>
          <header className="messages-thread-heading"><span className={`messages-avatar ${selected.kind !== "direct" ? "is-group" : ""}`}>{selected.kind === "direct" ? initials(titleFor(selected, data.actor.id)) : <UsersThree weight="bold"/>}</span><div><strong>{titleFor(selected, data.actor.id)}</strong><small>{selected.kind === "direct" ? "Direktnachricht" : `${selected.members.length} Mitglieder · ${selected.kind === "channel" ? "Kanal" : "Gruppe"}`}</small></div></header>
          <div className="messages-feed">{data.messages.map((message, index) => <div key={message.id} className={`message-row ${message.author_user_id === data.actor.id ? "is-own" : ""}`}>
            {(index === 0 || dateLabel(data.messages[index - 1].created_at) !== dateLabel(message.created_at)) && <p className="message-date">{dateLabel(message.created_at)}</p>}
            <article className="message-bubble"><small>{message.author_user_id === data.actor.id ? "Du" : message.author_name}</small><p>{message.body}</p><time>{time(message.created_at)}{message.edited_at ? " · bearbeitet" : ""}</time></article>
          </div>)}{!data.messages.length && <div className="messages-thread-empty"><ChatsCircle/><strong>Starte die Unterhaltung</strong><p>Schreibe eine erste Nachricht an dein Team.</p></div>}</div>
          <form className="messages-composer" onSubmit={sendMessage}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Nachricht schreiben…" maxLength={5000}/><button className="primary-button" disabled={busy || !text.trim()} aria-label="Nachricht senden"><PaperPlaneTilt weight="fill"/><span>Senden</span></button></form>
        </> : <div className="messages-thread-empty"><ChatsCircle/><strong>Wähle eine Unterhaltung</strong><p>Oder beginne eine neue Direktnachricht.</p><button className="primary-button" onClick={() => openEditor("direct")}><Plus/> Neue Nachricht</button></div>}
      </section>

      <aside className="messages-people"><div className="messages-panel-heading"><div><p className="eyebrow">Team</p><strong>Erreichbare Mitarbeitende</strong></div></div><div className="messages-people-list">{(data?.people ?? []).filter((person) => person.id !== data?.actor.id).map((person) => <button key={person.id} onClick={() => openEditor("direct", person.id)}><span className="messages-avatar">{initials(person.display_name)}</span><span><strong>{person.display_name}</strong><small>{person.job_title || person.role}{person.care_unit_name ? ` · ${person.care_unit_name}` : ""}</small></span><CaretRight/></button>)}</div></aside>
    </section>

    {editor && <div className="messages-editor-backdrop" role="presentation"><form className="messages-editor" onSubmit={createConversation}><header><div><p className="eyebrow">{editor === "group" ? "Neue Gruppe" : "Neue Direktnachricht"}</p><h2>{editor === "group" ? "Teamgruppe erstellen" : "Mitarbeiter auswählen"}</h2><p>{editor === "group" ? "Lege einen gemeinsamen Raum für Absprachen an." : "Beginne eine vertrauliche Unterhaltung mit einem Teammitglied."}</p></div><button type="button" className="icon-button" onClick={() => setEditor(null)} aria-label="Schließen"><X/></button></header><div className="messages-editor-body">
      {editor === "group" && <label className="messages-field"><span>Gruppenname</span><input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="z. B. Übergabe Wohnbereich 2" maxLength={180} autoFocus/></label>}
      <div className="messages-editor-section"><div><strong>{editor === "group" ? "Mitglieder" : "Mitarbeiter"}</strong><small>{editor === "group" ? "Wähle alle Personen aus, die teilnehmen sollen." : "Wähle eine Person für die Direktnachricht."}</small></div><div className="messages-member-picker">{(data?.people ?? []).filter((person) => person.id !== data?.actor.id).map((person) => { const checked = memberIds.includes(person.id); return <button type="button" key={person.id} className={checked ? "is-selected" : ""} onClick={() => editor === "direct" ? setMemberIds([person.id]) : toggleMember(person.id)}><span className="messages-avatar">{initials(person.display_name)}</span><span><strong>{person.display_name}</strong><small>{person.job_title || person.role}</small></span><i>{checked && <Check weight="bold"/>}</i></button>; })}</div></div>
    </div><footer><button type="button" className="secondary-button" onClick={() => setEditor(null)}>Abbrechen</button><button className="primary-button" disabled={busy || !memberIds.length || (editor === "group" && !groupTitle.trim())}>{busy ? "Wird erstellt…" : editor === "group" ? "Gruppe erstellen" : "Chat starten"}</button></footer></form></div>}
  </main>}</ModulePageShell>;
}

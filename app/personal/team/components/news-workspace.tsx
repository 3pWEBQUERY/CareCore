"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";
import {
  EditorDialog,
  LoadError,
  ReasonDialog,
  requestJson,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import { personInitials } from "@/lib/tasks-shared";
import {
  CHANNEL_COLORS,
  POST_IMPORTANCE,
  type Channel,
  type ChannelColor,
  type Post,
  type PostImportance,
  type TeamNewsPayload,
} from "@/lib/team-news-shared";
import { ScheduleSelect } from "@/app/betrieb/components/operations-ui";
import { PersonalFrame, PersonalSummary, SearchField, relativeTime } from "../../components/personal-ui";

const FILTERS = ["Alle", "Ungelesen", "Wichtig", "Bestätigung offen", "Angeheftet"] as const;
type Filter = (typeof FILTERS)[number];
const COLOR_LABELS: Record<ChannelColor, string> = {
  blue: "Blau",
  green: "Grün",
  orange: "Orange",
  purple: "Violett",
  red: "Rot",
  gray: "Grau",
};
const NO_UNIT = "Kein Wohnbereich";

function postIcon(post: Post): ModuleIconName {
  if (post.importance === "critical") return "alert";
  if (post.requiresAck) return "check";
  if (post.pinned) return "sparkle";
  return "note";
}

function PostEditor({
  data,
  post,
  channelId,
  onClose,
  onSaved,
}: {
  data: TeamNewsPayload;
  post: Post | null;
  channelId: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const writable = data.channels.filter((channel) => channel.canPost);
  const [channel, setChannel] = useState(
    post?.channelId ?? writable.find((c) => c.id === channelId)?.id ?? writable[0]?.id ?? "",
  );
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [importance, setImportance] = useState<PostImportance>(post?.importance ?? "normal");
  const [requiresAck, setRequiresAck] = useState(post?.requiresAck ?? false);
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const channelName = data.channels.find((c) => c.id === channel)?.name ?? "Kanal wählen";
  return (
    <EditorDialog
      id="post-editor"
      eyebrow="CareCore Team · Neuigkeiten"
      title={post ? "Beitrag bearbeiten" : "Beitrag erstellen"}
      description="Teile eine Information mit deinem Arbeitsbereich. Dringende Beiträge und Lesebestätigungen benachrichtigen alle Mitglieder des Kanals."
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          if (post)
            await requestJson(`/api/team-news/posts/${post.id}`, {
              method: "POST",
              body: { action: "edit", title, body, importance, requiresAck },
            });
          else
            await requestJson("/api/team-news", {
              method: "POST",
              body: { channelId: channel, title, body, importance, requiresAck, pinned },
            });
          onSaved(post ? "Beitrag gespeichert" : `Beitrag in „${channelName}“ veröffentlicht`);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel={post ? "Speichern" : "Veröffentlichen"}
    >
      {!post && (
        <label>
          <span>Kanal</span>
          <ScheduleSelect
            label="Kanal"
            value={channelName}
            options={writable.map((c) => c.name)}
            onChange={(name) => setChannel(writable.find((c) => c.name === name)?.id ?? "")}
          />
        </label>
      )}
      <label>
        <span>Einordnung</span>
        <ScheduleSelect
          label="Einordnung"
          value={POST_IMPORTANCE[importance].label}
          options={Object.values(POST_IMPORTANCE).map((i) => i.label)}
          onChange={(label) =>
            setImportance(
              (Object.keys(POST_IMPORTANCE) as PostImportance[]).find((key) => POST_IMPORTANCE[key].label === label) ??
                "normal",
            )
          }
        />
      </label>
      <label className="area-editor-wide">
        <span>Titel</span>
        <input value={title} maxLength={180} required autoFocus onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="area-editor-wide">
        <span>Beitrag</span>
        <textarea
          rows={7}
          maxLength={10000}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Was sollen alle wissen? Was ändert sich, ab wann, was ist zu tun?"
        />
      </label>
      <fieldset className="area-editor-wide duty-assignment-options">
        <legend>Optionen</legend>
        <div className="area-service-options">
          <label className={requiresAck ? "selected" : ""}>
            <input type="checkbox" checked={requiresAck} onChange={(event) => setRequiresAck(event.target.checked)} />
            <span>Lesebestätigung verlangen</span>
          </label>
          {data.canManage && !post && (
            <label className={pinned ? "selected" : ""}>
              <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
              <span>Oben anheften</span>
            </label>
          )}
        </div>
      </fieldset>
    </EditorDialog>
  );
}

function ChannelEditor({
  data,
  onClose,
  onSaved,
}: {
  data: TeamNewsPayload;
  onClose: () => void;
  onSaved: (message: string, id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<ChannelColor>("blue");
  const [unitId, setUnitId] = useState("");
  const [managersOnly, setManagersOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <EditorDialog
      id="channel-editor"
      eyebrow="CareCore Team · Kanäle"
      title="Kanal anlegen"
      description="Kanäle bündeln Beiträge zu einem Thema oder Wohnbereich. Bei einem Wohnbereich treten dessen Mitarbeitende automatisch bei."
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          const result = await requestJson<{ id: string }>("/api/team-news/channels", {
            method: "POST",
            body: { name, description, color, careUnitId: unitId || null, managersOnly },
          });
          onSaved(`Kanal „${name}“ angelegt`, result.id);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel="Kanal anlegen"
    >
      <label>
        <span>Name</span>
        <input value={name} maxLength={80} required autoFocus onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        <span>Farbe</span>
        <ScheduleSelect
          label="Farbe"
          value={COLOR_LABELS[color]}
          options={CHANNEL_COLORS.map((c) => COLOR_LABELS[c])}
          onChange={(label) => setColor(CHANNEL_COLORS.find((c) => COLOR_LABELS[c] === label) ?? "blue")}
        />
      </label>
      <label className="area-editor-wide">
        <span>Wohnbereich (optional)</span>
        <ScheduleSelect
          label="Wohnbereich"
          value={data.careUnits.find((unit) => unit.id === unitId)?.name ?? NO_UNIT}
          options={[NO_UNIT, ...data.careUnits.map((unit) => unit.name)]}
          onChange={(value) => setUnitId(data.careUnits.find((unit) => unit.name === value)?.id ?? "")}
        />
      </label>
      <label className="area-editor-wide">
        <span>Beschreibung</span>
        <input value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <fieldset className="area-editor-wide duty-assignment-options">
        <legend>Schreibrechte</legend>
        <div className="area-service-options">
          <label className={managersOnly ? "selected" : ""}>
            <input type="checkbox" checked={managersOnly} onChange={(event) => setManagersOnly(event.target.checked)} />
            <span>Nur die Leitung darf schreiben</span>
          </label>
        </div>
      </fieldset>
    </EditorDialog>
  );
}

type Dialog = { kind: "post"; post: Post | null } | { kind: "channel" } | { kind: "archive"; post: Post };

function NewsView({
  showToast,
  dialog,
  setDialog,
  onData,
}: {
  showToast: ShowToast;
  dialog: Dialog | null;
  setDialog: (dialog: Dialog | null) => void;
  onData: (data: TeamNewsPayload | undefined, channelId: string | null) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const deepLink = params.get("post");
  const [channelId, setChannelId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("Alle");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(deepLink);
  const [now] = useState(() => Date.now());
  const news = useApiData<TeamNewsPayload>(`/api/team-news${channelId ? `?channelId=${channelId}` : ""}`);
  const { reload } = news;
  const data = news.data;
  useEffect(() => onData(data, channelId), [data, channelId, onData]);
  useEffect(() => {
    if (deepLink && data) document.getElementById(`post-${deepLink}`)?.scrollIntoView({ block: "center" });
  }, [deepLink, data]);
  useEffect(() => {
    const timer = window.setInterval(reload, 60_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const run = async (url: string, body: unknown, message?: string) => {
    try {
      await requestJson(url, { method: "POST", body });
      if (message) showToast(message);
      reload();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    }
  };

  const select = (post: Post) => {
    const next = selectedId === post.id ? null : post.id;
    setSelectedId(next);
    if (deepLink) router.replace(pathname, { scroll: false });
    if (next && !post.readAt && !post.requiresAck) void run(`/api/team-news/posts/${post.id}`, { action: "read" });
  };

  const posts = data?.posts ?? [];
  const needle = query.trim().toLocaleLowerCase("de-CH");
  const filtered = posts.filter((post) => {
    if (filter === "Ungelesen" && post.readAt) return false;
    if (filter === "Wichtig" && post.importance === "normal") return false;
    if (filter === "Bestätigung offen" && !(post.requiresAck && !post.acknowledgedAt)) return false;
    if (filter === "Angeheftet" && !post.pinned) return false;
    return (
      !needle ||
      `${post.title} ${post.body} ${post.authorName ?? ""} ${post.channelName}`
        .toLocaleLowerCase("de-CH")
        .includes(needle)
    );
  });
  const channels = data?.channels ?? [];
  const joined = channels.filter((channel) => channel.joined);
  const active = channels.find((channel) => channel.id === channelId) ?? null;
  const tabs: Array<Channel | null> = [null, ...joined, ...(active && !active.joined ? [active] : [])];
  const unread = posts.filter((post) => !post.readAt).length;

  return (
    <>
      <PersonalSummary
        items={[
          { icon: "note", value: String(data?.stats.postsThisWeek ?? "–"), label: "Beiträge diese Woche" },
          { icon: "team", value: String(data?.stats.joinedChannels ?? "–"), label: "aktive Kanäle", tone: "info" },
          { icon: "alert", value: String(data?.stats.unread ?? "–"), label: "ungelesen", tone: "attention" },
          {
            icon: "check",
            value: data?.stats.reach === null || !data ? "–" : `${data.stats.reach} %`,
            label: "Team erreicht (30 Tage)",
          },
        ]}
      />
      {news.error && <LoadError message={news.error} onRetry={reload} />}
      <div className="team-layout team-news-layout">
        <section className="card team-feed-card">
          <div className="team-feed-header">
            <div>
              <p className="eyebrow">{active ? `Kanal · ${active.members} Mitglieder` : "Hausweiter Austausch"}</p>
              <h2 className="card-title">{active ? active.name : "Neuigkeiten im Team"}</h2>
              <p className="card-subtitle">
                {active?.description ?? `${filtered.length} von ${posts.length} Beiträgen`}
              </p>
            </div>
            <SearchField label="Neuigkeiten durchsuchen" query={query} setQuery={setQuery} placeholder="Suchen…" />
          </div>
          <div className="team-channel-tabs" role="group" aria-label="Teamkanäle">
            {tabs.map((channel) => (
              <button
                className={(channel?.id ?? null) === channelId ? "active" : ""}
                type="button"
                key={channel?.id ?? "all"}
                aria-pressed={(channel?.id ?? null) === channelId}
                onClick={() => setChannelId(channel?.id ?? null)}
              >
                {channel ? channel.name : "Alle Beiträge"}
                {channel?.unread ? ` · ${channel.unread}` : ""}
              </button>
            ))}
          </div>
          {active && !active.isDefault && (
            <div className="team-channel-bar">
              <small>
                {active.joined
                  ? "Du bist Mitglied."
                  : "Du bist nicht Mitglied – Beiträge erscheinen nicht in deinem Feed."}
                {active.managersOnly ? " Nur die Leitung schreibt hier." : ""}
              </small>
              <button
                className="quiet-button"
                type="button"
                onClick={() =>
                  void run(
                    `/api/team-news/channels/${active.id}`,
                    { action: active.joined ? "leave" : "join" },
                    active.joined ? `„${active.name}“ verlassen` : `„${active.name}“ beigetreten`,
                  )
                }
              >
                {active.joined ? "Verlassen" : "Beitreten"}
              </button>
              {data?.canManage && (
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => {
                    setChannelId(null);
                    void run(
                      `/api/team-news/channels/${active.id}`,
                      { action: "archive" },
                      `„${active.name}“ archiviert`,
                    );
                  }}
                >
                  Archivieren
                </button>
              )}
            </div>
          )}
          {channels.some((channel) => channel.canPost) && (
            <div className="team-composer">
              <span className="team-composer-icon">
                <ModuleIcon name="note" />
              </span>
              <div>
                <strong>Was gibt es Neues?</strong>
                <small>Teile eine Information mit deinem Arbeitsbereich</small>
              </div>
              <button className="primary-button" type="button" onClick={() => setDialog({ kind: "post", post: null })}>
                <ModuleIcon name="plus" /> Beitrag
              </button>
            </div>
          )}
          <div className="team-filter-row operations-filter-buttons" aria-label="Einträge filtern">
            {FILTERS.map((item) => (
              <button
                className={filter === item ? "active" : ""}
                type="button"
                key={item}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
            {unread > 0 && (
              <button
                type="button"
                className="team-read-all"
                onClick={() => void run("/api/team-news/read-all", { channelId }, "Alle Beiträge als gelesen markiert")}
              >
                Alle gelesen
              </button>
            )}
          </div>
          <div className="team-post-list">
            {filtered.map((post) => {
              const importance = POST_IMPORTANCE[post.importance];
              const open = selectedId === post.id;
              const badge = post.requiresAck
                ? post.acknowledgedAt
                  ? { label: "Bestätigt", tone: "stable" }
                  : { label: "Bestätigen", tone: "attention" }
                : !post.readAt
                  ? { label: "Neu", tone: "info" }
                  : post.importance !== "normal"
                    ? importance
                    : { label: "Gelesen", tone: "stable" };
              const showStats = post.canEdit && post.audience > 0;
              return (
                <article
                  className={`team-post ${open ? "selected" : ""} ${post.readAt ? "" : "unread"} ${post.pinned ? "pinned" : ""}`}
                  key={post.id}
                  id={`post-${post.id}`}
                >
                  <button className="team-post-main" type="button" aria-expanded={open} onClick={() => select(post)}>
                    <span className={`governance-icon ${post.importance === "normal" ? "" : importance.tone}`}>
                      <ModuleIcon name={postIcon(post)} />
                    </span>
                    <span>
                      <strong>{post.title}</strong>
                      <small className={open ? "team-post-body" : ""}>
                        {open || post.body.length <= 180 ? post.body : `${post.body.slice(0, 180)} …`}
                      </small>
                      <em>
                        {post.pinned ? "Angeheftet · " : ""}
                        {relativeTime(post.createdAt, now)} · Kanal {post.channelName}
                        {post.editedAt ? " · bearbeitet" : ""}
                        {showStats
                          ? ` · ${post.requiresAck ? `${post.ackCount}/${post.audience} bestätigt` : `${post.readCount}/${post.audience} gelesen`}`
                          : ""}
                      </em>
                    </span>
                  </button>
                  <div className="team-post-side">
                    <span className={`status-badge ${badge.tone}`}>{badge.label}</span>
                    <small>{post.authorName ?? "Unbekannt"}</small>
                    {post.requiresAck && !post.acknowledgedAt ? (
                      <button
                        className="quiet-button"
                        type="button"
                        onClick={() =>
                          void run(`/api/team-news/posts/${post.id}`, { action: "ack" }, "Gelesen und bestätigt")
                        }
                      >
                        Bestätigen
                      </button>
                    ) : !post.readAt ? (
                      <button
                        className="quiet-button"
                        type="button"
                        onClick={() => void run(`/api/team-news/posts/${post.id}`, { action: "read" })}
                      >
                        Gelesen
                      </button>
                    ) : (
                      <button className="quiet-button" type="button" onClick={() => select(post)}>
                        {open ? "Schliessen" : "Öffnen"}
                      </button>
                    )}
                  </div>
                  {open && (post.canEdit || data?.canManage) && (
                    <div className="team-post-actions">
                      {post.isOwn && (
                        <button
                          className="quiet-button"
                          type="button"
                          onClick={() => setDialog({ kind: "post", post })}
                        >
                          Bearbeiten
                        </button>
                      )}
                      {data?.canManage && (
                        <button
                          className="quiet-button"
                          type="button"
                          onClick={() =>
                            void run(
                              `/api/team-news/posts/${post.id}`,
                              { action: post.pinned ? "unpin" : "pin" },
                              post.pinned ? "Beitrag gelöst" : "Beitrag angeheftet",
                            )
                          }
                        >
                          {post.pinned ? "Lösen" : "Anheften"}
                        </button>
                      )}
                      {post.canEdit && (
                        <button
                          className="quiet-button"
                          type="button"
                          onClick={() => setDialog({ kind: "archive", post })}
                        >
                          Archivieren
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {data && filtered.length === 0 && (
              <div className="resident-empty">
                <ModuleIcon name={posts.length ? "search" : "note"} />
                <strong>{posts.length ? "Keine Beiträge gefunden" : "Noch keine Beiträge"}</strong>
                <p>
                  {posts.length
                    ? "Suchbegriff oder Filter anpassen."
                    : "Hier erscheinen Neuigkeiten aus deinen Kanälen."}
                </p>
              </div>
            )}
            {!data && news.loading && <p className="list-hint">Neuigkeiten werden geladen …</p>}
          </div>
        </section>
        <aside className="team-side-stack">
          <section className="card team-channels-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Arbeitsbereich</p>
                <h2 className="card-title">Kanäle</h2>
              </div>
              {data?.canManage && (
                <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "channel" })}>
                  <ModuleIcon name="plus" /> Kanal
                </button>
              )}
            </div>
            <ul>
              {channels.map((channel) => (
                <li key={channel.id} className={channel.id === channelId ? "active" : ""}>
                  <span className={`team-channel-dot ${channel.color}`} />
                  <button type="button" className="team-channel-open" onClick={() => setChannelId(channel.id)}>
                    <strong>{channel.name}</strong>
                    <small>
                      {channel.members} {channel.members === 1 ? "Mitglied" : "Mitglieder"}
                      {channel.joined
                        ? channel.unread
                          ? ` · ${channel.unread} neu`
                          : " · aktuell"
                        : " · nicht beigetreten"}
                    </small>
                  </button>
                  {channel.joined ? (
                    <ModuleIcon name="chevron" />
                  ) : (
                    <button
                      type="button"
                      className="team-channel-join"
                      onClick={() =>
                        void run(
                          `/api/team-news/channels/${channel.id}`,
                          { action: "join" },
                          `„${channel.name}“ beigetreten`,
                        )
                      }
                    >
                      Beitreten
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="card team-duty-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Jetzt</p>
                <h2 className="card-title">Im Dienst</h2>
              </div>
              <span className="status-badge stable">
                {(data?.onDuty ?? []).filter((person) => person.state === "present").length} aktiv
              </span>
            </div>
            <div className="team-duty-list">
              {(data?.onDuty ?? []).map((person) => (
                <DutyRow
                  key={person.userId}
                  name={person.name}
                  detail={person.detail}
                  present={person.state === "present"}
                />
              ))}
            </div>
            {data && !data.onDuty.length && (
              <p className="list-hint team-duty-empty">Gerade ist niemand eingecheckt.</p>
            )}
          </section>
        </aside>
      </div>
      {data && dialog?.kind === "post" && (
        <PostEditor
          data={data}
          post={dialog.post}
          channelId={channelId}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            showToast(message);
            reload();
          }}
        />
      )}
      {data && dialog?.kind === "channel" && (
        <ChannelEditor
          data={data}
          onClose={() => setDialog(null)}
          onSaved={(message, id) => {
            setDialog(null);
            showToast(message);
            setChannelId(id);
          }}
        />
      )}
      {dialog?.kind === "archive" && (
        <ReasonDialog
          eyebrow="CareCore Team · Neuigkeiten"
          title="Beitrag archivieren"
          description={`„${dialog.post.title}“ wird aus dem Feed entfernt, bleibt aber im Protokoll nachvollziehbar.`}
          label="Grund"
          placeholder="z. B. veraltet, versehentlich veröffentlicht"
          submitLabel="Archivieren"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            await requestJson(`/api/team-news/posts/${dialog.post.id}`, {
              method: "POST",
              body: { action: "archive", reason },
            });
            setDialog(null);
            showToast("Beitrag archiviert");
            reload();
          }}
        />
      )}
    </>
  );
}

function DutyRow({ name, detail, present }: { name: string; detail: string; present: boolean }) {
  return (
    <>
      <span className="avatar">{personInitials(name)}</span>
      <span>
        <strong>{name}</strong>
        <small>{detail || "Dienst"}</small>
      </span>
      <span className={`team-duty-state ${present ? "" : "planned"}`}>{present ? "Im Dienst" : "Geplant"}</span>
    </>
  );
}

export default function NewsWorkspace() {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [canPost, setCanPost] = useState(false);
  const onData = useCallback(
    (data: TeamNewsPayload | undefined) => setCanPost(Boolean(data?.channels.some((c) => c.canPost))),
    [],
  );
  return (
    <PersonalFrame
      module="team"
      child="Neuigkeiten & Kanäle"
      view="teamNews"
      eyebrow="CareCore Team"
      title="Neuigkeiten & Kanäle"
      description="Updates, Absprachen und Fachdialoge im gesamten Haus."
      action={canPost ? { label: "Beitrag erstellen", onClick: () => setDialog({ kind: "post", post: null }) } : null}
    >
      {(showToast) => (
        // NewsView reads ?post= (useSearchParams), which needs a Suspense boundary on a static page.
        <Suspense fallback={null}>
          <NewsView showToast={showToast} dialog={dialog} setDialog={setDialog} onData={onData} />
        </Suspense>
      )}
    </PersonalFrame>
  );
}

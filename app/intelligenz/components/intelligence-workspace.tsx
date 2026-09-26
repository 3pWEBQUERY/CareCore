"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModulePageShell from "@/app/components/module-page-shell";
import { ModuleIcon, type ModuleIconName } from "@/app/components/module-icon";
import { useCareResident, useCareUnit, useWorkContext } from "@/app/components/care-context";
import { EditorDialog, formatDateTime, requestJson, useApiData } from "@/app/components/workspace-ui";
import { AI_TASKS, type AiDraft, type AiOverview, type AiTask } from "@/lib/ai-shared";

type IntelligenceView = "assistant" | "drafts";

const viewMeta: Record<IntelligenceView, { child: string; title: string; description: string }> = {
  assistant: {
    child: "Assistenz",
    title: "CareCore Assistenz",
    description: "Kontextbezogene Unterstützung für deine nächste Pflegeentscheidung.",
  },
  drafts: {
    child: "KI-Entwürfe",
    title: "KI-Entwürfe",
    description: "Vorschläge prüfen, anpassen und sicher in deine Dokumentation übernehmen.",
  },
};

const SUGGESTIONS: AiTask[] = ["handover", "risks", "documentation"];

export default function IntelligenceWorkspace({ view }: { view: IntelligenceView }) {
  const meta = viewMeta[view];
  return (
    <ModulePageShell
      activeModule="ai"
      activeChild={meta.child}
      pageClass={`intelligence-page intelligence-${view}`}
      locationSecondary="Gesamtes Haus · alle Wohnbereiche"
    >
      {(showToast) => (
        <main className="workspace intelligence-workspace">
          <section className="intelligence-heading page-heading">
            <div className="heading-copy">
              <p className="eyebrow">CareCore KI</p>
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>
            <span
              className="intelligence-trust"
              title="Bewohnende werden nur mit Kürzel, Alter und Zimmer übermittelt."
            >
              <ModuleIcon name="check" /> Pseudonymisiert · Freigabe durch dich
            </span>
          </section>
          {view === "assistant" ? <AssistantView /> : <DraftsView showToast={showToast} />}
        </main>
      )}
    </ModulePageShell>
  );
}

type Exchange = { id: string; task: AiTask; prompt: string; draft?: AiDraft; error?: string };

function AssistantView() {
  const router = useRouter();
  const context = useWorkContext();
  const [residentId] = useCareResident();
  const [storedUnitId] = useCareUnit();
  const unitId = storedUnitId ?? context?.profile.primaryCareUnitId ?? null;
  const resident = context?.residents.find((item) => item.id === residentId) ?? null;
  const overview = useApiData<AiOverview>(`/api/ai${unitId ? `?careUnitId=${unitId}` : ""}`);
  const [scope, setScope] = useState<"resident" | "unit">("resident");
  const useResident = scope === "resident" && Boolean(resident);
  const [task, setTask] = useState<AiTask>("handover");
  const [prompt, setPrompt] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const configured = overview.data?.configured ?? true;
  const firstName = context?.profile.displayName.split(" ")[0] ?? "";
  const info = overview.data?.context;

  const send = async () => {
    const chosen = task;
    const exchange: Exchange = { id: String(Date.now()), task: chosen, prompt: prompt.trim() };
    setExchanges((current) => [...current, exchange]);
    setPrompt("");
    setBusy(true);
    try {
      const { draft } = await requestJson<{ draft: AiDraft }>("/api/ai/drafts", {
        method: "POST",
        body: {
          task: chosen,
          prompt: exchange.prompt,
          residentId: useResident ? resident?.id : null,
          careUnitId: useResident ? null : unitId,
        },
      });
      setExchanges((current) => current.map((item) => (item.id === exchange.id ? { ...item, draft } : item)));
      overview.reload();
    } catch (reason) {
      setExchanges((current) =>
        current.map((item) => (item.id === exchange.id ? { ...item, error: (reason as Error).message } : item)),
      );
    } finally {
      setBusy(false);
    }
  };
  const canSend = !busy && configured && (task !== "question" || prompt.trim().length >= 3);

  return (
    <div className="intelligence-layout">
      <section className="card intelligence-chat">
        <div className="card-header">
          <div>
            <p className="eyebrow">Assistenz</p>
            <h2 className="card-title">Womit kann ich helfen?</h2>
            <p className="card-subtitle">
              {useResident
                ? `Bezieht sich auf ${resident?.name} (Bewohner in der Kopfzeile).`
                : `Bezieht sich auf ${info?.careUnit ?? "alle Wohnbereiche"}.`}
            </p>
          </div>
          <span className="intelligence-status" style={configured ? undefined : { color: "var(--attention)" }}>
            <i style={configured ? undefined : { background: "var(--attention)" }} />
            {!configured ? "Nicht eingerichtet" : busy ? "Schreibt …" : "Bereit"}
          </span>
        </div>
        <div className="intelligence-suggestions">
          {SUGGESTIONS.map((item) => (
            <button
              className={task === item ? "active" : ""}
              type="button"
              key={item}
              aria-pressed={task === item}
              onClick={() => setTask(item)}
            >
              <ModuleIcon name={AI_TASKS[item].icon as ModuleIconName} />
              {AI_TASKS[item].label}
            </button>
          ))}
          <button
            className={task === "question" ? "active" : ""}
            type="button"
            aria-pressed={task === "question"}
            onClick={() => setTask("question")}
          >
            <ModuleIcon name="ai" />
            Freie Frage
          </button>
        </div>
        <div className="intelligence-conversation" aria-live="polite">
          <div className="intelligence-message assistant">
            <span className="intelligence-avatar">
              <ModuleIcon name="ai" />
            </span>
            <p>
              {configured
                ? `Hallo${firstName ? ` ${firstName}` : ""}! Ich kann Übergaben strukturieren, Risiken hervorheben und Dokumentationsentwürfe vorbereiten – auf Basis der Daten in CareCore. Die finale Freigabe bleibt immer bei dir.`
                : "CareCore KI ist noch nicht eingerichtet. Die Administration muss dafür einen API-Schlüssel (ANTHROPIC_API_KEY) hinterlegen."}
            </p>
          </div>
          {exchanges.map((item) => (
            <div key={item.id} style={{ display: "contents" }}>
              <div className="intelligence-message user">
                <p>
                  {item.task === "question"
                    ? item.prompt
                    : `${AI_TASKS[item.task].label}${item.prompt ? ` · ${item.prompt}` : ""}`}
                </p>
              </div>
              <div className="intelligence-message assistant">
                <span className="intelligence-avatar">
                  <ModuleIcon name="ai" />
                </span>
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {item.draft
                    ? item.draft.content
                    : item.error
                      ? item.error
                      : "Einen Moment, ich werte die Daten aus …"}
                  {item.draft && (
                    <>
                      {"\n\n"}
                      <button
                        className="quiet-button"
                        type="button"
                        onClick={() => router.push(`/c/intelligenz/entwuerfe?draft=${item.draft?.id}`)}
                      >
                        Als Entwurf prüfen <ModuleIcon name="chevron" />
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
        <form
          className="intelligence-composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) void send();
          }}
        >
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={
              task === "question"
                ? "Frage oder Auftrag eingeben…"
                : task === "documentation"
                  ? "Stichworte zum Dienst (optional)…"
                  : "Zusätzliche Hinweise (optional)…"
            }
            aria-label="Auftrag an CareCore KI"
            maxLength={2000}
          />
          <button className="primary-button" type="submit" disabled={!canSend}>
            <ModuleIcon name="ai" />
            {busy ? "Arbeitet…" : "Senden"}
          </button>
        </form>
      </section>
      <aside className="intelligence-side">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Kontext</p>
              <h2 className="card-title">Aktuelle Auswahl</h2>
            </div>
          </div>
          <div className="intelligence-context">
            <strong>{useResident ? resident?.name : (info?.careUnit ?? "Alle Wohnbereiche")}</strong>
            {useResident ? (
              <span>
                {resident?.room} · {resident?.group}
              </span>
            ) : (
              <span>{info ? `${info.residents} Bewohner` : "Wird geladen …"}</span>
            )}
            <span>{info ? `${info.openTasks} offene Aufgaben` : ""}</span>
            <span>
              {info ? `${info.criticalVitals} kritische Vitalwerte · ${info.unreadHandovers} ungelesene Übergaben` : ""}
            </span>
            {resident && (
              <button
                className="quiet-button"
                type="button"
                onClick={() => setScope((current) => (current === "resident" ? "unit" : "resident"))}
              >
                {useResident ? "Ganzen Wohnbereich verwenden" : `Nur ${resident.name} verwenden`}
              </button>
            )}
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Hinweis</p>
              <h2 className="card-title">Sicher arbeiten</h2>
            </div>
          </div>
          <p className="intelligence-note">
            KI-Vorschläge sind Entwürfe und werden erst nach deiner Prüfung in CareCore gespeichert. Bewohnende werden
            nur mit Kürzel, Alter und Zimmer übermittelt.
            {overview.data?.pending ? ` ${overview.data.pending} Entwürfe warten auf Prüfung.` : ""}
          </p>
        </section>
      </aside>
    </div>
  );
}

const SAVE_LABEL = (draft: AiDraft) =>
  draft.task === "documentation" && draft.residentId
    ? "In Pflegebericht übernehmen"
    : draft.task === "handover"
      ? "Als Übergabe speichern"
      : "Als geprüft übernehmen";

function DraftsView({ showToast }: { showToast: (message: string) => void }) {
  const drafts = useApiData<{ drafts: AiDraft[] }>("/api/ai/drafts");
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("draft"),
  );
  const list = drafts.data?.drafts ?? [];
  const pending = list.filter((draft) => draft.status === "draft" || draft.status === "reviewed");
  const open = list.find((draft) => draft.id === openId) ?? null;

  return (
    <div className="intelligence-layout">
      <section className="card intelligence-drafts">
        <div className="operations-toolbar">
          <div>
            <p className="eyebrow">Prüfwarteschlange</p>
            <h2 className="card-title">Entwürfe zur Freigabe</h2>
            <p className="card-subtitle">
              {drafts.loading && !drafts.data
                ? "Wird geladen …"
                : drafts.error
                  ? drafts.error
                  : `${pending.length} Vorschl${pending.length === 1 ? "ag wartet" : "äge warten"} auf deine Entscheidung`}
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={drafts.reload}>
            Aktualisieren
          </button>
        </div>
        <div className="intelligence-draft-list">
          {list.map((draft) => {
            const done = draft.status === "accepted" || draft.status === "discarded";
            return (
              <article key={draft.id}>
                <span className={`governance-icon ${done ? (draft.status === "accepted" ? "stable" : "") : ""}`}>
                  <ModuleIcon name={done ? (draft.status === "accepted" ? "check" : "close") : "sparkle"} />
                </span>
                <span>
                  <strong>
                    {AI_TASKS[draft.task].label} · {draft.residentName ?? "Wohnbereich"}
                  </strong>
                  <small>{draft.content.slice(0, 110).replace(/\s+/g, " ")}…</small>
                  <em>
                    {formatDateTime(draft.createdAt)} · {draft.requestedBy ?? "CareCore KI"}
                    {draft.status === "accepted"
                      ? ` · übernommen von ${draft.reviewedBy}`
                      : draft.status === "discarded"
                        ? ` · verworfen von ${draft.reviewedBy}`
                        : draft.status === "reviewed"
                          ? " · bearbeitet"
                          : ""}
                  </em>
                </span>
                <button className="quiet-button" type="button" onClick={() => setOpenId(draft.id)}>
                  {done ? "Ansehen" : "Prüfen"}
                </button>
              </article>
            );
          })}
          {drafts.data && !list.length && (
            <article>
              <span className="governance-icon">
                <ModuleIcon name="sparkle" />
              </span>
              <span>
                <strong>Noch keine Entwürfe</strong>
                <small>Entwürfe entstehen in der Assistenz und warten hier auf deine Prüfung.</small>
              </span>
            </article>
          )}
        </div>
      </section>
      <aside className="intelligence-side">
        <section className="card intelligence-review">
          <div className="card-header">
            <div>
              <p className="eyebrow">Freigabe</p>
              <h2 className="card-title">Prüfregeln</h2>
            </div>
          </div>
          <ul>
            <li>
              <ModuleIcon name="check" />
              Keine automatische Veröffentlichung
            </li>
            <li>
              <ModuleIcon name="check" />
              Änderungen bleiben nachvollziehbar
            </li>
            <li>
              <ModuleIcon name="check" />
              Fachliche Verantwortung bleibt beim Team
            </li>
          </ul>
        </section>
      </aside>
      {open && (
        <DraftReview
          key={open.id}
          draft={open}
          onClose={() => setOpenId(null)}
          onDone={(message) => {
            drafts.reload();
            setOpenId(null);
            showToast(message);
          }}
        />
      )}
    </div>
  );
}

function DraftReview({
  draft,
  onClose,
  onDone,
}: {
  draft: AiDraft;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [content, setContent] = useState(draft.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const done = draft.status === "accepted" || draft.status === "discarded";
  const act = async (action: "accept" | "discard" | "save") => {
    setSaving(true);
    setError("");
    try {
      await requestJson(`/api/ai/drafts/${draft.id}`, { method: "PATCH", body: { action, content } });
      onDone(
        action === "discard"
          ? "Entwurf verworfen"
          : action === "save"
            ? "Änderungen gespeichert"
            : draft.task === "documentation" && draft.residentId
              ? "In den Pflegebericht übernommen"
              : draft.task === "handover"
                ? "Als Übergabe gespeichert"
                : "Entwurf übernommen",
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <EditorDialog
      id="ai-draft"
      eyebrow="CareCore KI · Entwurf prüfen"
      title={`${AI_TASKS[draft.task].label} · ${draft.residentName ?? "Wohnbereich"}`}
      description={`Erstellt ${formatDateTime(draft.createdAt)}${draft.prompt ? ` · Hinweis: ${draft.prompt}` : ""}`}
      submitLabel={done ? "Schliessen" : SAVE_LABEL(draft)}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={() => (done ? onClose() : act("accept"))}
      extraActions={
        done ? undefined : (
          <>
            <button className="secondary-button" type="button" disabled={saving} onClick={() => void act("discard")}>
              Verwerfen
            </button>
            <button className="secondary-button" type="button" disabled={saving} onClick={() => void act("save")}>
              Änderungen speichern
            </button>
          </>
        )
      }
    >
      <label className="area-editor-wide">
        Text {done ? "" : "(vor dem Übernehmen prüfen und anpassen)"}
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={18}
          maxLength={10000}
          readOnly={done}
        />
      </label>
    </EditorDialog>
  );
}

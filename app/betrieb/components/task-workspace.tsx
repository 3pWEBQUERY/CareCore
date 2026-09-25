"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleIcon } from "@/app/components/module-page-shell";
import {
  EditorDialog,
  LoadError,
  ReasonDialog,
  formatDateTime,
  requestJson,
  timeInZurich,
  todayInZurich,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import {
  TASK_PRIORITIES,
  TASK_RECURRENCE,
  TASK_STATUS,
  personInitials,
  type Task,
  type TasksPayload,
} from "@/lib/tasks-shared";
import {
  OPERATIONS_CHANGED,
  OperationsFrame,
  ScheduleSelect,
  Summary,
  notifyOperationsChanged,
  type Tone,
} from "./operations-ui";
import { TaskEditor, useTaskToggle } from "./task-parts";

const zurichDay = (value: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date(value));
const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", timeZone: "Europe/Zurich" });

function statusLabel(task: Task) {
  if (task.status === "open" && task.overdue) return "Überfällig";
  return TASK_STATUS[task.status];
}
function statusTone(task: Task): Tone | "archived" {
  if (task.status === "completed") return "stable";
  if (task.status === "cancelled") return "archived";
  if (task.overdue) return "critical";
  return TASK_PRIORITIES[task.priority].tone === "stable" ? "info" : (TASK_PRIORITIES[task.priority].tone as Tone);
}

const ALL_PEOPLE = "Alle Personen";
const UNASSIGNED = "Nicht zugewiesen";

function TaskDetailDialog({
  task,
  canWrite,
  onClose,
  onEdit,
  onToggle,
  onChanged,
  showToast,
}: {
  task: Task;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onChanged: (message: string) => void;
  showToast: ShowToast;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const setStatus = async (status: "open" | "in_progress", message: string) => {
    setSaving(true);
    setError("");
    try {
      await requestJson(`/api/tasks/${task.id}/status`, { method: "POST", body: { status } });
      notifyOperationsChanged();
      onChanged(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  };
  const active = task.status === "open" || task.status === "in_progress";
  if (cancelling)
    return (
      <ReasonDialog
        eyebrow="CareCore Tasks"
        title="Aufgabe abbrechen"
        description={`„${task.title}“ wird nicht mehr durchgeführt. Die Aufgabe bleibt mit Begründung nachvollziehbar.`}
        label="Grund"
        placeholder="z. B. ärztlich abgesetzt, Bewohner ausgetreten, doppelt erfasst"
        submitLabel="Aufgabe abbrechen"
        danger
        onClose={() => setCancelling(false)}
        onConfirm={async (reason) => {
          await requestJson(`/api/tasks/${task.id}/status`, { method: "POST", body: { status: "cancelled", reason } });
          notifyOperationsChanged();
          showToast("Aufgabe abgebrochen");
          onChanged("Aufgabe abgebrochen");
        }}
      />
    );
  return (
    <EditorDialog
      id="task-detail"
      eyebrow={`CareCore Tasks · ${task.category}`}
      title={task.title}
      description={task.description || undefined}
      onClose={onClose}
      onSubmit={() => {
        if (!canWrite || task.status === "cancelled") onClose();
        else if (task.status === "completed") void setStatus("open", "Aufgabe wieder geöffnet");
        else onToggle();
      }}
      saving={saving}
      error={error}
      submitLabel={
        !canWrite || task.status === "cancelled"
          ? "Schliessen"
          : task.status === "completed"
            ? "Wieder öffnen"
            : "Als erledigt markieren"
      }
      extraActions={
        canWrite && active ? (
          <>
            {task.canEdit && (
              <button className="quiet-button" type="button" onClick={() => setCancelling(true)} disabled={saving}>
                Aufgabe abbrechen
              </button>
            )}
            {task.canEdit && (
              <button className="quiet-button" type="button" onClick={onEdit} disabled={saving}>
                Bearbeiten
              </button>
            )}
            <button
              className="quiet-button"
              type="button"
              disabled={saving}
              onClick={() =>
                void (task.status === "open"
                  ? setStatus("in_progress", "Aufgabe in Bearbeitung")
                  : setStatus("open", "Aufgabe wieder offen"))
              }
            >
              {task.status === "open" ? "Beginnen" : "Zurück auf offen"}
            </button>
          </>
        ) : null
      }
    >
      <dl className="area-editor-wide task-detail-list">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`status-badge ${statusTone(task)}`}>{statusLabel(task)}</span>
          </dd>
        </div>
        <div>
          <dt>Priorität</dt>
          <dd>{TASK_PRIORITIES[task.priority].label}</dd>
        </div>
        <div>
          <dt>Fällig</dt>
          <dd>{task.dueAt ? formatDateTime(task.dueAt) : "Ohne Termin"}</dd>
        </div>
        <div>
          <dt>Wiederholung</dt>
          <dd>{TASK_RECURRENCE[task.recurrence]}</dd>
        </div>
        <div>
          <dt>Bezug</dt>
          <dd>
            {task.residentName
              ? `${task.residentName}${task.room ? ` · ${task.room}` : ""}`
              : (task.careUnit ?? "Ohne Bewohnerbezug")}
          </dd>
        </div>
        <div>
          <dt>Verantwortlich</dt>
          <dd>{task.assigneeName ?? "Nicht zugewiesen"}</dd>
        </div>
        <div>
          <dt>Erstellt</dt>
          <dd>
            {formatDateTime(task.createdAt)} · {task.creatorName ?? "unbekannt"}
          </dd>
        </div>
        <div>
          <dt>Optionen</dt>
          <dd>
            {[
              task.teamVisible ? "Im Team sichtbar" : "Privat",
              task.remind ? "Erinnerung" : null,
              task.documentOnCompletion ? "Dokumentationspflicht" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </dd>
        </div>
        {task.completedAt && (
          <div className="wide">
            <dt>Erledigt</dt>
            <dd>
              {formatDateTime(task.completedAt)} · {task.completedByName ?? "unbekannt"}
              {task.completionNote ? ` – ${task.completionNote}` : ""}
            </dd>
          </div>
        )}
        {task.cancelReason && (
          <div className="wide">
            <dt>Abgebrochen</dt>
            <dd>{task.cancelReason}</dd>
          </div>
        )}
      </dl>
    </EditorDialog>
  );
}

function TaskView({
  team,
  showToast,
  data,
  reload,
  onEdit,
}: {
  team: boolean;
  showToast: ShowToast;
  data: ReturnType<typeof useApiData<TasksPayload>>;
  reload: () => void;
  onEdit: (task: Task) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const detailId = params.get("task");
  const [filter, setFilter] = useState("Alle");
  const [person, setPerson] = useState(ALL_PEOPLE);
  const [query, setQuery] = useState("");
  const payload = data.data;
  const tasks = useMemo(() => payload?.tasks ?? [], [payload]);
  const today = todayInZurich();
  const { toggle, dialog } = useTaskToggle(showToast, reload);
  const detail = detailId ? tasks.find((task) => task.id === detailId) : undefined;
  const setDetail = (id: string | null) => router.replace(id ? `${pathname}?task=${id}` : pathname, { scroll: false });

  const visible = tasks.filter((task) => task.status !== "cancelled" || filter === "Abgebrochen");
  const filtered = visible.filter((task) => {
    const open = task.status === "open" || task.status === "in_progress";
    if (filter === "Offen" && task.status !== "open") return false;
    if (filter === "In Bearbeitung" && task.status !== "in_progress") return false;
    if (filter === "Erledigt" && task.status !== "completed") return false;
    if (filter === "Abgebrochen" && task.status !== "cancelled") return false;
    if (filter === "Überfällig" && !(open && task.overdue)) return false;
    if (filter === "Heute fällig" && !(open && task.dueAt && zurichDay(task.dueAt) === today)) return false;
    if (person === UNASSIGNED && task.assignedTo) return false;
    if (person !== ALL_PEOPLE && person !== UNASSIGNED && task.assigneeName !== person) return false;
    const needle = query.trim().toLocaleLowerCase("de-CH");
    if (
      needle &&
      !`${task.title} ${task.description} ${task.residentName ?? ""} ${task.category}`
        .toLocaleLowerCase("de-CH")
        .includes(needle)
    )
      return false;
    return true;
  });
  const openTasks = visible.filter((task) => task.status === "open" || task.status === "in_progress");
  const filters = team
    ? ["Alle", "Offen", "In Bearbeitung", "Überfällig", "Erledigt", "Abgebrochen"]
    : ["Alle", "Offen", "Heute fällig", "Überfällig", "Erledigt"];

  return (
    <>
      <Summary
        items={[
          {
            icon: "tasks",
            value: String(openTasks.length),
            label: team ? "offene Aufgaben im Team" : "offene Aufgaben für dich",
          },
          {
            icon: "alert",
            value: String(openTasks.filter((task) => task.priority === "high" || task.priority === "critical").length),
            label: "dringend",
            tone: "critical",
          },
          {
            icon: "calendar",
            value: String(openTasks.filter((task) => task.dueAt && zurichDay(task.dueAt) <= today).length),
            label: "heute fällig oder überfällig",
            tone: "attention",
          },
          {
            icon: "check",
            value: String(visible.filter((task) => task.status === "completed").length),
            label: "erledigt (7 Tage)",
            tone: "info",
          },
        ]}
      />
      <section className="card operations-list-card">
        <div className="operations-toolbar task-toolbar">
          <div>
            <h2 className="card-title">{team ? "Aufgaben im Team" : "Deine Aufgaben"}</h2>
            <p className="card-subtitle">
              {filtered.length} {filtered.length === 1 ? "Aufgabe" : "Aufgaben"} sichtbar
            </p>
          </div>
          <div className="operations-filter-buttons">
            {filters.map((item) => (
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
          </div>
        </div>
        {team && (
          <div className="task-subbar">
            <ScheduleSelect
              label="Person"
              value={person}
              options={[ALL_PEOPLE, UNASSIGNED, ...(payload?.people ?? []).map((p) => p.name)]}
              onChange={setPerson}
            />
            <label className="resident-search">
              <ModuleIcon name="search" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titel, Bewohner oder Kategorie"
                aria-label="Aufgaben durchsuchen"
              />
            </label>
          </div>
        )}
        {data.error && <LoadError message={data.error} onRetry={reload} />}
        <div className="task-list">
          {filtered.map((task) => {
            const done = task.status === "completed";
            const inactive = done || task.status === "cancelled";
            const tone: Tone =
              task.priority === "critical" ? "critical" : task.priority === "high" ? "attention" : "info";
            return (
              <article
                className={`task-row ${inactive ? "complete" : ""} ${task.overdue ? "overdue" : ""}`}
                key={task.id}
              >
                <button
                  className="task-check"
                  type="button"
                  disabled={!payload?.canWrite || task.status === "cancelled"}
                  aria-label={`${task.title} ${done ? "wieder öffnen" : "erledigt markieren"}`}
                  onClick={() => void toggle({ ...task, done })}
                >
                  <ModuleIcon name={done ? "check" : task.status === "cancelled" ? "close" : "plus"} />
                </button>
                <time>
                  {task.dueAt ? timeInZurich(new Date(task.dueAt)) : "—"}
                  {task.dueAt && zurichDay(task.dueAt) !== today && <small>{shortDate(task.dueAt)}</small>}
                </time>
                <span className={`operations-timeline-icon ${tone}`}>
                  <ModuleIcon name="tasks" />
                </span>
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {[
                      task.residentName ? `${task.residentName}${task.room ? ` · ${task.room}` : ""}` : task.careUnit,
                      task.category,
                      task.recurrence !== "none" ? TASK_RECURRENCE[task.recurrence] : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
                {team ? (
                  <span className="task-owner">
                    <span className="avatar">{task.assigneeName ? personInitials(task.assigneeName) : "–"}</span>
                    {task.assigneeName ?? "Nicht zugewiesen"}
                  </span>
                ) : (
                  <span className="task-owner">{TASK_PRIORITIES[task.priority].label}</span>
                )}
                <span className={`status-badge ${statusTone(task)}`}>{statusLabel(task)}</span>
                <button className="quiet-button" type="button" onClick={() => setDetail(task.id)}>
                  Details
                </button>
              </article>
            );
          })}
          {!data.loading && !filtered.length && (
            <div className="resident-empty">
              <ModuleIcon name="check" />
              <strong>Keine Aufgaben in diesem Filter</strong>
              <p>Filter zurücksetzen oder neue Aufgabe erstellen.</p>
            </div>
          )}
          {data.loading && !payload && <p className="list-hint">Aufgaben werden geladen …</p>}
        </div>
      </section>
      {detail && payload && (
        <TaskDetailDialog
          key={`${detail.id}-${detail.status}`}
          task={detail}
          canWrite={payload.canWrite}
          showToast={showToast}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setDetail(null);
            onEdit(detail);
          }}
          onToggle={() => {
            setDetail(null);
            void toggle({ ...detail, done: false });
          }}
          onChanged={(message) => {
            setDetail(null);
            showToast(message);
            reload();
          }}
        />
      )}
      {detailId && payload && !detail && !data.loading && <MissingTask onClose={() => setDetail(null)} />}
      {dialog}
    </>
  );
}

function MissingTask({ onClose }: { onClose: () => void }) {
  return (
    <EditorDialog
      id="task-missing"
      eyebrow="CareCore Tasks"
      title="Aufgabe nicht in dieser Liste"
      description="Die Aufgabe ist erledigt, abgebrochen oder einer anderen Person zugewiesen. In den Teamaufgaben findest du alle sichtbaren Aufgaben."
      onClose={onClose}
      onSubmit={onClose}
      saving={false}
      error=""
      submitLabel="Schliessen"
    >
      {null}
    </EditorDialog>
  );
}

export default function TaskWorkspace({ team }: { team: boolean }) {
  const data = useApiData<TasksPayload>(`/api/tasks?scope=${team ? "team" : "mine"}`);
  const { reload } = data;
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null);
  useEffect(() => {
    window.addEventListener(OPERATIONS_CHANGED, reload);
    return () => window.removeEventListener(OPERATIONS_CHANGED, reload);
  }, [reload]);
  return (
    <OperationsFrame
      module="tasks"
      child={team ? "Teamaufgaben" : "Meine Aufgaben"}
      view={team ? "teamTasks" : "tasks"}
      eyebrow="CareCore Tasks"
      title={team ? "Teamaufgaben" : "Meine Aufgaben"}
      description={
        team
          ? "Aufgaben im Team verteilen, verfolgen und gemeinsam abschliessen."
          : "Alle offenen Aufgaben und Interventionen für deinen Dienst."
      }
      action={
        data.data?.canWrite
          ? { label: team ? "Teamaufgabe erstellen" : "Aufgabe erstellen", onClick: () => setEditor({ task: null }) }
          : null
      }
    >
      {(showToast) => (
        <>
          {/* TaskView reads ?task= (useSearchParams), which needs a Suspense boundary on a static page. */}
          <Suspense fallback={null}>
            <TaskView
              team={team}
              showToast={showToast}
              data={data}
              reload={reload}
              onEdit={(task) => setEditor({ task })}
            />
          </Suspense>
          {editor && (
            <TaskEditor
              task={editor.task}
              options={data.data}
              onClose={() => setEditor(null)}
              onSaved={(message) => {
                setEditor(null);
                showToast(message);
                reload();
              }}
            />
          )}
        </>
      )}
    </OperationsFrame>
  );
}

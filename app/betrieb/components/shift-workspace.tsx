"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";
import {
  EditorDialog,
  LoadError,
  formatDateTime,
  requestJson,
  timeInZurich,
  todayInZurich,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import {
  CHECKLIST,
  HANDOVER_STATUS,
  SHIFT_TYPES,
  type ChecklistKey,
  type HandoverStatus,
  type ShiftHistory,
  type ShiftHistoryEntry,
  type ShiftOverview,
  type ShiftType,
  type TimelineItem,
} from "@/lib/shift-shared";
import {
  OPERATIONS_CHANGED,
  OperationsFrame,
  ScheduleDatePicker,
  ScheduleSelect,
  Summary,
  formatScheduleDate,
  notifyOperationsChanged,
} from "./operations-ui";
import { TaskEditor, useTaskToggle } from "./task-parts";

type ShiftPageView = "shift" | "shiftHistory";

const TZ = "Europe/Zurich";
const clock = (value: string) => timeInZurich(new Date(value));
const zurichDay = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(value));
const longDate = (value: string) =>
  new Date(value).toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
const ALL_UNITS = "Gesamtes Haus";
const PLANNED = "Geplanter Dienst";

const kindIcon: Record<TimelineItem["kind"], ModuleIconName> = {
  task: "tasks",
  medication: "med",
  wound: "wounds",
  appointment: "calendar",
};

// Shift type that fits the current local time, with the start date (night shifts started yesterday).
function suggestedShift(): { type: ShiftType; date: string } {
  const hour = Number(timeInZurich().slice(0, 2));
  if (hour < 6) {
    const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(Date.now() - 86_400_000));
    return { type: "Nachtwache", date: yesterday };
  }
  const type: ShiftType = hour < 12 ? "Frühdienst" : hour < 21 ? "Spätdienst" : "Nachtwache";
  return { type, date: todayInZurich() };
}

function ShiftStartEditor({
  overview,
  onClose,
  onStarted,
}: {
  overview: ShiftOverview;
  onClose: () => void;
  onStarted: (message: string) => void;
}) {
  const planned = overview.current && !overview.current.checkedInAt ? overview.current : null;
  const suggestion = suggestedShift();
  const [shift, setShift] = useState<string>(planned ? PLANNED : suggestion.type);
  const usePlanned = Boolean(planned && shift === PLANNED);
  const [unitId, setUnitId] = useState(overview.careUnit.id ?? "");
  const [startDate, setStartDate] = useState(suggestion.date);
  const [handover, setHandover] = useState<HandoverStatus>(overview.unreadHandover ? "pending" : "complete");
  const [checklist, setChecklist] = useState<ChecklistKey[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const unitName = usePlanned
    ? (planned?.careUnit ?? ALL_UNITS)
    : (overview.careUnits.find((unit) => unit.id === unitId)?.name ?? ALL_UNITS);
  const times =
    usePlanned && planned
      ? `${clock(planned.startsAt)}–${clock(planned.endsAt)}`
      : SHIFT_TYPES[shift as ShiftType]
        ? `${SHIFT_TYPES[shift as ShiftType].start}–${SHIFT_TYPES[shift as ShiftType].end}`
        : "";
  const toggleChecklist = (item: ChecklistKey) =>
    setChecklist((current) =>
      current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item],
    );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await requestJson("/api/shift/check-in", {
        method: "POST",
        body: {
          ...(usePlanned && planned
            ? { assignmentId: planned.assignmentId }
            : { shiftType: shift, date: startDate, careUnitId: unitId || null }),
          checklist,
          handoverStatus: handover,
          note,
        },
      });
      notifyOperationsChanged();
      onStarted(`${usePlanned && planned ? planned.name : shift} im ${unitName} wurde gestartet`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  }

  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && !saving && onClose()}
    >
      <section
        className="area-editor-panel shift-start-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-start-title"
      >
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Shift · Schicht</p>
            <h2 id="shift-start-title">Dienst starten</h2>
            <p>
              Starte deinen Dienst mit einem kurzen Check-in und halte fest, dass die wichtigsten Übergabepunkte geprüft
              sind.
            </p>
          </div>
          <button className="area-editor-close" type="button" onClick={onClose} aria-label="Dienststart schliessen">
            ×
          </button>
        </header>
        <form className="area-editor-form" onSubmit={submit}>
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="shift" />
            </span>
            <div>
              <strong>Schicht-Check-in</strong>
              <p>Dein Start wird mit Uhrzeit und Arbeitsbereich im Schichtverlauf gespeichert.</p>
            </div>
            <span className="duty-assignment-status">
              <i />
              {planned ? "Dienst geplant" : "Bereit zum Start"}
            </span>
          </div>
          <div className="area-editor-grid">
            <label>
              Arbeitsbereich
              {usePlanned ? (
                <input value={unitName} readOnly aria-readonly="true" />
              ) : (
                <ScheduleSelect
                  label="Arbeitsbereich"
                  value={unitName}
                  options={[...overview.careUnits.map((unit) => unit.name), ALL_UNITS]}
                  onChange={(name) => setUnitId(overview.careUnits.find((unit) => unit.name === name)?.id ?? "")}
                />
              )}
            </label>
            <label>
              Dienst
              <ScheduleSelect
                label="Dienst"
                value={usePlanned && planned ? `${PLANNED}: ${planned.name}` : shift}
                options={[...(planned ? [`${PLANNED}: ${planned.name}`] : []), ...Object.keys(SHIFT_TYPES)]}
                onChange={(value) => setShift(value.startsWith(PLANNED) ? PLANNED : value)}
              />
            </label>
            <label>
              Startdatum
              {usePlanned && planned ? (
                <input value={formatScheduleDate(zurichDay(planned.startsAt))} readOnly aria-readonly="true" />
              ) : (
                <ScheduleDatePicker label="Startdatum" value={startDate} onChange={setStartDate} />
              )}
            </label>
            <label>
              Übergabestatus
              <ScheduleSelect
                label="Übergabestatus"
                value={HANDOVER_STATUS[handover]}
                options={Object.values(HANDOVER_STATUS)}
                onChange={(label) =>
                  setHandover(
                    (Object.keys(HANDOVER_STATUS) as HandoverStatus[]).find((key) => HANDOVER_STATUS[key] === label) ??
                      "pending",
                  )
                }
              />
            </label>
            {overview.unreadHandover > 0 && (
              <p className="area-editor-wide shift-start-hint">
                <ModuleIcon name="handover" />
                {overview.unreadHandover} ungelesene{overview.unreadHandover === 1 ? "r" : ""} Übergabepunkt
                {overview.unreadHandover === 1 ? "" : "e"} – <Link href="/betrieb/uebergabe">jetzt lesen</Link>
              </p>
            )}
            <fieldset className="area-editor-wide duty-assignment-options">
              <legend>Start-Checkliste</legend>
              <div className="area-service-options">
                {(Object.keys(CHECKLIST) as ChecklistKey[]).map((item) => (
                  <label className={checklist.includes(item) ? "selected" : ""} key={item}>
                    <input type="checkbox" checked={checklist.includes(item)} onChange={() => toggleChecklist(item)} />
                    <span>{CHECKLIST[item]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="area-editor-wide">
              Notiz zum Dienststart
              <textarea
                value={note}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
                placeholder="z. B. besondere Prioritäten für diesen Dienst …"
                rows={4}
              />
            </label>
          </div>
          <div className="duty-assignment-summary">
            <span>
              <strong>{usePlanned && planned ? planned.name : shift}</strong>
              <small>
                {unitName} · {times}
              </small>
            </span>
            <span>
              <strong>{formatScheduleDate(usePlanned && planned ? zurichDay(planned.startsAt) : startDate)}</strong>
              <small>
                {checklist.length}/{Object.keys(CHECKLIST).length} Punkte geprüft · {HANDOVER_STATUS[handover]}
              </small>
            </span>
          </div>
          {error && (
            <p className="appointment-editor-error" role="alert">
              {error}
            </p>
          )}
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              <ModuleIcon name="check" /> {saving ? "Wird gestartet…" : "Dienst starten"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ShiftEndDialog({
  overview,
  onClose,
  onEnded,
}: {
  overview: ShiftOverview;
  onClose: () => void;
  onEnded: (message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());
  const current = overview.current;
  const openItems = overview.timeline.filter((item) => !item.done && Date.parse(item.at) < now);
  return (
    <EditorDialog
      id="shift-end"
      eyebrow="CareCore Shift · Schicht"
      title="Dienst beenden"
      description={
        current
          ? `${current.name} · ${current.careUnit ?? ALL_UNITS} · eingecheckt seit ${current.checkedInAt ? clock(current.checkedInAt) : "–"} Uhr`
          : undefined
      }
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          await requestJson("/api/shift/check-out", { method: "POST", body: { note } });
          notifyOperationsChanged();
          onEnded("Dienst beendet – gute Erholung!");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel="Dienst beenden"
    >
      <div className="area-editor-wide operations-note-list shift-end-checks">
        <p className={openItems.length ? "attention" : ""}>
          <ModuleIcon name={openItems.length ? "alert" : "check"} />
          <span>
            <strong>
              {overview.stats.done}/{overview.stats.total} Punkte im Tagesablauf erledigt
            </strong>
            <small>
              {openItems.length
                ? `${openItems.length} fällige Punkte sind noch offen – erledigen oder in der Übergabe erwähnen.`
                : "Alle fälligen Punkte sind erledigt."}
            </small>
          </span>
        </p>
        <p className="info">
          <ModuleIcon name="handover" />
          <span>
            <strong>Übergabe an den nächsten Dienst</strong>
            <small>
              Wichtige Hinweise gehören in die <Link href="/betrieb/uebergabe">Übergabe</Link>, damit sie der nächste
              Dienst bestätigen kann.
            </small>
          </span>
        </p>
      </div>
      <label className="area-editor-wide">
        <span>Notiz zum Dienstende (optional)</span>
        <textarea
          rows={4}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="z. B. Ablauf, Besonderheiten, Überzeit"
        />
      </label>
    </EditorDialog>
  );
}

function ShiftView({
  showToast,
  overview,
  reload,
  unitParam,
  setUnitParam,
  fullDay,
  setFullDay,
  onCreateTask,
}: {
  showToast: ShowToast;
  overview: ReturnType<typeof useApiData<ShiftOverview>>;
  reload: () => void;
  unitParam: string;
  setUnitParam: (value: string) => void;
  fullDay: boolean;
  setFullDay: (value: boolean) => void;
  onCreateTask: () => void;
}) {
  const data = overview.data;
  const { toggle, dialog } = useTaskToggle(showToast, reload);
  const current = data?.current ?? null;
  const next = data?.next ?? null;
  const windowDay = data ? zurichDay(data.window.from) : "";
  return (
    <>
      <Summary
        items={[
          {
            icon: "calendar",
            value: current ? `${clock(current.startsAt)}–${clock(current.endsAt)}` : "–",
            label: current
              ? `${current.name}${current.checkedInAt ? " · eingecheckt" : " · geplant"}`
              : next
                ? `Nächster Dienst: ${next.name} ${formatScheduleDate(zurichDay(next.startsAt))}`
                : "Kein Dienst geplant",
          },
          {
            icon: "residents",
            value: String(data?.stats.residents ?? "–"),
            label: `Bewohner · ${data?.careUnit.name ?? ""}`,
          },
          {
            icon: "tasks",
            value: String(data?.stats.tasks ?? "–"),
            label: current && !fullDay ? "Aufgaben im Dienst" : "Aufgaben heute",
            tone: "attention",
          },
          {
            icon: "check",
            value: data ? `${data.stats.done}/${data.stats.total}` : "–",
            label: "Dienstfortschritt",
            tone: "info",
          },
        ]}
      />
      {overview.error && <LoadError message={overview.error} onRetry={reload} />}
      <div className="operations-grid">
        <section className="card operations-timeline">
          <div className="card-header">
            <div>
              <p className="eyebrow">{data ? longDate(data.window.from) : "Wird geladen …"}</p>
              <h2 className="card-title">{current ? "Dein heutiger Dienst" : "Dein Tag"}</h2>
              <p className="card-subtitle">
                {data?.careUnit.name}
                {data ? ` · ${data.window.label}` : ""}
                {current?.checkedInAt ? ` · eingecheckt ${clock(current.checkedInAt)} Uhr` : ""}
              </p>
            </div>
            <div className="shift-timeline-controls">
              <ScheduleSelect
                label="Wohnbereich"
                value={
                  unitParam === "all"
                    ? ALL_UNITS
                    : (data?.careUnits.find((unit) => unit.id === (unitParam || data?.careUnit.id))?.name ?? ALL_UNITS)
                }
                options={[...(data?.careUnits ?? []).map((unit) => unit.name), ALL_UNITS]}
                onChange={(name) => setUnitParam(data?.careUnits.find((unit) => unit.name === name)?.id ?? "all")}
              />
              {current && (
                <button className="secondary-button" type="button" onClick={() => setFullDay(!fullDay)}>
                  {fullDay ? "Nur mein Dienst" : "Ganzer Tag"}
                </button>
              )}
            </div>
          </div>
          <div>
            {(data?.timeline ?? []).map((item) => (
              <article
                className={`operations-timeline-row ${item.done ? "complete" : ""} ${item.overdue ? "overdue" : ""}`}
                key={item.id}
              >
                <time>
                  {clock(item.at)}
                  {zurichDay(item.at) !== windowDay && (
                    <small>{formatScheduleDate(zurichDay(item.at)).slice(0, 6)}</small>
                  )}
                </time>
                <span
                  className={`operations-timeline-icon ${item.done ? "stable" : item.overdue ? "critical" : item.tone}`}
                >
                  <ModuleIcon name={kindIcon[item.kind]} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {item.detail}
                    {item.overdue ? " · überfällig" : ""}
                  </small>
                </div>
                {item.kind === "task" && item.taskId ? (
                  <button
                    type="button"
                    aria-label={`${item.title} ${item.done ? "wieder öffnen" : "erledigt markieren"}`}
                    onClick={() =>
                      void toggle({
                        id: item.taskId!,
                        title: item.title,
                        done: item.done,
                        residentName: item.detail.split(" · ")[0] || null,
                        documentOnCompletion: Boolean(item.documentOnCompletion),
                      })
                    }
                  >
                    <ModuleIcon name={item.done ? "check" : "plus"} />
                  </button>
                ) : (
                  <Link href={item.href} aria-label={`${item.title} öffnen`} title="Öffnen">
                    <ModuleIcon name={item.done ? "check" : "chevron"} />
                  </Link>
                )}
              </article>
            ))}
            {data && !data.timeline.length && (
              <div className="resident-empty">
                <ModuleIcon name="check" />
                <strong>Nichts geplant</strong>
                <p>In diesem Zeitraum sind keine Aufgaben, Runden, Wundversorgungen oder Termine fällig.</p>
              </div>
            )}
            {!data && overview.loading && <p className="list-hint">Dienst wird geladen …</p>}
          </div>
        </section>
        <aside className="operations-sidebar">
          <section className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Aktuell wichtig</p>
                <h2 className="card-title">Hinweise für dich</h2>
              </div>
            </div>
            <div className="operations-note-list">
              {(data?.hints ?? []).map((hint) => (
                <Link className={`operations-hint ${hint.tone}`} href={hint.href} key={hint.id}>
                  <ModuleIcon
                    name={
                      hint.tone === "critical"
                        ? "alert"
                        : hint.id.startsWith("order")
                          ? "med"
                          : hint.id.startsWith("note")
                            ? "handover"
                            : "note"
                    }
                  />
                  <span>
                    <strong>{hint.title}</strong>
                    <small>{hint.text}</small>
                  </span>
                </Link>
              ))}
              {data && !data.hints.length && (
                <p className="stable">
                  <ModuleIcon name="check" />
                  <span>
                    <strong>Keine offenen Hinweise</strong>
                    <small>Übergabe gelesen, keine kritischen Werte oder Änderungen.</small>
                  </span>
                </p>
              )}
            </div>
          </section>
          <section className="card operations-quick">
            <div className="card-header">
              <div>
                <p className="eyebrow">Direktzugriff</p>
                <h2 className="card-title">Schnellaktionen</h2>
              </div>
            </div>
            <div>
              <Link href="/pflegedokumentation">
                <ModuleIcon name="note" />
                <span>Dokumentieren</span>
              </Link>
              <Link href="/vitalwerte">
                <ModuleIcon name="vitals" />
                <span>Vitalwerte</span>
              </Link>
              <button type="button" onClick={onCreateTask}>
                <ModuleIcon name="tasks" />
                <span>Aufgabe erstellen</span>
              </button>
              <Link href="/betrieb/uebergabe">
                <ModuleIcon name="handover" />
                <span>Übergabe{data?.unreadHandover ? ` (${data.unreadHandover})` : ""}</span>
              </Link>
            </div>
          </section>
        </aside>
      </div>
      {dialog}
    </>
  );
}

const csvCell = (value: string | number | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function exportHistory(entries: ShiftHistoryEntry[]) {
  const header = [
    "Datum",
    "Dienst",
    "Geplant",
    "Eingecheckt",
    "Ausgecheckt",
    "Wohnbereich",
    "Status",
    "Übergabe",
    "Dokumentationen",
    "Vitalwerte",
    "Medikamentengaben",
    "Aufgaben erledigt",
    "Übergabepunkte",
    "Notiz Start",
    "Notiz Ende",
  ];
  const rows = entries.map((entry) => [
    formatScheduleDate(zurichDay(entry.startsAt)),
    entry.name,
    `${clock(entry.startsAt)}–${clock(entry.endsAt)}`,
    entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "",
    entry.checkedOutAt ? formatDateTime(entry.checkedOutAt) : "",
    entry.careUnit ?? "",
    entry.status === "completed" ? "Abgeschlossen" : entry.status === "absent" ? "Abwesend" : "Nicht abgeschlossen",
    entry.handoverStatus ? HANDOVER_STATUS[entry.handoverStatus] : "",
    entry.counts.documentation,
    entry.counts.vitals,
    entry.counts.medication,
    entry.counts.tasks,
    entry.counts.handover,
    entry.checkInNote ?? "",
    entry.checkOutNote ?? "",
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `schichtverlauf-${todayInZurich()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ShiftHistoryView({
  history,
  reload,
  days,
  setDays,
}: {
  history: ReturnType<typeof useApiData<ShiftHistory>>;
  reload: () => void;
  days: number;
  setDays: (days: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const entries = history.data?.entries ?? [];
  const totals = history.data?.totals;
  const filtered = entries.filter((entry) =>
    `${longDate(entry.startsAt)} ${entry.name} ${entry.careUnit ?? ""}`
      .toLocaleLowerCase("de-CH")
      .includes(query.trim().toLocaleLowerCase("de-CH")),
  );
  return (
    <>
      <Summary
        items={[
          { icon: "calendar", value: String(totals?.shifts ?? "–"), label: `Dienste in ${days} Tagen` },
          { icon: "check", value: String(totals?.completed ?? "–"), label: "ordentlich abgeschlossen" },
          { icon: "note", value: String(totals?.documentation ?? "–"), label: "Dokumentationen", tone: "info" },
          { icon: "alert", value: String(totals?.open ?? "–"), label: "ohne Check-out", tone: "attention" },
        ]}
      />
      {history.error && <LoadError message={history.error} onRetry={reload} />}
      <section className="card operations-list-card">
        <div className="operations-toolbar">
          <div>
            <h2 className="card-title">Abgeschlossene Dienste</h2>
            <p className="card-subtitle">
              {filtered.length} von {entries.length} Einträgen
            </p>
          </div>
          <div className="operations-filter-buttons">
            {[30, 90, 365].map((value) => (
              <button
                key={value}
                type="button"
                className={days === value ? "active" : ""}
                aria-pressed={days === value}
                onClick={() => setDays(value)}
              >
                {value === 365 ? "12 Monate" : `${value} Tage`}
              </button>
            ))}
          </div>
          <label className="resident-search">
            <ModuleIcon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Datum, Dienst oder Wohnbereich"
              aria-label="Schichtverlauf durchsuchen"
            />
          </label>
        </div>
        <div className="operations-history-list">
          {filtered.map((entry) => {
            const open = openId === entry.assignmentId;
            const [weekday, ...rest] = longDate(entry.startsAt).split(", ");
            const total = entry.counts.documentation + entry.counts.vitals + entry.counts.medication;
            return (
              <div key={entry.assignmentId} className={`shift-history-entry ${open ? "open" : ""}`}>
                <article>
                  <span className="operations-date">
                    <strong>{weekday}</strong>
                    <small>{rest.join(", ")}</small>
                  </span>
                  <span>
                    <strong>
                      {entry.checkedInAt ? clock(entry.checkedInAt) : clock(entry.startsAt)}–
                      {entry.checkedOutAt ? clock(entry.checkedOutAt) : clock(entry.endsAt)}
                    </strong>
                    <small>
                      {entry.name} · {entry.careUnit ?? ALL_UNITS}
                    </small>
                  </span>
                  <span>
                    <strong>
                      {total} {total === 1 ? "Eintrag" : "Einträge"}
                    </strong>
                    <small>
                      Übergabe:{" "}
                      {entry.handoverStatus
                        ? HANDOVER_STATUS[entry.handoverStatus].replace("Übergabe ", "")
                        : "nicht erfasst"}
                    </small>
                  </span>
                  <span
                    className={`status-badge ${entry.status === "completed" ? "stable" : entry.status === "absent" ? "archived" : "attention"}`}
                  >
                    {entry.status === "completed"
                      ? "Abgeschlossen"
                      : entry.status === "absent"
                        ? "Abwesend"
                        : "Ohne Check-out"}
                  </span>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : entry.assignmentId)}
                  >
                    {open ? "Schliessen" : "Ansehen"} <ModuleIcon name="chevron" className={open ? "open" : ""} />
                  </button>
                </article>
                {open && (
                  <dl className="task-detail-list shift-history-detail">
                    <div>
                      <dt>Geplant</dt>
                      <dd>
                        {clock(entry.startsAt)}–{clock(entry.endsAt)}
                      </dd>
                    </div>
                    <div>
                      <dt>Check-in / Check-out</dt>
                      <dd>
                        {entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "–"} /{" "}
                        {entry.checkedOutAt ? formatDateTime(entry.checkedOutAt) : "–"}
                      </dd>
                    </div>
                    <div>
                      <dt>Dokumentiert</dt>
                      <dd>
                        {entry.counts.documentation} {entry.counts.documentation === 1 ? "Eintrag" : "Einträge"} ·{" "}
                        {entry.counts.vitals} Vitalwerte · {entry.counts.medication} Medikamentengaben
                      </dd>
                    </div>
                    <div>
                      <dt>Aufgaben & Übergabe</dt>
                      <dd>
                        {entry.counts.tasks} Aufgaben erledigt · {entry.counts.handover} Übergabepunkte geschrieben
                      </dd>
                    </div>
                    <div>
                      <dt>Start-Checkliste</dt>
                      <dd>{entry.checklist.length ? entry.checklist.map((key) => CHECKLIST[key]).join(" · ") : "–"}</dd>
                    </div>
                    <div>
                      <dt>Notizen</dt>
                      <dd>{[entry.checkInNote, entry.checkOutNote].filter(Boolean).join(" · ") || "–"}</dd>
                    </div>
                  </dl>
                )}
              </div>
            );
          })}
        </div>
        {!history.loading && filtered.length === 0 && (
          <div className="resident-empty">
            <ModuleIcon name="search" />
            <strong>Keine Dienste gefunden</strong>
            <p>
              {entries.length
                ? "Suchbegriff anpassen."
                : "Im gewählten Zeitraum liegen noch keine beendeten Dienste vor."}
            </p>
          </div>
        )}
        {history.loading && !history.data && <p className="list-hint">Schichtverlauf wird geladen …</p>}
      </section>
    </>
  );
}

export default function ShiftWorkspace({ view }: { view: ShiftPageView }) {
  const [unitParam, setUnitParam] = useState("");
  const [fullDay, setFullDay] = useState(false);
  const [days, setDays] = useState(90);
  const overview = useApiData<ShiftOverview>(
    view === "shift"
      ? `/api/shift?range=${fullDay ? "day" : "shift"}${unitParam ? `&careUnitId=${unitParam}` : ""}`
      : null,
  );
  const history = useApiData<ShiftHistory>(view === "shiftHistory" ? `/api/shift/history?days=${days}` : null);
  const reload = view === "shift" ? overview.reload : history.reload;
  const [dialog, setDialog] = useState<"start" | "end" | "task" | null>(null);
  useEffect(() => {
    window.addEventListener(OPERATIONS_CHANGED, reload);
    return () => window.removeEventListener(OPERATIONS_CHANGED, reload);
  }, [reload]);
  const checkedIn = Boolean(overview.data?.current?.checkedInAt);
  return (
    <OperationsFrame
      module="shift"
      child={view === "shift" ? "Mein Dienst" : "Schichtverlauf"}
      view={view}
      eyebrow="CareCore Shift"
      title={view === "shift" ? "Mein Dienst" : "Schichtverlauf"}
      description={
        view === "shift"
          ? "Dein persönlicher Schichtarbeitsplatz für heute."
          : "Abgeschlossene Dienste, Übergaben und dokumentierte Aktivitäten."
      }
      action={
        view === "shift"
          ? overview.data
            ? {
                label: checkedIn ? "Dienst beenden" : "Dienst starten",
                icon: checkedIn ? "check" : "plus",
                onClick: () => setDialog(checkedIn ? "end" : "start"),
              }
            : null
          : {
              label: "Bericht exportieren",
              icon: "docs",
              onClick: (showToast) => {
                const entries = history.data?.entries ?? [];
                if (entries.length) exportHistory(entries);
                showToast(entries.length ? "Schichtbericht als CSV exportiert" : "Keine Dienste zum Exportieren");
              },
            }
      }
    >
      {(showToast) => (
        <>
          {view === "shift" ? (
            <ShiftView
              showToast={showToast}
              overview={overview}
              reload={reload}
              unitParam={unitParam}
              setUnitParam={setUnitParam}
              fullDay={fullDay}
              setFullDay={setFullDay}
              onCreateTask={() => setDialog("task")}
            />
          ) : (
            <ShiftHistoryView history={history} reload={reload} days={days} setDays={setDays} />
          )}
          {dialog === "start" && overview.data && (
            <ShiftStartEditor
              overview={overview.data}
              onClose={() => setDialog(null)}
              onStarted={(message) => {
                setDialog(null);
                showToast(message);
              }}
            />
          )}
          {dialog === "end" && overview.data && (
            <ShiftEndDialog
              overview={overview.data}
              onClose={() => setDialog(null)}
              onEnded={(message) => {
                setDialog(null);
                showToast(message);
              }}
            />
          )}
          {dialog === "task" && (
            <TaskEditor
              onClose={() => setDialog(null)}
              onSaved={(message) => {
                setDialog(null);
                showToast(message);
              }}
            />
          )}
        </>
      )}
    </OperationsFrame>
  );
}

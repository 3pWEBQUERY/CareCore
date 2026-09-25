"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ModuleIcon } from "@/app/components/module-page-shell";
import {
  EditorDialog,
  LoadError,
  ReasonDialog,
  formatDateTime,
  requestJson,
  timeInZurich,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import {
  ABSENCE_KINDS,
  ABSENCE_STATUS,
  ASSIGNMENT_STATUS,
  DUTY_REPEAT,
  DUTY_ROLES,
  activeAssignments,
  openSlots,
  weekdaysBetween,
  type Absence,
  type AbsenceKind,
  type DutyRepeat,
  type ScheduleAssignment,
  type SchedulePayload,
  type ScheduleShift,
} from "@/lib/schedule-shared";
import { SHIFT_TYPES, type ShiftType } from "@/lib/shift-shared";
import { personInitials } from "@/lib/tasks-shared";
import {
  OPERATIONS_CHANGED,
  OperationsFrame,
  ScheduleDatePicker,
  ScheduleSelect,
  Summary,
  formatScheduleDate,
  notifyOperationsChanged,
} from "./operations-ui";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY = 86_400_000;
const CUSTOM = "Individuell";
const OPEN = "Offen – noch niemand eingeteilt";
const ALL_UNITS = "Alle Wohnbereiche";
const NO_SUBSTITUTE = "Keine Stellvertretung";

const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const weekdayIndex = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
const mondayOf = (day: string) => addDays(day, -weekdayIndex(day));
const monthStart = (day: string) => `${day.slice(0, 7)}-01`;
const monthEnd = (day: string) => {
  const date = new Date(`${monthStart(day)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
};
const shiftMonth = (day: string, delta: number) => {
  const date = new Date(`${monthStart(day)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 10);
};
const monthLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("de-CH", { month: "long", year: "numeric", timeZone: "UTC" });
const isoWeek = (day: string) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 3 - weekdayIndex(day));
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round((date.getTime() - firstThursday.getTime()) / DAY / 7 - (3 - ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  );
};
const shortDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;
const longDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
const clock = (value: string) => timeInZurich(new Date(value));
const times = (shift: ScheduleShift) => `${clock(shift.startsAt)}–${clock(shift.endsAt)}`;
const hours = (shift: ScheduleShift) => (Date.parse(shift.endsAt) - Date.parse(shift.startsAt)) / 3_600_000;

function shortShiftLabel(name: string) {
  if (name.startsWith("Früh")) return "Früh";
  if (name.startsWith("Spät")) return "Spät";
  if (name.startsWith("Nacht")) return "Nacht";
  if (name.startsWith("Tag")) return "Tag";
  return "Dienst";
}

const absenceCovers = (absence: Absence, day: string) => absence.startsOn <= day && absence.endsOn >= day;
const formatHours = (value: number) =>
  `${value.toLocaleString("de-CH", { maximumFractionDigits: 1 })} h`.replace(".", ",");

function AbsenceEditor({
  data,
  onClose,
  onSaved,
}: {
  data: SchedulePayload;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const start = addDays(data.today, 1);
  const [kind, setKind] = useState<AbsenceKind>("vacation");
  const [urgent, setUrgent] = useState(false);
  const [fromDate, setFromDate] = useState(start);
  const [toDate, setToDate] = useState(start);
  const [substitute, setSubstitute] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const colleagues = data.people.filter((person) => person.id !== data.currentUserId);
  const substituteName = colleagues.find((person) => person.id === substitute)?.name ?? NO_SUBSTITUTE;
  const workdays = toDate >= fromDate ? weekdaysBetween(fromDate, toDate) : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await requestJson("/api/schedule/absences", {
        method: "POST",
        body: { kind, urgent, startsOn: fromDate, endsOn: toDate, substituteUserId: substitute || null, note },
      });
      notifyOperationsChanged();
      onSaved(
        kind === "sick"
          ? "Krankmeldung erfasst – gute Besserung!"
          : `Abwesenheit vom ${formatScheduleDate(fromDate)} bis ${formatScheduleDate(toDate)} wurde beantragt`,
      );
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
      <section className="area-editor-panel" role="dialog" aria-modal="true" aria-labelledby="absence-editor-title">
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Schedule · Abwesenheiten</p>
            <h2 id="absence-editor-title">Abwesenheit melden</h2>
            <p>Erfasse deine Abwesenheit, damit die Dienstplanung rechtzeitig angepasst werden kann.</p>
          </div>
          <button
            className="area-editor-close"
            type="button"
            onClick={onClose}
            aria-label="Abwesenheitseditor schliessen"
          >
            ×
          </button>
        </header>
        <form className="area-editor-form" onSubmit={submit}>
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="calendar" />
            </span>
            <div>
              <strong>{kind === "sick" ? "Krankmeldung" : "Neue Abwesenheit"}</strong>
              <p>
                {kind === "sick"
                  ? "Gilt sofort: deine Dienste in diesem Zeitraum werden freigegeben und die Leitung informiert."
                  : "Die Leitung wird über deine Meldung informiert und prüft die Abdeckung."}
              </p>
            </div>
          </div>
          <div className="area-editor-grid">
            <label>
              Art der Abwesenheit
              <ScheduleSelect
                label="Art der Abwesenheit"
                value={ABSENCE_KINDS[kind]}
                options={Object.values(ABSENCE_KINDS)}
                onChange={(label) =>
                  setKind(
                    (Object.keys(ABSENCE_KINDS) as AbsenceKind[]).find((key) => ABSENCE_KINDS[key] === label) ??
                      "vacation",
                  )
                }
              />
            </label>
            <label>
              Priorität
              <ScheduleSelect
                label="Priorität"
                value={urgent ? "Dringend" : "Normal"}
                options={["Normal", "Dringend"]}
                onChange={(value) => setUrgent(value === "Dringend")}
              />
            </label>
            <label>
              Von
              <ScheduleDatePicker
                label="Von"
                value={fromDate}
                onChange={(value) => {
                  setFromDate(value);
                  if (toDate < value) setToDate(value);
                }}
              />
            </label>
            <label>
              Bis
              <ScheduleDatePicker label="Bis" value={toDate} onChange={setToDate} />
            </label>
            <label className="area-editor-wide">
              Stellvertretung
              <ScheduleSelect
                label="Stellvertretung"
                value={substituteName}
                options={[NO_SUBSTITUTE, ...colleagues.map((person) => person.name)]}
                onChange={(name) => setSubstitute(colleagues.find((person) => person.name === name)?.id ?? "")}
              />
            </label>
            <label className="area-editor-wide">
              Hinweis oder Bemerkung
              <textarea
                value={note}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
                placeholder="z. B. Übergabe an das Team, Erreichbarkeit …"
                rows={4}
              />
            </label>
          </div>
          <div className="duty-assignment-summary">
            <span>
              <strong>{ABSENCE_KINDS[kind]}</strong>
              <small>
                {substitute ? `Vertretung: ${substituteName}` : "Ohne Stellvertretung"}
                {urgent ? " · dringend" : ""}
              </small>
            </span>
            <span>
              <strong>
                {formatScheduleDate(fromDate)} – {formatScheduleDate(toDate)}
              </strong>
              <small>
                {workdays} {workdays === 1 ? "Arbeitstag" : "Arbeitstage"} (Mo–Fr)
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
            <button className="primary-button" type="submit" disabled={saving || toDate < fromDate}>
              <ModuleIcon name="check" /> {saving ? "Wird gemeldet…" : "Abwesenheit melden"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function DutyAssignmentEditor({
  data,
  preset,
  onClose,
  onSaved,
}: {
  data: SchedulePayload;
  preset: { day: string; careUnitId: string | null };
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [member, setMember] = useState(data.people[0]?.id ?? "");
  const [unitId, setUnitId] = useState(preset.careUnitId ?? data.careUnits[0]?.id ?? "");
  const [shift, setShift] = useState<string>("Frühdienst");
  const [customName, setCustomName] = useState("Zwischendienst");
  const [date, setDate] = useState(preset.day < data.today ? data.today : preset.day);
  const [start, setStart] = useState<string>(SHIFT_TYPES.Frühdienst.start);
  const [end, setEnd] = useState<string>(SHIFT_TYPES.Frühdienst.end);
  const [role, setRole] = useState<string>("");
  const [status, setStatus] = useState<"scheduled" | "confirmed">("scheduled");
  const [repeat, setRepeat] = useState<DutyRepeat>("none");
  const [until, setUntil] = useState(addDays(preset.day < data.today ? data.today : preset.day, 13));
  const [note, setNote] = useState("");
  const [highlight, setHighlight] = useState(false);
  const [remind, setRemind] = useState(true);
  const [planHandover, setPlanHandover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const person = data.people.find((p) => p.id === member);
  const effectiveRole = role || person?.role || "";
  const unitName = data.careUnits.find((unit) => unit.id === unitId)?.name ?? "Ohne Wohnbereich";
  const custom = shift === CUSTOM;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await requestJson<{ created: number; skipped: Array<{ day: string; reason: string }> }>(
        "/api/schedule/shifts",
        {
          method: "POST",
          body: {
            userId: member || null,
            careUnitId: unitId || null,
            date,
            shiftType: custom ? CUSTOM : shift,
            name: custom ? customName : undefined,
            start,
            end,
            role: (DUTY_ROLES as readonly string[]).includes(effectiveRole) ? effectiveRole : null,
            status,
            repeat,
            until: repeat === "none" ? undefined : until,
            note,
            highlight,
            remind: Boolean(member) && remind,
            planHandover: Boolean(member) && planHandover,
          },
        },
      );
      notifyOperationsChanged();
      const who = person?.name ?? "Offener Dienst";
      const skipped = result.skipped.length
        ? ` · ${result.skipped.length} übersprungen (${result.skipped.map((s) => `${shortDay(s.day)} ${s.reason}`).join(", ")})`
        : "";
      onSaved(
        result.created === 1
          ? `${who}: ${custom ? customName : shift} am ${formatScheduleDate(date)} eingeteilt${skipped}`
          : `${who}: ${result.created} Dienste eingeteilt${skipped}`,
      );
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
        className="area-editor-panel duty-editor-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="duty-editor-title"
      >
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Schedule · Teamplanung</p>
            <h2 id="duty-editor-title">Dienst einteilen</h2>
            <p>Plane einen Dienst für dein Team und hinterlege alle Informationen für eine verlässliche Besetzung.</p>
          </div>
          <button className="area-editor-close" type="button" onClick={onClose} aria-label="Diensteditor schliessen">
            ×
          </button>
        </header>
        <form className="area-editor-form" onSubmit={submit}>
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="calendar" />
            </span>
            <div>
              <strong>Neue Diensteinteilung</strong>
              <p>
                Die Einteilung wird im Teamkalender sichtbar; Überschneidungen und bewilligte Abwesenheiten werden
                geprüft.
              </p>
            </div>
            <span className="duty-assignment-status">
              <i />
              Planung aktiv
            </span>
          </div>
          <div className="area-editor-grid">
            <label>
              Mitarbeiterin oder Mitarbeiter
              <ScheduleSelect
                label="Mitarbeiterin oder Mitarbeiter"
                value={person?.name ?? OPEN}
                options={[...data.people.map((p) => p.name), OPEN]}
                onChange={(name) => setMember(data.people.find((p) => p.name === name)?.id ?? "")}
              />
            </label>
            <label>
              Wohnbereich
              <ScheduleSelect
                label="Wohnbereich"
                value={unitName}
                options={data.careUnits.map((unit) => unit.name)}
                onChange={(name) => setUnitId(data.careUnits.find((unit) => unit.name === name)?.id ?? "")}
              />
            </label>
            <label>
              Datum
              <ScheduleDatePicker label="Datum" value={date} onChange={setDate} />
            </label>
            <label>
              Dienst
              <ScheduleSelect
                label="Dienst"
                value={shift}
                options={[...Object.keys(SHIFT_TYPES), CUSTOM]}
                onChange={(value) => {
                  setShift(value);
                  const preset = SHIFT_TYPES[value as ShiftType];
                  if (preset) {
                    setStart(preset.start);
                    setEnd(preset.end);
                  }
                }}
              />
            </label>
            {custom && (
              <label className="area-editor-wide">
                Bezeichnung
                <input
                  value={customName}
                  maxLength={100}
                  required
                  onChange={(event) => setCustomName(event.target.value)}
                />
              </label>
            )}
            <label>
              Beginn
              <input
                type="time"
                value={start}
                required
                disabled={!custom}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label>
              Ende
              <input
                type="time"
                value={end}
                required
                disabled={!custom}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
            <label>
              Rolle im Dienst
              <ScheduleSelect
                label="Rolle im Dienst"
                value={effectiveRole || "Mitarbeitende:r"}
                options={[...DUTY_ROLES]}
                onChange={setRole}
              />
            </label>
            <label>
              Planungsstatus
              <ScheduleSelect
                label="Planungsstatus"
                value={member ? ASSIGNMENT_STATUS[status].label : "Offen"}
                options={member ? ["Geplant", "Bestätigt"] : ["Offen"]}
                onChange={(value) => setStatus(value === "Bestätigt" ? "confirmed" : "scheduled")}
              />
            </label>
            <label>
              Wiederholung
              <ScheduleSelect
                label="Wiederholung"
                value={DUTY_REPEAT[repeat]}
                options={Object.values(DUTY_REPEAT)}
                onChange={(label) =>
                  setRepeat(
                    (Object.keys(DUTY_REPEAT) as DutyRepeat[]).find((key) => DUTY_REPEAT[key] === label) ?? "none",
                  )
                }
              />
            </label>
            {repeat !== "none" && (
              <label>
                Wiederholen bis
                <ScheduleDatePicker label="Wiederholen bis" value={until} onChange={setUntil} />
              </label>
            )}
            <label className="area-editor-wide">
              Hinweis für das Team
              <textarea
                value={note}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
                placeholder="z. B. Schwerpunkt, Übergabe oder besondere Zuständigkeit …"
                rows={3}
              />
            </label>
            <fieldset className="area-editor-wide duty-assignment-options">
              <legend>Zusätzliche Hinweise</legend>
              <div className="area-service-options">
                <label className={highlight ? "selected" : ""}>
                  <input type="checkbox" checked={highlight} onChange={(event) => setHighlight(event.target.checked)} />
                  <span>Im Teamkalender hervorheben</span>
                </label>
                <label className={remind && member ? "selected" : ""}>
                  <input
                    type="checkbox"
                    checked={remind && Boolean(member)}
                    disabled={!member}
                    onChange={(event) => setRemind(event.target.checked)}
                  />
                  <span>Erinnerung 24 Stunden vorher</span>
                </label>
                <label className={planHandover && member ? "selected" : ""}>
                  <input
                    type="checkbox"
                    checked={planHandover && Boolean(member)}
                    disabled={!member}
                    onChange={(event) => setPlanHandover(event.target.checked)}
                  />
                  <span>Übergabe einplanen</span>
                </label>
              </div>
            </fieldset>
          </div>
          <div className="duty-assignment-summary">
            <span>
              <strong>{person?.name ?? "Offener Dienst"}</strong>
              <small>
                {unitName} · {custom ? customName : shift}
              </small>
            </span>
            <span>
              <strong>
                {formatScheduleDate(date)}
                {repeat !== "none" ? ` – ${formatScheduleDate(until)}` : ""}
              </strong>
              <small>
                {start}–{end} · {member ? ASSIGNMENT_STATUS[status].label : "Offen"}
                {repeat !== "none" ? ` · ${DUTY_REPEAT[repeat]}` : ""}
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
              <ModuleIcon name="check" /> {saving ? "Wird eingeteilt…" : "Dienst einteilen"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function AssignDialog({
  shift,
  data,
  onClose,
  onDone,
}: {
  shift: ScheduleShift;
  data: SchedulePayload;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const assigned = new Set(activeAssignments(shift).map((a) => a.userId));
  const candidates = data.people.filter((person) => !assigned.has(person.id));
  const [member, setMember] = useState(candidates[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const name = candidates.find((person) => person.id === member)?.name ?? "";
  return (
    <EditorDialog
      id="duty-assign"
      eyebrow="CareCore Schedule · Offener Dienst"
      title={`${shift.name} besetzen`}
      description={`${longDay(shift.day)} · ${times(shift)} · ${shift.careUnit ?? "Ohne Wohnbereich"}`}
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          await requestJson(`/api/schedule/shifts/${shift.id}`, {
            method: "POST",
            body: { action: "assign", userId: member },
          });
          notifyOperationsChanged();
          onDone(`${name} wurde eingeteilt`);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel="Einteilen"
    >
      <label className="area-editor-wide">
        <span>Mitarbeiterin oder Mitarbeiter</span>
        <ScheduleSelect
          label="Mitarbeiterin oder Mitarbeiter"
          value={name || "Keine Person verfügbar"}
          options={candidates.map((person) => person.name)}
          onChange={(value) => setMember(candidates.find((person) => person.name === value)?.id ?? "")}
        />
      </label>
    </EditorDialog>
  );
}

type Dialog =
  | { kind: "absence" }
  | { kind: "duty"; day: string }
  | { kind: "assign"; shift: ScheduleShift }
  | { kind: "remove"; shift: ScheduleShift; assignment: ScheduleAssignment }
  | { kind: "cancelShift"; shift: ScheduleShift }
  | { kind: "reject" | "revoke"; absence: Absence };

function AbsenceList({
  data,
  team,
  run,
  setDialog,
}: {
  data: SchedulePayload;
  team: boolean;
  run: (url: string, body: unknown, message: string) => void;
  setDialog: (dialog: Dialog) => void;
}) {
  const requests = data.requests;
  return (
    <section className="card operations-list-card">
      <div className="operations-toolbar">
        <div>
          <h2 className="card-title">{team ? "Abwesenheitsanträge" : "Deine Abwesenheiten"}</h2>
          <p className="card-subtitle">
            {team
              ? `${requests.filter((a) => a.status === "requested").length} offen · Entscheide der letzten 14 Tage`
              : "Anträge, Krankmeldungen und Entscheide der letzten 60 Tage"}
          </p>
        </div>
      </div>
      <div className="operations-history-list absence-list">
        {requests.map((absence) => {
          const status = ABSENCE_STATUS[absence.status];
          const days = weekdaysBetween(absence.startsOn, absence.endsOn);
          return (
            <article key={absence.id}>
              <span className="operations-date">
                <strong>{team ? absence.name : ABSENCE_KINDS[absence.kind]}</strong>
                <small>
                  {team ? `${ABSENCE_KINDS[absence.kind]} · ` : ""}beantragt {formatDateTime(absence.createdAt)}
                </small>
              </span>
              <span>
                <strong>
                  {shortDay(absence.startsOn)}
                  {absence.endsOn !== absence.startsOn ? ` – ${shortDay(absence.endsOn)}` : ""}
                </strong>
                <small>
                  {days} {days === 1 ? "Arbeitstag" : "Arbeitstage"}
                  {absence.urgent ? " · dringend" : ""}
                </small>
              </span>
              <span>
                <strong>{absence.substituteName ? `Vertretung: ${absence.substituteName}` : "Ohne Vertretung"}</strong>
                <small>
                  {absence.decisionNote
                    ? `${absence.decidedByName ?? "Leitung"}: ${absence.decisionNote}`
                    : (absence.note ?? "–")}
                </small>
              </span>
              <span className={`status-badge ${status.tone}`}>{status.label}</span>
              <span className="absence-actions">
                {team && data.canManage && absence.status === "requested" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        run(`/api/schedule/absences/${absence.id}`, { action: "approve" }, "Abwesenheit bewilligt")
                      }
                    >
                      Bewilligen
                    </button>
                    <button type="button" onClick={() => setDialog({ kind: "reject", absence })}>
                      Ablehnen
                    </button>
                  </>
                )}
                {team && data.canManage && absence.status === "approved" && absence.endsOn >= data.today && (
                  <button type="button" onClick={() => setDialog({ kind: "revoke", absence })}>
                    Aufheben
                  </button>
                )}
                {!team && absence.status === "requested" && (
                  <button
                    type="button"
                    onClick={() =>
                      run(`/api/schedule/absences/${absence.id}`, { action: "withdraw" }, "Antrag zurückgezogen")
                    }
                  >
                    Zurückziehen
                  </button>
                )}
              </span>
            </article>
          );
        })}
        {!requests.length && (
          <div className="resident-empty">
            <ModuleIcon name="check" />
            <strong>{team ? "Keine offenen Anträge" : "Keine Abwesenheiten"}</strong>
            <p>
              {team
                ? "Neue Anträge erscheinen hier zur Bewilligung."
                : "Über „Abwesenheit melden“ erfasst du Ferien, Weiterbildung oder Krankheit."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ScheduleView({
  team,
  showToast,
  dialog,
  setDialog,
  onCanManage,
}: {
  team: boolean;
  showToast: ShowToast;
  dialog: Dialog | null;
  setDialog: (dialog: Dialog | null) => void;
  onCanManage: (canManage: boolean) => void;
}) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [unitId, setUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  // The organization's "today" comes from the first response; until then the browser date is used.
  const [browserToday] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date()),
  );
  const base = anchor ?? browserToday;
  const from = mode === "week" ? mondayOf(base) : mondayOf(monthStart(base));
  const to = mode === "week" ? addDays(from, 6) : addDays(mondayOf(monthEnd(base)), 6);
  const schedule = useApiData<SchedulePayload>(
    `/api/schedule?scope=${team ? "team" : "mine"}&from=${from}&to=${to}${unitId ? `&careUnitId=${unitId}` : ""}`,
  );
  const { reload } = schedule;
  useEffect(() => {
    window.addEventListener(OPERATIONS_CHANGED, reload);
    return () => window.removeEventListener(OPERATIONS_CHANGED, reload);
  }, [reload]);
  const data = schedule.data;
  const canManage = Boolean(data?.canManage);
  useEffect(() => onCanManage(canManage), [canManage, onCanManage]);
  const [now] = useState(() => Date.now());
  const today = data?.today ?? browserToday;
  const day = selected ?? (today >= from && today <= to ? today : mode === "week" ? from : monthStart(base));

  const visibleDays = Array.from({ length: Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1 }, (_, i) =>
    addDays(from, i),
  );
  const periodDays = mode === "week" ? visibleDays : visibleDays.filter((d) => d.slice(0, 7) === base.slice(0, 7));
  const shifts = data?.shifts ?? [];
  const inPeriod = shifts.filter((shift) => periodDays.includes(shift.day));
  const me = data?.currentUserId ?? "";
  const myAssignment = (shift: ScheduleShift) => shift.assignments.find((a) => a.userId === me);
  const myWorking = inPeriod.filter((shift) => {
    const assignment = myAssignment(shift);
    return assignment && assignment.status !== "absent";
  });
  const shiftsOn = (d: string) => shifts.filter((shift) => shift.day === d);
  const absencesOn = (d: string) => (data?.absences ?? []).filter((absence) => absenceCovers(absence, d));

  const run = async (url: string, body: unknown, message: string) => {
    setBusy(true);
    try {
      const result = await requestJson<{ affected?: number; covered?: number }>(url, { method: "POST", body });
      notifyOperationsChanged();
      showToast(
        result?.affected
          ? `${message} · ${result.affected} ${result.affected === 1 ? "Dienst" : "Dienste"} betroffen${result.covered ? `, ${result.covered} vertreten` : ""}`
          : message,
      );
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const move = (delta: number) => {
    setSelected(null);
    setAnchor(mode === "week" ? addDays(from, delta * 7) : shiftMonth(base, delta));
  };

  const required = inPeriod.reduce((sum, shift) => sum + shift.requiredStaff, 0);
  const filled = inPeriod.reduce(
    (sum, shift) => sum + Math.min(activeAssignments(shift).length, shift.requiredStaff),
    0,
  );

  return (
    <>
      <Summary
        items={
          team
            ? [
                {
                  icon: "calendar",
                  value: String(inPeriod.length),
                  label: mode === "week" ? "Dienste diese Woche" : "Dienste im Monat",
                },
                {
                  icon: "residents",
                  value: required ? `${Math.round((filled / required) * 100)} %` : "–",
                  label: "Besetzung",
                  tone: "info",
                },
                {
                  icon: "alert",
                  value: String(inPeriod.reduce((sum, shift) => sum + openSlots(shift), 0)),
                  label: "offene Dienste",
                  tone: "attention",
                },
                {
                  icon: "check",
                  value: String(
                    inPeriod.flatMap((shift) => shift.assignments).filter((a) => a.status === "confirmed").length,
                  ),
                  label: "Bestätigt",
                },
              ]
            : [
                {
                  icon: "calendar",
                  value: String(myWorking.length),
                  label: mode === "week" ? "Dienste diese Woche" : "Dienste im Monat",
                },
                {
                  icon: "residents",
                  value: formatHours(myWorking.reduce((sum, shift) => sum + hours(shift), 0)),
                  label: "Arbeitszeit geplant",
                  tone: "info",
                },
                {
                  icon: "alert",
                  value: String(
                    myWorking.filter((shift) => myAssignment(shift)?.status === "scheduled").length +
                      (data?.requests.filter((a) => a.status === "requested").length ?? 0),
                  ),
                  label: "zu bestätigen / beantragt",
                  tone: "attention",
                },
                {
                  icon: "check",
                  value: String(data?.vacationDaysThisYear ?? "–"),
                  label: "Ferientage bewilligt (Jahr)",
                },
              ]
        }
      />
      {schedule.error && <LoadError message={schedule.error} onRetry={reload} />}
      <section className="card schedule-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">
              {mode === "month" ? monthLabel(base) : `${monthLabel(from)} · KW ${isoWeek(from)}`}
            </p>
            <h2 className="card-title">{team ? "Teamplanung" : mode === "month" ? "Dein Monat" : "Deine Woche"}</h2>
          </div>
          <div className="schedule-controls">
            {team && (
              <ScheduleSelect
                label="Wohnbereich"
                value={data?.careUnits.find((unit) => unit.id === unitId)?.name ?? ALL_UNITS}
                options={[ALL_UNITS, ...(data?.careUnits ?? []).map((unit) => unit.name)]}
                onChange={(name) => setUnitId(data?.careUnits.find((unit) => unit.name === name)?.id ?? "")}
              />
            )}
            <div className="schedule-view-switch" role="group" aria-label="Zeitraum wechseln">
              <button
                type="button"
                aria-label={mode === "week" ? "Vorherige Woche" : "Vorheriger Monat"}
                onClick={() => move(-1)}
              >
                <ModuleIcon name="chevron" className="previous" />
              </button>
              <button
                type="button"
                aria-label={mode === "week" ? "Nächste Woche" : "Nächster Monat"}
                onClick={() => move(1)}
              >
                <ModuleIcon name="chevron" />
              </button>
            </div>
            <div className="schedule-view-switch" role="group" aria-label="Kalenderansicht">
              {(["week", "month"] as const).map((value) => (
                <button
                  key={value}
                  className={mode === value ? "active" : ""}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value);
                    setAnchor(day);
                    setSelected(day);
                  }}
                >
                  {value === "week" ? "Woche" : "Monat"}
                </button>
              ))}
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setAnchor(null);
                setSelected(null);
                showToast(`Auf heute, ${longDay(today)}, gesprungen`);
              }}
            >
              Heute
            </button>
          </div>
        </div>
        {mode === "week" ? (
          <div className="schedule-week">
            {visibleDays.map((d) => {
              const list = shiftsOn(d);
              const working = team ? list.length > 0 : list.some((shift) => myAssignment(shift)?.status !== "absent");
              const open = team && list.some((shift) => openSlots(shift) > 0);
              return (
                <button
                  className={`${day === d ? "active" : ""} ${d === today ? "today" : ""}`}
                  type="button"
                  key={d}
                  onClick={() => setSelected(d)}
                  aria-label={`${longDay(d)}${working ? ", Dienst geplant" : ""}${open ? ", offene Dienste" : ""}`}
                >
                  <strong>{WEEKDAYS[weekdayIndex(d)]}</strong>
                  <span>{shortDay(d)}</span>
                  <i
                    className={open ? "has-open" : working ? "has-shift" : absencesOn(d).length ? "has-absence" : ""}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="schedule-month">
            <div className="schedule-month-weekdays" aria-hidden="true">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="schedule-month-grid">
              {visibleDays.map((d) => {
                if (d.slice(0, 7) !== base.slice(0, 7))
                  return <span className="schedule-month-empty" aria-hidden="true" key={d} />;
                const list = shiftsOn(d);
                const mineToday = list.find((shift) => myAssignment(shift));
                const myStatus = mineToday ? myAssignment(mineToday)?.status : undefined;
                const absent = !team && (myStatus === "absent" || absencesOn(d).some((a) => a.status === "approved"));
                const open = list.reduce((sum, shift) => sum + openSlots(shift), 0);
                const label = team
                  ? list.length
                    ? open
                      ? `${open} offen`
                      : `${list.length} ${list.length === 1 ? "Dienst" : "Dienste"}`
                    : "–"
                  : absent
                    ? "Abwesend"
                    : mineToday
                      ? shortShiftLabel(mineToday.name)
                      : "Frei";
                return (
                  <button
                    className={`${day === d ? "active" : ""} ${d === today ? "today" : ""}`}
                    type="button"
                    key={d}
                    onClick={() => setSelected(d)}
                    aria-label={`${longDay(d)}, ${label}`}
                  >
                    <strong>{Number(d.slice(8, 10))}</strong>
                    <span
                      className={
                        absent ? "absent" : open ? "open" : list.length && (team || mineToday) ? "has-shift" : "free"
                      }
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="schedule-day-detail">
          <div>
            <p className="eyebrow">{longDay(day)}</p>
            <h3>{team ? "Besetzung" : "Deine Einsätze"}</h3>
            <p>
              {team
                ? `${data?.careUnits.find((unit) => unit.id === unitId)?.name ?? ALL_UNITS} · ${shiftsOn(day).length} ${shiftsOn(day).length === 1 ? "Dienst" : "Dienste"}`
                : (shiftsOn(day)[0]?.careUnit ?? "Keine Einteilung")}
            </p>
            {team && data?.canManage && day >= today && (
              <button
                className="quiet-button schedule-day-add"
                type="button"
                onClick={() => setDialog({ kind: "duty", day })}
              >
                <ModuleIcon name="plus" /> Dienst an diesem Tag einteilen
              </button>
            )}
          </div>
          <div className="schedule-day-list">
            {!data && schedule.loading && <p className="list-hint">Dienstplan wird geladen …</p>}
            {data &&
              team &&
              shiftsOn(day).map((shift) => {
                const open = openSlots(shift);
                const future = Date.parse(shift.endsAt) > now;
                return (
                  <div className={`schedule-shift-group ${shift.highlight ? "highlight" : ""}`} key={shift.id}>
                    <header>
                      <strong>
                        {shift.name} · {times(shift)}
                      </strong>
                      <small>
                        {shift.careUnit ?? "Ohne Wohnbereich"} · {activeAssignments(shift).length}/{shift.requiredStaff}{" "}
                        besetzt
                        {shift.note ? ` · ${shift.note}` : ""}
                      </small>
                    </header>
                    <div className="schedule-team-grid">
                      {shift.assignments.map((assignment) => (
                        <button
                          type="button"
                          key={assignment.id}
                          className={assignment.status === "absent" ? "absent" : ""}
                          disabled={!data.canManage || !future || Boolean(assignment.checkedInAt)}
                          title={data.canManage && future ? "Einteilung entfernen" : undefined}
                          onClick={() => setDialog({ kind: "remove", shift, assignment })}
                        >
                          <span className="avatar">{personInitials(assignment.name)}</span>
                          <span>
                            <strong>{assignment.name}</strong>
                            <small>
                              {assignment.status === "absent"
                                ? `Abwesend · ${assignment.absenceReason ?? ""}`
                                : `${assignment.role ?? "Mitarbeitende:r"} · ${assignment.checkedInAt ? "im Dienst" : ASSIGNMENT_STATUS[assignment.status].label}`}
                            </small>
                          </span>
                        </button>
                      ))}
                      {Array.from({ length: future ? open : 0 }, (_, index) => (
                        <button
                          type="button"
                          key={`open-${index}`}
                          className="open-slot"
                          disabled={busy}
                          onClick={() =>
                            data.canManage
                              ? setDialog({ kind: "assign", shift })
                              : run(`/api/schedule/shifts/${shift.id}`, { action: "take" }, "Dienst übernommen")
                          }
                        >
                          <span className="avatar">
                            <ModuleIcon name="plus" />
                          </span>
                          <span>
                            <strong>Offener Dienst</strong>
                            <small>{data.canManage ? "Person einteilen" : "Dienst übernehmen"}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                    {data.canManage && future && !activeAssignments(shift).length && (
                      <button
                        className="quiet-button"
                        type="button"
                        onClick={() => setDialog({ kind: "cancelShift", shift })}
                      >
                        Dienst streichen
                      </button>
                    )}
                  </div>
                );
              })}
            {data &&
              !team &&
              shiftsOn(day).map((shift) => {
                const assignment = myAssignment(shift);
                if (!assignment) return null;
                const status = assignment.checkedOutAt
                  ? { label: "Geleistet", tone: "stable" }
                  : assignment.checkedInAt
                    ? { label: "Im Dienst", tone: "info" }
                    : ASSIGNMENT_STATUS[assignment.status];
                return (
                  <div className="schedule-shift-detail" key={shift.id}>
                    <span className="schedule-shift-icon">
                      <ModuleIcon name="shift" />
                    </span>
                    <span>
                      <strong>
                        {times(shift)} · {shift.name}
                      </strong>
                      <small>
                        {assignment.status === "absent"
                          ? `Abwesend · ${assignment.absenceReason ?? ""}`
                          : [shift.careUnit, assignment.role, shift.note].filter(Boolean).join(" · ")}
                      </small>
                    </span>
                    {assignment.status === "scheduled" && Date.parse(shift.startsAt) > now ? (
                      <button
                        className="primary-button schedule-confirm"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(`/api/schedule/assignments/${assignment.id}`, { action: "confirm" }, "Dienst bestätigt")
                        }
                      >
                        <ModuleIcon name="check" /> Bestätigen
                      </button>
                    ) : (
                      <span className={`status-badge ${status.tone}`}>{status.label}</span>
                    )}
                  </div>
                );
              })}
            {data &&
              absencesOn(day).map((absence) => (
                <div className="schedule-shift-detail absence" key={absence.id}>
                  <span className="schedule-shift-icon">
                    <ModuleIcon name="calendar" />
                  </span>
                  <span>
                    <strong>
                      {team ? `${absence.name} · ` : ""}
                      {ABSENCE_KINDS[absence.kind]}
                    </strong>
                    <small>
                      {shortDay(absence.startsOn)} – {shortDay(absence.endsOn)}
                      {absence.substituteName ? ` · Vertretung ${absence.substituteName}` : ""}
                    </small>
                  </span>
                  <span className={`status-badge ${ABSENCE_STATUS[absence.status].tone}`}>
                    {ABSENCE_STATUS[absence.status].label}
                  </span>
                </div>
              ))}
            {data && !shiftsOn(day).length && !absencesOn(day).length && (
              <div className="schedule-shift-detail">
                <span className="schedule-shift-icon">
                  <ModuleIcon name="shift" />
                </span>
                <span>
                  <strong>{team ? "Keine Dienste" : "Frei"}</strong>
                  <small>{team ? "Für diesen Tag ist noch nichts geplant." : "Keine Einteilung geplant"}</small>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
      {data && (
        <AbsenceList
          data={data}
          team={team}
          run={(url, body, message) => void run(url, body, message)}
          setDialog={setDialog}
        />
      )}
      {data && dialog?.kind === "absence" && (
        <AbsenceEditor
          data={data}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            showToast(message);
          }}
        />
      )}
      {data && dialog?.kind === "duty" && (
        <DutyAssignmentEditor
          data={data}
          preset={{ day: dialog.day || day, careUnitId: unitId || null }}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            showToast(message);
          }}
        />
      )}
      {data && dialog?.kind === "assign" && (
        <AssignDialog
          shift={dialog.shift}
          data={data}
          onClose={() => setDialog(null)}
          onDone={(message) => {
            setDialog(null);
            showToast(message);
          }}
        />
      )}
      {dialog?.kind === "remove" && (
        <EditorDialog
          id="duty-remove"
          eyebrow="CareCore Schedule · Teamplanung"
          title="Einteilung entfernen"
          description={`${dialog.assignment.name} · ${dialog.shift.name} am ${longDay(dialog.shift.day)} (${times(dialog.shift)}). Der Platz bleibt als offener Dienst bestehen; die Person wird benachrichtigt.`}
          onClose={() => setDialog(null)}
          onSubmit={async () => {
            await run(`/api/schedule/assignments/${dialog.assignment.id}`, { action: "remove" }, "Einteilung entfernt");
            setDialog(null);
          }}
          saving={busy}
          error=""
          submitLabel="Entfernen"
          danger
        >
          {null}
        </EditorDialog>
      )}
      {dialog?.kind === "cancelShift" && (
        <ReasonDialog
          eyebrow="CareCore Schedule · Teamplanung"
          title="Dienst streichen"
          description={`${dialog.shift.name} am ${longDay(dialog.shift.day)} wird nicht mehr benötigt.`}
          label="Grund"
          placeholder="z. B. Belegung gesunken, doppelt geplant"
          submitLabel="Dienst streichen"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            await requestJson(`/api/schedule/shifts/${dialog.shift.id}`, {
              method: "POST",
              body: { action: "cancel", reason },
            });
            notifyOperationsChanged();
            setDialog(null);
            showToast("Dienst gestrichen");
          }}
        />
      )}
      {(dialog?.kind === "reject" || dialog?.kind === "revoke") && (
        <ReasonDialog
          eyebrow="CareCore Schedule · Abwesenheiten"
          title={dialog.kind === "reject" ? "Antrag ablehnen" : "Abwesenheit aufheben"}
          description={`${dialog.absence.name}: ${ABSENCE_KINDS[dialog.absence.kind]} ${shortDay(dialog.absence.startsOn)} – ${shortDay(dialog.absence.endsOn)}.${dialog.kind === "revoke" ? " Künftige Dienste werden der Person wieder zugeteilt." : ""}`}
          label="Begründung"
          placeholder="Die Person sieht diese Begründung."
          submitLabel={dialog.kind === "reject" ? "Ablehnen" : "Aufheben"}
          danger
          onClose={() => setDialog(null)}
          onConfirm={async (note) => {
            const result = await requestJson<{ affected: number }>(`/api/schedule/absences/${dialog.absence.id}`, {
              method: "POST",
              body: { action: dialog.kind, note },
            });
            notifyOperationsChanged();
            setDialog(null);
            showToast(
              dialog.kind === "reject"
                ? "Antrag abgelehnt"
                : `Abwesenheit aufgehoben · ${result.affected} ${result.affected === 1 ? "Dienst" : "Dienste"} wieder zugeteilt`,
            );
          }}
        />
      )}
    </>
  );
}

export default function ScheduleWorkspace({ team }: { team: boolean }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [canManage, setCanManage] = useState(false);
  const planning = team && canManage;
  return (
    <OperationsFrame
      module="schedule"
      child={team ? "Teamplanung" : "Mein Dienstplan"}
      view={team ? "teamSchedule" : "schedule"}
      eyebrow="CareCore Schedule"
      title={team ? "Teamplanung" : "Mein Dienstplan"}
      description={
        team
          ? "Besetzung, Rollen und offene Dienste im gesamten Team."
          : "Deine Einsätze, Arbeitszeiten und Abwesenheiten auf einen Blick."
      }
      action={{
        label: planning ? "Dienst einteilen" : "Abwesenheit melden",
        onClick: () => setDialog(planning ? { kind: "duty", day: "" } : { kind: "absence" }),
      }}
    >
      {(showToast) => (
        <ScheduleView
          team={team}
          showToast={showToast}
          dialog={dialog}
          setDialog={setDialog}
          onCanManage={setCanManage}
        />
      )}
    </OperationsFrame>
  );
}

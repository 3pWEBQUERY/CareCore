"use client";

import { useState, type FormEvent } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { EditorDialog, requestJson } from "@/app/components/workspace-ui";
import {
  ASSIGNMENT_STATUS,
  DUTY_REPEAT,
  DUTY_ROLES,
  activeAssignments,
  type DutyRepeat,
  type SchedulePayload,
  type ScheduleShift,
} from "@/lib/schedule-shared";
import { SHIFT_TYPES, type ShiftType } from "@/lib/shift-shared";
import { ScheduleDatePicker, ScheduleSelect, formatScheduleDate, notifyOperationsChanged } from "./operations-ui";
import { CUSTOM, OPEN, addDays, shortDay, longDay, times } from "./schedule-utils";

export function DutyAssignmentEditor({
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

export function AssignDialog({
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

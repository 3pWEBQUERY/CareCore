"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-page-shell";
import { OperationsFrame, ScheduleDatePicker, ScheduleSelect, Summary, formatScheduleDate } from "./operations-ui";

// Duty schedule views; still based on sample data until the schedule module is connected.
type OperationsView = "schedule" | "teamSchedule";

function AbsenceEditor({
  open,
  onClose,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
}) {
  const [absenceType, setAbsenceType] = useState("Ferien");
  const [substitute, setSubstitute] = useState("Keine Stellvertretung");
  const [priority, setPriority] = useState("Normal");
  const [fromDate, setFromDate] = useState("2026-09-21");
  const [toDate, setToDate] = useState("2026-09-23");
  if (!open) return null;
  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
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
        <form
          className="area-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
            showToast(
              `Abwesenheit vom ${formatScheduleDate(fromDate)} bis ${formatScheduleDate(toDate)} wurde gemeldet`,
            );
          }}
        >
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="calendar" />
            </span>
            <div>
              <strong>Neue Abwesenheit</strong>
              <p>Die Leitung wird über deine Meldung informiert und prüft die Abdeckung.</p>
            </div>
          </div>
          <div className="area-editor-grid">
            <label>
              Art der Abwesenheit
              <ScheduleSelect
                label="Art der Abwesenheit"
                value={absenceType}
                options={["Ferien", "Krankheit", "Weiterbildung", "Persönlicher Termin"]}
                onChange={setAbsenceType}
              />
            </label>
            <label>
              Priorität
              <ScheduleSelect
                label="Priorität"
                value={priority}
                options={["Normal", "Dringend"]}
                onChange={setPriority}
              />
            </label>
            <label>
              Von
              <ScheduleDatePicker label="Von" value={fromDate} onChange={setFromDate} />
            </label>
            <label>
              Bis
              <ScheduleDatePicker label="Bis" value={toDate} onChange={setToDate} />
            </label>
            <label className="area-editor-wide">
              Stellvertretung
              <ScheduleSelect
                label="Stellvertretung"
                value={substitute}
                options={["Keine Stellvertretung", "Lea Frei", "Nora Baumann", "Sven Keller"]}
                onChange={setSubstitute}
              />
            </label>
            <label className="area-editor-wide">
              Hinweis oder Bemerkung
              <textarea placeholder="z. B. Übergabe an das Team, Erreichbarkeit …" rows={5} />
            </label>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit">
              <ModuleIcon name="check" /> Abwesenheit melden
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function DutyAssignmentEditor({
  open,
  onClose,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
}) {
  const [member, setMember] = useState("Anna Meier");
  const [unit, setUnit] = useState("Wohnbereich 2");
  const [shift, setShift] = useState("Frühdienst");
  const [date, setDate] = useState("2026-09-15");
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("15:30");
  const [role, setRole] = useState("Pflegefachfrau HF");
  const [status, setStatus] = useState("Entwurf");
  const [repeat, setRepeat] = useState("Einmalig");
  const [note, setNote] = useState("");
  if (!open) return null;
  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
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
        <form
          className="area-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
            showToast(`${member} wurde am ${formatScheduleDate(date)} für den ${shift} eingeteilt`);
          }}
        >
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="calendar" />
            </span>
            <div>
              <strong>Neue Diensteinteilung</strong>
              <p>Die Einteilung wird im Teamkalender sichtbar und kann später angepasst werden.</p>
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
                value={member}
                options={teamMembers.map((person) => person.name)}
                onChange={setMember}
              />
            </label>
            <label>
              Wohnbereich
              <ScheduleSelect
                label="Wohnbereich"
                value={unit}
                options={["Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Nachtwache Haus"]}
                onChange={setUnit}
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
                options={["Frühdienst", "Spätdienst", "Nachtwache", "Bereitschaft"]}
                onChange={setShift}
              />
            </label>
            <label>
              Beginn
              <ScheduleSelect
                label="Beginn"
                value={start}
                options={["06:30", "07:00", "07:30", "08:00", "13:30", "21:30"]}
                onChange={setStart}
              />
            </label>
            <label>
              Ende
              <ScheduleSelect
                label="Ende"
                value={end}
                options={["14:30", "15:00", "15:30", "16:30", "22:00", "06:30"]}
                onChange={setEnd}
              />
            </label>
            <label>
              Rolle im Dienst
              <ScheduleSelect
                label="Rolle im Dienst"
                value={role}
                options={["Pflegefachfrau HF", "Fachfrau Gesundheit", "Pflegeassistent", "Teamleitung"]}
                onChange={setRole}
              />
            </label>
            <label>
              Planungsstatus
              <ScheduleSelect
                label="Planungsstatus"
                value={status}
                options={["Entwurf", "Bestätigt", "Offen"]}
                onChange={setStatus}
              />
            </label>
            <label>
              Wiederholung
              <ScheduleSelect
                label="Wiederholung"
                value={repeat}
                options={["Einmalig", "Jeden Montag", "Wochentags", "Individuell"]}
                onChange={setRepeat}
              />
            </label>
            <label className="area-editor-wide">
              Hinweis für das Team
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="z. B. Schwerpunkt, Übergabe oder besondere Zuständigkeit …"
                rows={4}
              />
            </label>
            <fieldset className="area-editor-wide duty-assignment-options">
              <legend>Zusätzliche Hinweise</legend>
              <div className="area-service-options">
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>Im Teamkalender hervorheben</span>
                </label>
                <label>
                  <input type="checkbox" />
                  <span>Erinnerung 24 Stunden vorher</span>
                </label>
                <label>
                  <input type="checkbox" />
                  <span>Übergabe einplanen</span>
                </label>
              </div>
            </fieldset>
          </div>
          <div className="duty-assignment-summary">
            <span>
              <strong>{member}</strong>
              <small>
                {unit} · {shift}
              </small>
            </span>
            <span>
              <strong>{formatScheduleDate(date)}</strong>
              <small>
                {start}–{end} · {status}
              </small>
            </span>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit">
              <ModuleIcon name="check" /> Dienst einteilen
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

const viewMeta: Record<
  OperationsView,
  { module: string; child: string; eyebrow: string; title: string; description: string; action: string }
> = {
  schedule: {
    module: "schedule",
    child: "Mein Dienstplan",
    eyebrow: "CareCore Schedule",
    title: "Mein Dienstplan",
    description: "Deine Einsätze, Arbeitszeiten und Abwesenheiten auf einen Blick.",
    action: "Abwesenheit melden",
  },
  teamSchedule: {
    module: "schedule",
    child: "Teamplanung",
    eyebrow: "CareCore Schedule",
    title: "Teamplanung",
    description: "Besetzung, Rollen und offene Dienste im gesamten Team.",
    action: "Dienst einteilen",
  },
};

const days = [
  { day: "Mo", date: "14.09.", shifts: ["07:00–15:30", ""] },
  { day: "Di", date: "15.09.", shifts: ["13:30–22:00", ""] },
  { day: "Mi", date: "16.09.", shifts: ["", "07:00–15:30"] },
  { day: "Do", date: "17.09.", shifts: ["07:00–15:30", ""] },
  { day: "Fr", date: "18.09.", shifts: ["", ""] },
  { day: "Sa", date: "19.09.", shifts: ["08:00–16:30", ""] },
  { day: "So", date: "20.09.", shifts: ["", ""] },
];

const monthShiftTimes: Record<number, string> = {
  1: "07:00–15:30",
  2: "13:30–22:00",
  3: "07:00–15:30",
  4: "08:00–16:30",
  5: "Frei",
  7: "07:00–15:30",
  8: "13:30–22:00",
  9: "07:00–15:30",
  10: "07:00–15:30",
  11: "Frei",
  14: "07:00–15:30",
  15: "13:30–22:00",
  16: "07:00–15:30",
  17: "07:00–15:30",
  18: "Frei",
  19: "08:00–16:30",
  21: "07:00–15:30",
  22: "13:30–22:00",
  23: "07:00–15:30",
  24: "07:00–15:30",
  25: "Frei",
  28: "07:00–15:30",
  29: "13:30–22:00",
  30: "07:00–15:30",
};
const monthShiftCount = Object.values(monthShiftTimes).filter((shift) => shift && shift !== "Frei").length;
const weekdayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const monthDays = Array.from({ length: 30 }, (_, index) => {
  const dayNumber = index + 1;
  const weekdayIndex = dayNumber % 7;
  const shift = monthShiftTimes[dayNumber] ?? "";
  return {
    day: weekdayNames[weekdayIndex],
    date: `${String(dayNumber).padStart(2, "0")}.09.`,
    dayNumber,
    weekdayIndex,
    shifts: [shift, ""],
  };
});
const monthCalendarCells: Array<(typeof monthDays)[number] | null> = [null, ...monthDays];

function shortShiftLabel(shift: string) {
  if (!shift || shift === "Frei") return "Frei";
  if (shift.startsWith("07:")) return "Früh";
  if (shift.startsWith("13:")) return "Spät";
  return "Dienst";
}

function shiftDetailLabel(shift: string) {
  if (shift.startsWith("13:")) return "Spätdienst";
  if (shift.startsWith("08:")) return "Dienst";
  return "Frühdienst";
}

const teamMembers = [
  {
    initials: "AM",
    name: "Anna Meier",
    role: "Pflegefachfrau HF",
    shifts: ["Frühdienst", "Spätdienst", "", "Frühdienst", "Frühdienst", "Frei", "Frei"],
  },
  {
    initials: "LF",
    name: "Lea Frei",
    role: "Fachfrau Gesundheit",
    shifts: ["Frühdienst", "Frühdienst", "Spätdienst", "", "Frühdienst", "Frühdienst", "Frei"],
  },
  {
    initials: "NB",
    name: "Nora Baumann",
    role: "Pflegefachfrau HF",
    shifts: ["Spätdienst", "Frühdienst", "Frühdienst", "Spätdienst", "", "Frei", "Frei"],
  },
  {
    initials: "SK",
    name: "Sven Keller",
    role: "Pflegeassistent",
    shifts: ["", "Spätdienst", "Spätdienst", "Frühdienst", "Frühdienst", "Spätdienst", "Frei"],
  },
  {
    initials: "MW",
    name: "Dr. Martin Weber",
    role: "Hausarzt · Belegarzt",
    shifts: ["Visite", "", "Visite", "", "Visite", "", ""],
  },
];

function ScheduleView({ team, showToast }: { team: boolean; showToast: (message: string) => void }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMonthDay, setSelectedMonthDay] = useState(14);
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");
  const [selectedMember, setSelectedMember] = useState("AM");
  const selectedScheduleDay =
    calendarMode === "month"
      ? monthDays[selectedMonthDay - 1]
      : { ...days[selectedDay], dayNumber: 14 + selectedDay, weekdayIndex: selectedDay };
  const selectedShift = selectedScheduleDay.shifts[0] || selectedScheduleDay.shifts[1] || "";
  return (
    <>
      <Summary
        items={[
          {
            icon: "calendar",
            value: team ? "32" : calendarMode === "month" ? `${monthShiftCount}` : "5",
            label: team ? "Dienste geplant" : calendarMode === "month" ? "Dienste im Monat" : "Dienste diese Woche",
          },
          { icon: "residents", value: team ? "92%" : "36 h", label: team ? "Besetzung" : "Arbeitszeit", tone: "info" },
          {
            icon: "alert",
            value: team ? "3" : "1",
            label: team ? "offene Dienste" : "Änderungsanfragen",
            tone: "attention",
          },
          { icon: "check", value: team ? "18" : "0", label: team ? "Bestätigt" : "Ferientage" },
        ]}
      />
      <section className="card schedule-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{calendarMode === "month" ? "September 2026" : "September 2026 · KW 38"}</p>
            <h2 className="card-title">
              {team ? "Teamplanung" : calendarMode === "month" ? "Dein Monat" : "Deine Woche"}
            </h2>
          </div>
          <div className="schedule-controls">
            <div className="schedule-view-switch" role="group" aria-label="Kalenderansicht">
              <button
                className={calendarMode === "week" ? "active" : ""}
                type="button"
                aria-pressed={calendarMode === "week"}
                onClick={() => setCalendarMode("week")}
              >
                Woche
              </button>
              <button
                className={calendarMode === "month" ? "active" : ""}
                type="button"
                aria-pressed={calendarMode === "month"}
                onClick={() => setCalendarMode("month")}
              >
                Monat
              </button>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setCalendarMode("month");
                setSelectedMonthDay(14);
                setSelectedDay(0);
                showToast("Auf heute, 14. September, gesprungen");
              }}
            >
              Heute
            </button>
          </div>
        </div>
        {calendarMode === "week" ? (
          <div className="schedule-week">
            {days.map((day, index) => (
              <button
                className={selectedDay === index ? "active" : ""}
                type="button"
                key={day.date}
                onClick={() => setSelectedDay(index)}
              >
                <strong>{day.day}</strong>
                <span>{day.date}</span>
                <i className={day.shifts[0] || day.shifts[1] ? "has-shift" : ""} />
              </button>
            ))}
          </div>
        ) : (
          <div className="schedule-month">
            <div className="schedule-month-weekdays" aria-hidden="true">
              {weekdayNames.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="schedule-month-grid">
              {monthCalendarCells.map((day, index) =>
                day ? (
                  <button
                    className={selectedMonthDay === day.dayNumber ? "active" : ""}
                    type="button"
                    key={day.dayNumber}
                    onClick={() => setSelectedMonthDay(day.dayNumber)}
                    aria-label={`${day.day}. September 2026, ${day.shifts[0] || "frei"}`}
                  >
                    <strong>{day.dayNumber}</strong>
                    <span className={day.shifts[0] ? "has-shift" : "free"}>{shortShiftLabel(day.shifts[0])}</span>
                  </button>
                ) : (
                  <span className="schedule-month-empty" aria-hidden="true" key={`empty-${index}`} />
                ),
              )}
            </div>
          </div>
        )}
        <div className="schedule-day-detail">
          <div>
            <p className="eyebrow">
              {selectedScheduleDay.day}, {selectedScheduleDay.date}
            </p>
            <h3>{team ? "Besetzung im Wohnbereich" : "Deine Einsätze"}</h3>
            <p>{team ? "Wohnbereich 2 · Früh- und Spätdienst" : "Wohnbereich 2 · 1. OG"}</p>
          </div>
          {team ? (
            <div className="schedule-team-grid">
              {teamMembers.slice(0, 4).map((member) => (
                <button
                  type="button"
                  key={member.initials}
                  onClick={() => setSelectedMember(member.initials)}
                  className={selectedMember === member.initials ? "selected" : ""}
                >
                  <span className="avatar">{member.initials}</span>
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.shifts[selectedScheduleDay.weekdayIndex] || "Frei"}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="schedule-shift-detail">
              <span className="schedule-shift-icon">
                <ModuleIcon name="shift" />
              </span>
              <span>
                <strong>{selectedShift || "Frei"}</strong>
                <small>
                  {selectedShift
                    ? `${shiftDetailLabel(selectedShift)} · Pflegefachfrau HF`
                    : "Keine Einteilung geplant"}
                </small>
              </span>
              <span className="status-badge stable">Bestätigt</span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function OperationsWorkspace({ view }: { view: OperationsView }) {
  const meta = viewMeta[view];
  const [absenceEditorOpen, setAbsenceEditorOpen] = useState(false);
  const [dutyEditorOpen, setDutyEditorOpen] = useState(false);
  return (
    <OperationsFrame
      module={meta.module}
      child={meta.child}
      view={view}
      eyebrow={meta.eyebrow}
      title={meta.title}
      description={meta.description}
      action={{
        label: meta.action,
        onClick: () => (view === "schedule" ? setAbsenceEditorOpen(true) : setDutyEditorOpen(true)),
      }}
    >
      {(showToast) => (
        <>
          <AbsenceEditor open={absenceEditorOpen} onClose={() => setAbsenceEditorOpen(false)} showToast={showToast} />
          <DutyAssignmentEditor open={dutyEditorOpen} onClose={() => setDutyEditorOpen(false)} showToast={showToast} />
          <ScheduleView team={view === "teamSchedule"} showToast={showToast} />
        </>
      )}
    </OperationsFrame>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import ModulePageShell, { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";

type OperationsView = "shift" | "shiftHistory" | "tasks" | "teamTasks" | "handover" | "lastShift" | "schedule" | "teamSchedule" | "assessments" | "assessmentDue";
type Tone = "stable" | "attention" | "critical" | "info";
type Task = { id: string; time: string; title: string; detail: string; category: string; tone: Tone; owner?: string; due?: string; status?: string };
type Assessment = { id: string; resident: string; room: string; type: string; score: string; status: string; tone: Tone; updated: string; next: string; dueTime?: string; owner?: string };

function ScheduleSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  const toggle = () => setOpen((current) => {
    if (!current) {
      const rect = rootRef.current?.getBoundingClientRect();
      const menuHeight = options.length * 42 + 16;
      setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight));
    } else setOpenUp(false);
    return !current;
  });
  return <div className="area-custom-select" ref={rootRef}><button className="area-select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={toggle}><span>{value}</span><ModuleIcon name="caretDown" className={open ? "open" : ""}/></button>{open && <div className={`area-select-menu ${openUp ? "up" : ""}`} role="listbox" aria-label={label}>{options.map((option) => <button type="button" role="option" aria-selected={value === option} className={value === option ? "selected" : ""} key={option} onClick={() => { onChange(option); setOpen(false); setOpenUp(false); }}>{option}<ModuleIcon name="check"/></button>)}</div>}</div>;
}

function formatScheduleDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ScheduleDatePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(`${value}T12:00:00`));
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const calendarDays: Array<number | null> = [...Array.from({ length: offset }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthLabel = viewMonth.toLocaleDateString("de-CH", { month: "long", year: "numeric" });
  const toggle = () => setOpen((current) => {
    if (!current) {
      const rect = rootRef.current?.getBoundingClientRect();
      setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < 350 && rect.top > 350));
    } else setOpenUp(false);
    return !current;
  });
  const selectDay = (day: number) => { const next = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; onChange(next); setOpen(false); setOpenUp(false); };
  return <div className="schedule-date-picker" ref={rootRef}><button className="schedule-date-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={toggle}><span>{formatScheduleDate(value)}</span><ModuleIcon name="calendar"/></button>{open && <div className={`schedule-date-menu ${openUp ? "up" : ""}`} role="dialog" aria-label={`${label} auswählen`}><div className="schedule-date-menu-header"><button type="button" aria-label="Vorheriger Monat" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ModuleIcon name="chevron" className="previous"/></button><strong>{monthLabel}</strong><button type="button" aria-label="Nächster Monat" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ModuleIcon name="chevron"/></button></div><div className="schedule-date-weekdays">{["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => <span key={day}>{day}</span>)}</div><div className="schedule-date-grid">{calendarDays.map((day, index) => day ? <button type="button" key={day} className={value === `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` ? "selected" : ""} onClick={() => selectDay(day)}>{day}</button> : <span aria-hidden="true" key={`empty-${index}`}/>)}</div><div className="schedule-date-menu-footer"><span>{formatScheduleDate(value)}</span><button type="button" onClick={() => { setViewMonth(new Date("2026-09-14T12:00:00")); onChange("2026-09-14"); setOpen(false); }}>Heute</button></div></div>}</div>;
}

function AbsenceEditor({ open, onClose, showToast }: { open: boolean; onClose: () => void; showToast: (message: string) => void }) {
  const [absenceType, setAbsenceType] = useState("Ferien");
  const [substitute, setSubstitute] = useState("Keine Stellvertretung");
  const [priority, setPriority] = useState("Normal");
  const [fromDate, setFromDate] = useState("2026-09-21");
  const [toDate, setToDate] = useState("2026-09-23");
  if (!open) return null;
  return <div className="area-editor-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}><section className="area-editor-panel" role="dialog" aria-modal="true" aria-labelledby="absence-editor-title"><header className="area-editor-header"><div><p className="eyebrow">CareCore Schedule · Abwesenheiten</p><h2 id="absence-editor-title">Abwesenheit melden</h2><p>Erfasse deine Abwesenheit, damit die Dienstplanung rechtzeitig angepasst werden kann.</p></div><button className="area-editor-close" type="button" onClick={onClose} aria-label="Abwesenheitseditor schliessen">×</button></header><form className="area-editor-form" onSubmit={(event) => { event.preventDefault(); onClose(); showToast(`Abwesenheit vom ${formatScheduleDate(fromDate)} bis ${formatScheduleDate(toDate)} wurde gemeldet`); }}><div className="area-editor-intro"><span className="area-editor-icon"><ModuleIcon name="calendar"/></span><div><strong>Neue Abwesenheit</strong><p>Die Leitung wird über deine Meldung informiert und prüft die Abdeckung.</p></div></div><div className="area-editor-grid"><label>Art der Abwesenheit<ScheduleSelect label="Art der Abwesenheit" value={absenceType} options={["Ferien", "Krankheit", "Weiterbildung", "Persönlicher Termin"]} onChange={setAbsenceType}/></label><label>Priorität<ScheduleSelect label="Priorität" value={priority} options={["Normal", "Dringend"]} onChange={setPriority}/></label><label>Von<ScheduleDatePicker label="Von" value={fromDate} onChange={setFromDate}/></label><label>Bis<ScheduleDatePicker label="Bis" value={toDate} onChange={setToDate}/></label><label className="area-editor-wide">Stellvertretung<ScheduleSelect label="Stellvertretung" value={substitute} options={["Keine Stellvertretung", "Lea Frei", "Nora Baumann", "Sven Keller"]} onChange={setSubstitute}/></label><label className="area-editor-wide">Hinweis oder Bemerkung<textarea placeholder="z. B. Übergabe an das Team, Erreichbarkeit …" rows={5}/></label></div><footer className="area-editor-actions"><button className="secondary-button" type="button" onClick={onClose}>Abbrechen</button><button className="primary-button" type="submit"><ModuleIcon name="check"/> Abwesenheit melden</button></footer></form></section></div>;
}

function DutyAssignmentEditor({ open, onClose, showToast }: { open: boolean; onClose: () => void; showToast: (message: string) => void }) {
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
  return <div className="area-editor-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}><section className="area-editor-panel duty-editor-panel" role="dialog" aria-modal="true" aria-labelledby="duty-editor-title"><header className="area-editor-header"><div><p className="eyebrow">CareCore Schedule · Teamplanung</p><h2 id="duty-editor-title">Dienst einteilen</h2><p>Plane einen Dienst für dein Team und hinterlege alle Informationen für eine verlässliche Besetzung.</p></div><button className="area-editor-close" type="button" onClick={onClose} aria-label="Diensteditor schliessen">×</button></header><form className="area-editor-form" onSubmit={(event) => { event.preventDefault(); onClose(); showToast(`${member} wurde am ${formatScheduleDate(date)} für den ${shift} eingeteilt`); }}><div className="area-editor-intro"><span className="area-editor-icon"><ModuleIcon name="calendar"/></span><div><strong>Neue Diensteinteilung</strong><p>Die Einteilung wird im Teamkalender sichtbar und kann später angepasst werden.</p></div><span className="duty-assignment-status"><i/>Planung aktiv</span></div><div className="area-editor-grid"><label>Mitarbeiterin oder Mitarbeiter<ScheduleSelect label="Mitarbeiterin oder Mitarbeiter" value={member} options={teamMembers.map((person) => person.name)} onChange={setMember}/></label><label>Wohnbereich<ScheduleSelect label="Wohnbereich" value={unit} options={["Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Nachtwache Haus"]} onChange={setUnit}/></label><label>Datum<ScheduleDatePicker label="Datum" value={date} onChange={setDate}/></label><label>Dienst<ScheduleSelect label="Dienst" value={shift} options={["Frühdienst", "Spätdienst", "Nachtwache", "Bereitschaft"]} onChange={setShift}/></label><label>Beginn<ScheduleSelect label="Beginn" value={start} options={["06:30", "07:00", "07:30", "08:00", "13:30", "21:30"]} onChange={setStart}/></label><label>Ende<ScheduleSelect label="Ende" value={end} options={["14:30", "15:00", "15:30", "16:30", "22:00", "06:30"]} onChange={setEnd}/></label><label>Rolle im Dienst<ScheduleSelect label="Rolle im Dienst" value={role} options={["Pflegefachfrau HF", "Fachfrau Gesundheit", "Pflegeassistent", "Teamleitung"]} onChange={setRole}/></label><label>Planungsstatus<ScheduleSelect label="Planungsstatus" value={status} options={["Entwurf", "Bestätigt", "Offen"]} onChange={setStatus}/></label><label>Wiederholung<ScheduleSelect label="Wiederholung" value={repeat} options={["Einmalig", "Jeden Montag", "Wochentags", "Individuell"]} onChange={setRepeat}/></label><label className="area-editor-wide">Hinweis für das Team<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="z. B. Schwerpunkt, Übergabe oder besondere Zuständigkeit …" rows={4}/></label><fieldset className="area-editor-wide duty-assignment-options"><legend>Zusätzliche Hinweise</legend><div className="area-service-options"><label><input type="checkbox" defaultChecked/><span>Im Teamkalender hervorheben</span></label><label><input type="checkbox"/><span>Erinnerung 24 Stunden vorher</span></label><label><input type="checkbox"/><span>Übergabe einplanen</span></label></div></fieldset></div><div className="duty-assignment-summary"><span><strong>{member}</strong><small>{unit} · {shift}</small></span><span><strong>{formatScheduleDate(date)}</strong><small>{start}–{end} · {status}</small></span></div><footer className="area-editor-actions"><button className="secondary-button" type="button" onClick={onClose}>Abbrechen</button><button className="primary-button" type="submit"><ModuleIcon name="check"/> Dienst einteilen</button></footer></form></section></div>;
}

const viewMeta: Record<OperationsView, { module: string; child: string; eyebrow: string; title: string; description: string; action: string }> = {
  shift: { module: "shift", child: "Mein Dienst", eyebrow: "CareCore Shift", title: "Mein Dienst", description: "Dein persönlicher Schichtarbeitsplatz für heute.", action: "Dienst starten" },
  shiftHistory: { module: "shift", child: "Schichtverlauf", eyebrow: "CareCore Shift", title: "Schichtverlauf", description: "Abgeschlossene Dienste, Übergaben und dokumentierte Aktivitäten.", action: "Bericht exportieren" },
  tasks: { module: "tasks", child: "Meine Aufgaben", eyebrow: "CareCore Tasks", title: "Meine Aufgaben", description: "Alle offenen Aufgaben und Interventionen für deinen Dienst.", action: "Aufgabe erstellen" },
  teamTasks: { module: "tasks", child: "Teamaufgaben", eyebrow: "CareCore Tasks", title: "Teamaufgaben", description: "Aufgaben im Team verteilen, verfolgen und gemeinsam abschliessen.", action: "Teamaufgabe erstellen" },
  handover: { module: "handover", child: "Meine Übergabe", eyebrow: "CareCore Handover", title: "Meine Übergabe", description: "Wichtige Beobachtungen strukturiert an den nächsten Dienst übergeben.", action: "Übergabe veröffentlichen" },
  lastShift: { module: "handover", child: "Seit letztem Dienst", eyebrow: "CareCore Handover", title: "Seit letztem Dienst", description: "Veränderungen und Ereignisse seit deiner letzten Anwesenheit.", action: "Alles als gelesen markieren" },
  schedule: { module: "schedule", child: "Mein Dienstplan", eyebrow: "CareCore Schedule", title: "Mein Dienstplan", description: "Deine Einsätze, Arbeitszeiten und Abwesenheiten auf einen Blick.", action: "Abwesenheit melden" },
  teamSchedule: { module: "schedule", child: "Teamplanung", eyebrow: "CareCore Schedule", title: "Teamplanung", description: "Besetzung, Rollen und offene Dienste im gesamten Team.", action: "Dienst einteilen" },
  assessments: { module: "assess", child: "Einschätzungen", eyebrow: "CareCore Assess", title: "Einschätzungen", description: "Pflegefachliche Assessments zentral erfassen und fortschreiben.", action: "Assessment starten" },
  assessmentDue: { module: "assess", child: "Fälligkeiten", eyebrow: "CareCore Assess", title: "Fälligkeiten", description: "Anstehende und überfällige Einschätzungen sicher im Blick.", action: "Fälligkeit zuweisen" },
};

const shiftTasks: Task[] = [
  { id: "st1", time: "07:00", title: "Dienstübergabe", detail: "Wohnbereich 2 · Pflegezimmer", category: "Übergabe", tone: "info" },
  { id: "st2", time: "08:00", title: "Medikamentenrunde", detail: "4 Bewohner · 1 Anpassung", category: "Medikation", tone: "attention" },
  { id: "st3", time: "09:30", title: "Pflegevisite", detail: "Zimmer 101–106", category: "Pflege", tone: "stable" },
  { id: "st4", time: "11:00", title: "Wundversorgung", detail: "Herr Müller · Zimmer 101", category: "Wunde", tone: "attention" },
  { id: "st5", time: "13:00", title: "Angehörigengespräch", detail: "Frau Schneider · Zimmer 104", category: "Gespräch", tone: "info" },
];

const shiftHistory = [
  { date: "Freitag, 11. September 2026", time: "07:00–15:30", unit: "Wohnbereich 2", handover: "Vollständig", entries: 18, tone: "stable" as Tone },
  { date: "Donnerstag, 10. September 2026", time: "13:30–22:00", unit: "Wohnbereich 2", handover: "Vollständig", entries: 24, tone: "stable" as Tone },
  { date: "Mittwoch, 9. September 2026", time: "07:00–15:30", unit: "Wohnbereich 2", handover: "2 Hinweise offen", entries: 16, tone: "attention" as Tone },
  { date: "Dienstag, 8. September 2026", time: "07:00–15:30", unit: "Wohnbereich 1", handover: "Vollständig", entries: 21, tone: "stable" as Tone },
  { date: "Montag, 7. September 2026", time: "13:30–22:00", unit: "Wohnbereich 2", handover: "Vollständig", entries: 20, tone: "stable" as Tone },
];

const myTasks: Task[] = [
  { id: "t1", time: "08:30", title: "Trinkmenge dokumentieren", detail: "Peter Aebischer · Zimmer 115", category: "Ernährung", tone: "attention", due: "Heute fällig" },
  { id: "t2", time: "09:15", title: "Sturzprophylaxe evaluieren", detail: "Hans Müller · Pflegeakte", category: "Pflegeplanung", tone: "critical", due: "Überfällig" },
  { id: "t3", time: "10:00", title: "SpO₂ nach Mobilisation messen", detail: "Peter Aebischer · Zimmer 115", category: "Vitalwerte", tone: "info", due: "Heute fällig" },
  { id: "t4", time: "11:30", title: "Wundverband kontrollieren", detail: "Erika Meier · linker Unterarm", category: "Wundmanagement", tone: "attention", due: "Heute fällig" },
  { id: "t5", time: "14:00", title: "Angehörige zurückrufen", detail: "Maria Keller · Tochter informiert", category: "Kommunikation", tone: "info", due: "Geplant" },
  { id: "t6", time: "15:00", title: "Pflegebericht abschliessen", detail: "Wohnbereich 2 · Tagesabschluss", category: "Dokumentation", tone: "stable", due: "Geplant" },
];

const teamTasks = [
  { ...myTasks[1], owner: "Lea Frei", status: "In Bearbeitung" },
  { ...myTasks[3], owner: "Nora Baumann", status: "Offen" },
  { id: "tt1", time: "12:00", title: "Mittagsrunde vorbereiten", detail: "Medikationswagen · alle Stationen", category: "Medikation", tone: "info" as Tone, owner: "Sven Keller", status: "Offen" },
  { id: "tt2", time: "13:30", title: "Neuaufnahme begleiten", detail: "Zimmer 306 · Eintritt Walter Brunner", category: "Aufnahme", tone: "attention" as Tone, owner: "Anna Meier", status: "In Bearbeitung" },
  { id: "tt3", time: "16:00", title: "Materialwagen auffüllen", detail: "Pflegezimmer · Verbandmaterial", category: "Material", tone: "stable" as Tone, owner: "Lea Frei", status: "Erledigt" },
];

const handoverEvents = [
  { time: "07:42", title: "Vitalwerte erfasst", detail: "Hans Müller · Blutdruck 132/78, Puls 72/min", tone: "stable" as Tone },
  { time: "07:30", title: "Medikationsplan angepasst", detail: "Erika Meier · Metoprolol ab heute 50 mg", tone: "attention" as Tone },
  { time: "06:55", title: "Wundversorgung dokumentiert", detail: "Maria Keller · Verband trocken und reizlos", tone: "stable" as Tone },
  { time: "Gestern 21:10", title: "Sturzereignis", detail: "Hans Müller · nächtliche Kontrolle bis 14:00 Uhr", tone: "critical" as Tone },
  { time: "Gestern 18:40", title: "Angehörigenkontakt", detail: "Peter Aebischer · Tochter telefonisch informiert", tone: "info" as Tone },
];

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
  1: "07:00–15:30", 2: "13:30–22:00", 3: "07:00–15:30", 4: "08:00–16:30", 5: "Frei",
  7: "07:00–15:30", 8: "13:30–22:00", 9: "07:00–15:30", 10: "07:00–15:30", 11: "Frei",
  14: "07:00–15:30", 15: "13:30–22:00", 16: "07:00–15:30", 17: "07:00–15:30", 18: "Frei", 19: "08:00–16:30",
  21: "07:00–15:30", 22: "13:30–22:00", 23: "07:00–15:30", 24: "07:00–15:30", 25: "Frei",
  28: "07:00–15:30", 29: "13:30–22:00", 30: "07:00–15:30",
};
const monthShiftCount = Object.values(monthShiftTimes).filter((shift) => shift && shift !== "Frei").length;
const weekdayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const monthDays = Array.from({ length: 30 }, (_, index) => {
  const dayNumber = index + 1;
  const weekdayIndex = dayNumber % 7;
  const shift = monthShiftTimes[dayNumber] ?? "";
  return { day: weekdayNames[weekdayIndex], date: `${String(dayNumber).padStart(2, "0")}.09.`, dayNumber, weekdayIndex, shifts: [shift, ""] };
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
  { initials: "AM", name: "Anna Meier", role: "Pflegefachfrau HF", shifts: ["Frühdienst", "Spätdienst", "", "Frühdienst", "Frühdienst", "Frei", "Frei"] },
  { initials: "LF", name: "Lea Frei", role: "Fachfrau Gesundheit", shifts: ["Frühdienst", "Frühdienst", "Spätdienst", "", "Frühdienst", "Frühdienst", "Frei"] },
  { initials: "NB", name: "Nora Baumann", role: "Pflegefachfrau HF", shifts: ["Spätdienst", "Frühdienst", "Frühdienst", "Spätdienst", "", "Frei", "Frei"] },
  { initials: "SK", name: "Sven Keller", role: "Pflegeassistent", shifts: ["", "Spätdienst", "Spätdienst", "Frühdienst", "Frühdienst", "Spätdienst", "Frei"] },
  { initials: "MW", name: "Dr. Martin Weber", role: "Hausarzt · Belegarzt", shifts: ["Visite", "", "Visite", "", "Visite", "", ""] },
];

const assessments: Assessment[] = [
  { id: "a1", resident: "Hans Müller", room: "Zimmer 207", type: "Morse Sturzrisiko", score: "65 Punkte", status: "Hoch", tone: "critical" as Tone, updated: "Heute, 07:50", next: "Heute" },
  { id: "a2", resident: "Maria Keller", room: "Zimmer 204", type: "NRS Schmerzassessment", score: "2 / 10", status: "Stabil", tone: "stable" as Tone, updated: "Heute, 07:35", next: "In 3 Tagen" },
  { id: "a3", resident: "Erika Meier", room: "Zimmer 211", type: "Braden Dekubitusrisiko", score: "16 Punkte", status: "Mittel", tone: "attention" as Tone, updated: "Gestern, 15:10", next: "Heute" },
  { id: "a4", resident: "Ruth Baumann", room: "Zimmer 214", type: "Barthel-Index", score: "75 Punkte", status: "Stabil", tone: "stable" as Tone, updated: "10.09.2026", next: "In 8 Tagen" },
  { id: "a5", resident: "Peter Aebischer", room: "Zimmer 115", type: "MNA Ernährung", score: "9 Punkte", status: "Risiko", tone: "attention" as Tone, updated: "Heute, 06:58", next: "Heute" },
  { id: "a6", resident: "Walter Brunner", room: "Zimmer 306", type: "Delir-Screening", score: "Nicht auffällig", status: "Stabil", tone: "stable" as Tone, updated: "09.09.2026", next: "In 4 Tagen" },
];

const dueAssessments: Assessment[] = [
  { ...assessments[0], dueTime: "Heute · 10:00", owner: "Anna Meier" },
  { ...assessments[2], dueTime: "Heute · 11:00", owner: "Nora Baumann" },
  { ...assessments[4], dueTime: "Heute · 12:30", owner: "Lea Frei" },
  { id: "d4", resident: "Bernhard Koch", room: "Zimmer 012", type: "Kognitives Assessment", score: "Ausstehend", status: "Überfällig", tone: "critical" as Tone, updated: "01.09.2026", next: "Überfällig", dueTime: "Seit 11.09.", owner: "Sven Keller" },
  { id: "d5", resident: "Anna Schmid", room: "Zimmer 118", type: "Sturzrisiko", score: "42 Punkte", status: "Fällig", tone: "attention" as Tone, updated: "12.08.2026", next: "Morgen", dueTime: "Morgen · 09:00", owner: "Anna Meier" },
];

function Summary({ items }: { items: Array<{ icon: ModuleIconName; value: string; label: string; tone?: Tone }> }) {
  return <section className="wound-summary operations-summary" aria-label="Zusammenfassung">{items.map((item) => <div key={item.label}><span className={`summary-icon ${item.tone === "attention" ? "attention" : item.tone === "critical" ? "critical" : item.tone === "info" ? "info" : ""}`}><ModuleIcon name={item.icon}/></span><span><strong>{item.value}</strong><small>{item.label}</small></span></div>)}</section>;
}

function OperationsPulse({ showToast }: { showToast: (message: string) => void }) {
  return <section className="operations-pulse" aria-label="Operativer Puls"><div className="operations-pulse-intro"><span className="operations-live-dot"/><div><p className="eyebrow">Operativer Puls</p><strong>Frühdienst · 07:00–15:30</strong><small>Live-Überblick für deinen Arbeitsbereich</small></div></div><button type="button" onClick={() => showToast("Aktualisierung ist bereits aktiv")}><span><strong>12</strong><small>Bewohner</small></span><span><strong>5</strong><small>Aufgaben</small></span><span><strong>92 %</strong><small>Besetzung</small></span><ModuleIcon name="chevron" className="chevron"/></button></section>;
}

function ShiftView({ showToast }: { showToast: (message: string) => void }) {
  const [done, setDone] = useState<string[]>(["st1"]);
  return <><Summary items={[{ icon: "calendar", value: "07:00–15:30", label: "Frühdienst" }, { icon: "residents", value: "12", label: "Bewohner auf Station" }, { icon: "tasks", value: "5", label: "Aufgaben heute", tone: "attention" }, { icon: "check", value: `${done.length}/5`, label: "Dienstfortschritt", tone: "info" }]}/><div className="operations-grid"><section className="card operations-timeline"><div className="card-header"><div><p className="eyebrow">Montag, 14. September 2026</p><h2 className="card-title">Dein heutiger Dienst</h2><p className="card-subtitle">Wohnbereich 2 · Pflegezimmer</p></div><button className="secondary-button" type="button" onClick={() => showToast("Ansicht auf den ganzen Tag erweitert")}>Ganzer Tag</button></div><div>{shiftTasks.map((task) => <article className={`operations-timeline-row ${done.includes(task.id) ? "complete" : ""}`} key={task.id}><time>{task.time}</time><span className={`operations-timeline-icon ${task.tone}`}><ModuleIcon name={task.category === "Medikation" ? "med" : task.category === "Wunde" ? "wounds" : task.category === "Übergabe" ? "handover" : task.category === "Gespräch" ? "team" : "note"}/></span><div><strong>{task.title}</strong><small>{task.detail}</small></div><button type="button" aria-label={`${task.title} ${done.includes(task.id) ? "rückgängig" : "erledigt markieren"}`} onClick={() => setDone((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])}><ModuleIcon name={done.includes(task.id) ? "check" : "plus"}/></button></article>)}</div></section><aside className="operations-sidebar"><section className="card"><div className="card-header"><div><p className="eyebrow">Aktuell wichtig</p><h2 className="card-title">Hinweise für dich</h2></div></div><div className="operations-note-list"><p className="critical"><ModuleIcon name="alert"/><span><strong>Sturzrisiko · Hans Müller</strong><small>Neurologische Kontrolle bis 14:00 Uhr nach Standard durchführen.</small></span></p><p className="attention"><ModuleIcon name="med"/><span><strong>Dosisänderung · Erika Meier</strong><small>Metoprolol ab heute 50 mg. Wirkung beobachten.</small></span></p><p className="info"><ModuleIcon name="note"/><span><strong>Neue Dokumentation</strong><small>2 Einträge warten auf deine Prüfung.</small></span></p></div></section><section className="card operations-quick"><div className="card-header"><div><p className="eyebrow">Direktzugriff</p><h2 className="card-title">Schnellaktionen</h2></div></div><div><button type="button" onClick={() => showToast("Dokumentation vorbereitet")}><ModuleIcon name="note"/><span>Dokumentieren</span></button><button type="button" onClick={() => showToast("Vitalwerterfassung vorbereitet")}><ModuleIcon name="vitals"/><span>Vitalwerte</span></button><button type="button" onClick={() => showToast("Neue Aufgabe vorbereitet")}><ModuleIcon name="tasks"/><span>Aufgabe erstellen</span></button><button type="button" onClick={() => showToast("Übergabe geöffnet")}><ModuleIcon name="handover"/><span>Übergabe</span></button></div></section></aside></div></>;
}

function ShiftHistoryView({ showToast }: { showToast: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = shiftHistory.filter((entry) => `${entry.date} ${entry.unit} ${entry.handover}`.toLocaleLowerCase("de-CH").includes(query.trim().toLocaleLowerCase("de-CH")));
  return <><Summary items={[{ icon: "calendar", value: "24", label: "Dienste im Quartal" }, { icon: "check", value: "22", label: "Übergaben vollständig" }, { icon: "note", value: "99", label: "Dokumentationen", tone: "info" }, { icon: "alert", value: "2", label: "Hinweise offen", tone: "attention" }]}/><section className="card operations-list-card"><div className="operations-toolbar"><div><h2 className="card-title">Abgeschlossene Dienste</h2><p className="card-subtitle">{filtered.length} von {shiftHistory.length} Einträgen</p></div><label className="resident-search"><ModuleIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Datum oder Wohnbereich" aria-label="Schichtverlauf durchsuchen"/></label><button className="secondary-button" type="button" onClick={() => showToast("Schichtbericht wird vorbereitet")}>Exportieren</button></div><div className="operations-history-list">{filtered.map((entry) => <article key={entry.date}><span className="operations-date"><strong>{entry.date.split(",")[0]}</strong><small>{entry.date.split(", ").slice(1).join(", ")}</small></span><span><strong>{entry.time}</strong><small>{entry.unit}</small></span><span><strong>{entry.entries} Dokumentationen</strong><small>Übergabe: {entry.handover}</small></span><span className={`status-badge ${entry.tone}`}>{entry.handover === "Vollständig" ? "Abgeschlossen" : "Prüfung nötig"}</span><button type="button" onClick={() => showToast(`${entry.date} geöffnet`)}>Ansehen <ModuleIcon name="chevron"/></button></article>)}</div>{filtered.length === 0 && <div className="resident-empty"><ModuleIcon name="search"/><strong>Keine Dienste gefunden</strong><p>Suchbegriff anpassen.</p></div>}</section></>;
}

function TaskView({ team, showToast }: { team: boolean; showToast: (message: string) => void }) {
  const [filter, setFilter] = useState("Alle");
  const [completed, setCompleted] = useState<string[]>(team ? ["tt3"] : ["t6"]);
  const items = team ? teamTasks : myTasks;
  const filters = team ? ["Alle", "Offen", "In Bearbeitung", "Erledigt"] : ["Alle", "Offen", "Heute fällig", "Überfällig"];
  const filtered = items.filter((item) => filter === "Alle" || (team ? item.status === filter : item.due === filter));
  return <><Summary items={[{ icon: "tasks", value: team ? "18" : "6", label: team ? "Aufgaben im Team" : "Aufgaben für dich" }, { icon: "alert", value: team ? "5" : "2", label: "dringend", tone: "critical" }, { icon: "calendar", value: team ? "9" : "4", label: "heute fällig", tone: "attention" }, { icon: "check", value: team ? "4" : "1", label: "heute erledigt", tone: "info" }]}/><section className="card operations-list-card"><div className="operations-toolbar"><div><h2 className="card-title">{team ? "Aufgaben im Team" : "Deine Aufgaben"}</h2><p className="card-subtitle">{filtered.length} Aufgaben sichtbar</p></div><div className="operations-filter-buttons">{filters.map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="task-list">{filtered.map((task) => { const isDone = completed.includes(task.id) || (team && task.status === "Erledigt"); return <article className={`task-row ${isDone ? "complete" : ""}`} key={task.id}><button className="task-check" type="button" aria-label={`${task.title} ${isDone ? "rückgängig" : "erledigt markieren"}`} onClick={() => setCompleted((current) => isDone ? current.filter((id) => id !== task.id) : [...current, task.id])}><ModuleIcon name={isDone ? "check" : "plus"}/></button><time>{task.time}</time><span className={`operations-timeline-icon ${task.tone}`}><ModuleIcon name={task.category === "Medikation" ? "med" : task.category === "Vitalwerte" ? "vitals" : task.category === "Wundmanagement" ? "wounds" : "note"}/></span><div><strong>{task.title}</strong><small>{task.detail}</small></div>{team && <span className="task-owner"><span className="avatar">{task.owner?.split(" ").map((part) => part[0]).join("")}</span>{task.owner}</span>}<span className={`status-badge ${isDone ? "stable" : task.tone}`}>{isDone ? "Erledigt" : team ? task.status : task.due}</span><button className="quiet-button" type="button" onClick={() => showToast(`${task.title} geöffnet`)}>Details</button></article>; })}{filtered.length === 0 && <div className="resident-empty"><ModuleIcon name="check"/><strong>Keine Aufgaben in diesem Filter</strong><p>Filter zurücksetzen oder neue Aufgabe erstellen.</p></div>}</div></section></>;
}

function HandoverView({ lastShift, showToast }: { lastShift: boolean; showToast: (message: string) => void }) {
  const [filter, setFilter] = useState("Alle");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const filters = ["Alle", "Kritisch", "Medikation", "Pflege"];
  const events = lastShift ? handoverEvents : handoverEvents.slice(0, 3);
  const filtered = events.filter((event) => filter === "Alle" || (filter === "Kritisch" ? event.tone === "critical" : filter === "Medikation" ? event.title.includes("Medikation") : filter === "Pflege" ? event.title.includes("Wund") || event.title.includes("Vital") : true));
  return <><Summary items={[{ icon: "handover", value: lastShift ? "14" : "6", label: lastShift ? "Veränderungen" : "Übergabepunkte" }, { icon: "alert", value: lastShift ? "2" : "1", label: "kritische Hinweise", tone: "critical" }, { icon: "check", value: "4", label: "bereits gelesen", tone: "info" }, { icon: "residents", value: "3", label: "beteiligte Personen" }]}/><div className="handover-layout"><section className="card handover-feed"><div className="operations-toolbar"><div><h2 className="card-title">{lastShift ? "Seit deiner letzten Schicht" : "Übergabepunkte für den nächsten Dienst"}</h2><p className="card-subtitle">{filtered.length} relevante Einträge</p></div><div className="operations-filter-buttons">{filters.map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="handover-event-list">{filtered.map((event) => <article className={event.tone} key={`${event.time}-${event.title}`}><time>{event.time}</time><span className="operations-timeline-icon"><ModuleIcon name={event.tone === "critical" ? "alert" : event.title.includes("Medikation") ? "med" : "note"}/></span><div><strong>{event.title}</strong><p>{event.detail}</p><small>Anna Meier · Pflegefachfrau HF</small></div><button type="button" onClick={() => showToast(`${event.title} geöffnet`)}><ModuleIcon name="chevron"/></button></article>)}</div></section>{!lastShift && <section className="card handover-editor"><div className="card-header"><div><p className="eyebrow">Eigene Ergänzung</p><h2 className="card-title">Notiz hinzufügen</h2></div></div><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Was soll der nächste Dienst wissen?" aria-label="Übergabenotiz"/><div className="handover-editor-footer"><span>{note.length}/500 Zeichen</span><button className="primary-button" type="button" disabled={!note.trim()} onClick={() => { setSaved(true); setNote(""); showToast("Übergabepunkt gespeichert"); }}>Speichern</button></div>{saved && <p className="handover-saved"><ModuleIcon name="check"/>Notiz ist für den nächsten Dienst vorgemerkt.</p>}</section>}</div></>;
}

function ScheduleView({ team, showToast }: { team: boolean; showToast: (message: string) => void }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMonthDay, setSelectedMonthDay] = useState(14);
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");
  const [selectedMember, setSelectedMember] = useState("AM");
  const selectedScheduleDay = calendarMode === "month" ? monthDays[selectedMonthDay - 1] : { ...days[selectedDay], dayNumber: 14 + selectedDay, weekdayIndex: selectedDay };
  const selectedShift = selectedScheduleDay.shifts[0] || selectedScheduleDay.shifts[1] || "";
  return <><Summary items={[{ icon: "calendar", value: team ? "32" : calendarMode === "month" ? `${monthShiftCount}` : "5", label: team ? "Dienste geplant" : calendarMode === "month" ? "Dienste im Monat" : "Dienste diese Woche" }, { icon: "residents", value: team ? "92%" : "36 h", label: team ? "Besetzung" : "Arbeitszeit", tone: "info" }, { icon: "alert", value: team ? "3" : "1", label: team ? "offene Dienste" : "Änderungsanfragen", tone: "attention" }, { icon: "check", value: team ? "18" : "0", label: team ? "Bestätigt" : "Ferientage" }]}/><section className="card schedule-card"><div className="card-header"><div><p className="eyebrow">{calendarMode === "month" ? "September 2026" : "September 2026 · KW 38"}</p><h2 className="card-title">{team ? "Teamplanung" : calendarMode === "month" ? "Dein Monat" : "Deine Woche"}</h2></div><div className="schedule-controls"><div className="schedule-view-switch" role="group" aria-label="Kalenderansicht"><button className={calendarMode === "week" ? "active" : ""} type="button" aria-pressed={calendarMode === "week"} onClick={() => setCalendarMode("week")}>Woche</button><button className={calendarMode === "month" ? "active" : ""} type="button" aria-pressed={calendarMode === "month"} onClick={() => setCalendarMode("month")}>Monat</button></div><button className="secondary-button" type="button" onClick={() => { setCalendarMode("month"); setSelectedMonthDay(14); setSelectedDay(0); showToast("Auf heute, 14. September, gesprungen"); }}>Heute</button></div></div>{calendarMode === "week" ? <div className="schedule-week">{days.map((day, index) => <button className={selectedDay === index ? "active" : ""} type="button" key={day.date} onClick={() => setSelectedDay(index)}><strong>{day.day}</strong><span>{day.date}</span><i className={day.shifts[0] || day.shifts[1] ? "has-shift" : ""}/></button>)}</div> : <div className="schedule-month"><div className="schedule-month-weekdays" aria-hidden="true">{weekdayNames.map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="schedule-month-grid">{monthCalendarCells.map((day, index) => day ? <button className={selectedMonthDay === day.dayNumber ? "active" : ""} type="button" key={day.dayNumber} onClick={() => setSelectedMonthDay(day.dayNumber)} aria-label={`${day.day}. September 2026, ${day.shifts[0] || "frei"}`}><strong>{day.dayNumber}</strong><span className={day.shifts[0] ? "has-shift" : "free"}>{shortShiftLabel(day.shifts[0])}</span></button> : <span className="schedule-month-empty" aria-hidden="true" key={`empty-${index}`}/>)}</div></div>}<div className="schedule-day-detail"><div><p className="eyebrow">{selectedScheduleDay.day}, {selectedScheduleDay.date}</p><h3>{team ? "Besetzung im Wohnbereich" : "Deine Einsätze"}</h3><p>{team ? "Wohnbereich 2 · Früh- und Spätdienst" : "Wohnbereich 2 · 1. OG"}</p></div>{team ? <div className="schedule-team-grid">{teamMembers.slice(0, 4).map((member) => <button type="button" key={member.initials} onClick={() => setSelectedMember(member.initials)} className={selectedMember === member.initials ? "selected" : ""}><span className="avatar">{member.initials}</span><span><strong>{member.name}</strong><small>{member.shifts[selectedScheduleDay.weekdayIndex] || "Frei"}</small></span></button>)}</div> : <div className="schedule-shift-detail"><span className="schedule-shift-icon"><ModuleIcon name="shift"/></span><span><strong>{selectedShift || "Frei"}</strong><small>{selectedShift ? `${shiftDetailLabel(selectedShift)} · Pflegefachfrau HF` : "Keine Einteilung geplant"}</small></span><span className="status-badge stable">Bestätigt</span></div>}</div></section></>;
}

function AssessmentsView({ due, showToast }: { due: boolean; showToast: (message: string) => void }) {
  const [filter, setFilter] = useState("Alle");
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const source = due ? dueAssessments : assessments;
  const filters = due ? ["Alle", "Heute", "Überfällig", "Morgen"] : ["Alle", "Kritisch", "Beobachten", "Stabil"];
  const filtered = source.filter((item) => (filter === "Alle" || (due ? (filter === "Heute" ? (item.dueTime ?? "").startsWith("Heute") : filter === "Morgen" ? (item.dueTime ?? "").startsWith("Morgen") : item.next === "Überfällig") : (filter === "Kritisch" ? item.tone === "critical" : filter === "Beobachten" ? item.tone === "attention" : item.tone === "stable"))) && `${item.resident} ${item.room} ${item.type}`.toLocaleLowerCase("de-CH").includes(query.trim().toLocaleLowerCase("de-CH")));
  return <><Summary items={[{ icon: "assess", value: due ? "12" : "48", label: due ? "Assessments fällig" : "aktive Einschätzungen" }, { icon: "alert", value: due ? "3" : "7", label: due ? "überfällig" : "mit Risiko", tone: "critical" }, { icon: "calendar", value: due ? "9" : "18", label: "diese Woche", tone: "attention" }, { icon: "check", value: due ? "86%" : "94%", label: "aktuell", tone: "info" }]}/><section className="card assessments-card"><div className="operations-toolbar"><div><h2 className="card-title">{due ? "Anstehende Fälligkeiten" : "Assessmentübersicht"}</h2><p className="card-subtitle">{filtered.length} von {source.length} Einträgen</p></div><label className="resident-search"><ModuleIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner oder Assessment" aria-label="Einschätzungen durchsuchen"/></label><div className="operations-filter-buttons">{filters.map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="assessment-table-head"><span>Bewohner</span><span>Assessment</span><span>Ergebnis</span><span>{due ? "Fällig" : "Aktualisiert"}</span><span>Aktion</span></div><div className="assessment-list">{filtered.map((item) => { const isDone = completed.includes(item.id); return <article key={item.id} className={isDone ? "complete" : ""}><span className="resident-avatar">{item.resident.split(" ").map((part) => part[0]).join("")}</span><span><strong>{item.resident}</strong><small>{item.room}</small></span><span><strong>{item.type}</strong><small>{item.score}</small></span><span className={`status-badge ${isDone ? "stable" : item.tone}`}>{isDone ? "Erledigt" : item.status}</span><span><strong>{due ? item.dueTime : item.updated}</strong><small>{due ? `Zuständig: ${item.owner}` : `Nächste: ${item.next}`}</small></span><button className="quiet-button" type="button" onClick={() => { setCompleted((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]); showToast(`${item.type} für ${item.resident} ${isDone ? "wieder geöffnet" : "als erledigt markiert"}`); }}>{isDone ? "Öffnen" : due ? "Bearbeiten" : "Details"}</button></article>; })}{filtered.length === 0 && <div className="resident-empty"><ModuleIcon name="search"/><strong>Keine Einschätzungen gefunden</strong><p>Suchbegriff oder Filter anpassen.</p></div>}</div></section></>;
}

export default function OperationsWorkspace({ view }: { view: OperationsView }) {
  const meta = viewMeta[view];
  const [absenceEditorOpen, setAbsenceEditorOpen] = useState(false);
  const [dutyEditorOpen, setDutyEditorOpen] = useState(false);
  return <ModulePageShell activeModule={meta.module} activeChild={meta.child} pageClass={`operations-page operations-${view}`} locationSecondary="Gesamtes Haus · alle Wohnbereiche">
    {(showToast) => <main className="workspace module-workspace operations-command-workspace"><section className="page-heading care-page-heading" aria-labelledby="operations-title"><div className="heading-copy"><p className="eyebrow">{meta.eyebrow}</p><h1 id="operations-title">{meta.title}</h1><p>{meta.description}</p></div><button className="primary-button" type="button" onClick={() => view === "schedule" ? setAbsenceEditorOpen(true) : view === "teamSchedule" ? setDutyEditorOpen(true) : showToast(`${meta.action} vorbereitet`)}><ModuleIcon name="plus" className="button-icon"/>{meta.action}</button></section><AbsenceEditor open={absenceEditorOpen} onClose={() => setAbsenceEditorOpen(false)} showToast={showToast}/><DutyAssignmentEditor open={dutyEditorOpen} onClose={() => setDutyEditorOpen(false)} showToast={showToast}/><OperationsPulse showToast={showToast}/>{view === "shift" && <ShiftView showToast={showToast}/>} {view === "shiftHistory" && <ShiftHistoryView showToast={showToast}/>} {view === "tasks" && <TaskView team={false} showToast={showToast}/>} {view === "teamTasks" && <TaskView team showToast={showToast}/>} {view === "handover" && <HandoverView lastShift={false} showToast={showToast}/>} {view === "lastShift" && <HandoverView lastShift showToast={showToast}/>} {view === "schedule" && <ScheduleView team={false} showToast={showToast}/>} {view === "teamSchedule" && <ScheduleView team showToast={showToast}/>} {view === "assessments" && <AssessmentsView due={false} showToast={showToast}/>} {view === "assessmentDue" && <AssessmentsView due showToast={showToast}/>}</main>}
  </ModulePageShell>;
}

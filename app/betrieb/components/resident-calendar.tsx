"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { CalendarDots, CaretLeft, CaretRight, Clock, MagnifyingGlass, MapPin, Plus, UsersThree } from "@phosphor-icons/react";
import ModulePageShell from "@/app/components/module-page-shell";
import { CareSelect } from "@/app/components/care-form-controls";
import ResidentAppointmentEditor from "@/app/components/resident-appointment-editor";
import {
  appointmentLocalParts, appointmentTargetLabel, initialAppointmentDraft, zurichTimeToIso,
  type AppointmentCareUnit, type AppointmentDraft, type AppointmentResident, type ResidentAppointment,
} from "@/lib/resident-appointments";

type View = "day" | "week" | "month";
type EditorState = { appointment?: ResidentAppointment; draft?: AppointmentDraft } | null;
const weekDayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const dateFromKey = (key: string) => new Date(`${key}T12:00:00Z`);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (key: string, days: number) => { const date = dateFromKey(key); date.setUTCDate(date.getUTCDate() + days); return dateKey(date); };
const weekStart = (key: string) => addDays(key, -((dateFromKey(key).getUTCDay() + 6) % 7));
const monthStart = (key: string) => `${key.slice(0, 7)}-01`;
const calendarStart = (key: string) => weekStart(monthStart(key));
const hourLines = Array.from({ length: 24 }, (_, hour) => hour);
const monthDays = (key: string) => Array.from({ length: 42 }, (_, index) => addDays(calendarStart(key), index));
const dateHeading = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("de-CH", { timeZone: "UTC", ...options }).format(dateFromKey(key));
const statusName = (status: ResidentAppointment["status"]) => status === "completed" ? "Abgeschlossen" : status === "cancelled" ? "Abgesagt" : "Geplant";
const eventTime = (appointment: ResidentAppointment) => `${appointmentLocalParts(appointment.starts_at).time}–${appointmentLocalParts(appointment.ends_at).time}`;

function weekSegments(items: ResidentAppointment[], date: string) {
  const start = Date.parse(zurichTimeToIso(date, "00:00"));
  const end = Date.parse(zurichTimeToIso(addDays(date, 1), "00:00"));
  const segments = items.filter((item) => Date.parse(item.starts_at) < end && Date.parse(item.ends_at) > start).map((item) => {
    const clippedStart = Math.max(start, Date.parse(item.starts_at));
    const clippedEnd = Math.min(end, Date.parse(item.ends_at));
    const startParts = appointmentLocalParts(clippedStart);
    const endParts = appointmentLocalParts(clippedEnd);
    const minutes = startParts.date === date ? Number(startParts.time.slice(0, 2)) * 60 + Number(startParts.time.slice(3)) : 0;
    const endMinutes = endParts.date === date ? Number(endParts.time.slice(0, 2)) * 60 + Number(endParts.time.slice(3)) : 1440;
    return { item, minutes, endMinutes: Math.max(minutes + 15, endMinutes), lane: 0, lanes: 1 };
  }).sort((a, b) => a.minutes - b.minutes || b.endMinutes - a.endMinutes);
  let group: typeof segments = [];
  let groupEnd = -1;
  const finishGroup = () => { if (group.length) { const lanes: number[] = []; for (const item of group) { let lane = lanes.findIndex((endAt) => endAt <= item.minutes); if (lane < 0) { lane = lanes.length; lanes.push(item.endMinutes); } else lanes[lane] = item.endMinutes; item.lane = lane; } for (const item of group) item.lanes = lanes.length; } group = []; };
  for (const segment of segments) {
    if (segment.minutes >= groupEnd) finishGroup();
    group.push(segment);
    groupEnd = Math.max(groupEnd, segment.endMinutes);
  }
  finishGroup();
  return segments;
}

function TimedCalendarGrid({
  days, today, view, appointments, scrollRef, onCreate, onSelectDate, onOpen,
}: {
  days: string[];
  today: string;
  view: "day" | "week";
  appointments: ResidentAppointment[];
  scrollRef: RefObject<HTMLDivElement | null>;
  onCreate: (date: string, time: string) => void;
  onSelectDate: (date: string) => void;
  onOpen: (appointment: ResidentAppointment) => void;
}) {
  return <div className="resident-calendar-week-scroll" ref={scrollRef}>
    <div className={`resident-calendar-week-grid ${view === "day" ? "resident-calendar-day-grid" : ""}`}>
      <div className="resident-calendar-time-header">Zürich</div>
      {days.map((date) => <div className={`resident-calendar-week-head ${date === today ? "today" : ""}`} key={date}>
        <span>{dateHeading(date, { weekday: view === "day" ? "long" : "short" })}</span>
        <button type="button" onClick={() => onSelectDate(date)} aria-label={`${dateHeading(date, { day: "numeric", month: "long", year: "numeric" })} auswählen`}>
          {view === "day" ? dateHeading(date, { day: "numeric", month: "long", year: "numeric" }) : Number(date.slice(-2))}
        </button>
      </div>)}
      <div className="resident-calendar-time-rail">{hourLines.map((hour) => <span key={hour} style={{ top: hour * 48 }}>{String(hour).padStart(2, "0")}:00</span>)}</div>
      {days.map((date) => <div className={`resident-calendar-day-column ${date === today ? "today" : ""}`} key={date}>
        <div className="resident-calendar-hour-slots">{hourLines.map((hour) => <button key={hour} type="button" aria-label={`Termin am ${dateHeading(date, { day: "numeric", month: "long" })} um ${String(hour).padStart(2, "0")}:00 erstellen`} onClick={() => onCreate(date, `${String(hour).padStart(2, "0")}:00`)}/>)}</div>
        {weekSegments(appointments, date).map(({ item, minutes, endMinutes, lane, lanes }) => {
          const durationMinutes = endMinutes - minutes;
          return <button
            type="button"
            className={`resident-calendar-week-event ${view === "day" ? "resident-calendar-day-event" : ""} ${item.kind === "care_unit_task" ? "care-unit-task" : ""} ${item.category === "Arzttermin" ? "medical" : ""} ${item.status}`}
            key={item.id}
            style={{ top: minutes / 60 * 48 + 2, height: Math.max(25, durationMinutes / 60 * 48 - 3), left: `calc(${lane * 100 / lanes}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}
            aria-label={`${item.title}, ${appointmentTargetLabel(item)}, ${eventTime(item)}`}
            onClick={() => onOpen(item)}
          >
            <strong>{item.title}{view === "day" ? ` · ${appointmentTargetLabel(item)}` : ""}</strong>
            {durationMinutes >= 60 && <span>{eventTime(item)}</span>}
            {durationMinutes >= 105 && <small>{view === "day" ? item.location || item.category : appointmentTargetLabel(item)}</small>}
          </button>;
        })}
      </div>)}
    </div>
  </div>;
}

export default function ResidentCalendar() {
  const today = appointmentLocalParts(new Date()).date;
  const [focusDate, setFocusDate] = useState(today);
  const [view, setView] = useState<View>("day");
  const [appointments, setAppointments] = useState<ResidentAppointment[]>([]);
  const [residents, setResidents] = useState<AppointmentResident[]>([]);
  const [careUnits, setCareUnits] = useState<AppointmentCareUnit[]>([]);
  const [unit, setUnit] = useState("Alle Wohnbereiche");
  const [status, setStatus] = useState("Alle Termine");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const weekScrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => view === "day" ? [focusDate] : view === "week" ? Array.from({ length: 7 }, (_, index) => addDays(weekStart(focusDate), index)) : monthDays(focusDate), [focusDate, view]);
  const range = useMemo(() => ({ from: zurichTimeToIso(days[0], "00:00"), to: zurichTimeToIso(addDays(days.at(-1)!, 1), "00:00") }), [days]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/appointments?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, { cache: "no-store" })
        .then(async (response) => ({ response, data: await response.json().catch(() => null) }))
        .then(({ response, data }) => { if (!active) return; if (!response.ok) throw new Error(data?.error || "Kalender konnte nicht geladen werden."); setAppointments(data.appointments ?? []); setResidents(data.residents ?? []); setCareUnits(data.careUnits ?? []); setError(""); })
        .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Kalender konnte nicht geladen werden."); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [range.from, range.to, revision]);
  useEffect(() => { if (view !== "month") weekScrollRef.current?.scrollTo({ top: 7 * 48, behavior: "instant" }); }, [view, range.from]);

  const units = useMemo(() => ["Alle Wohnbereiche", ...careUnits.map((item) => item.name)], [careUnits]);
  const visible = useMemo(() => appointments.filter((item) => {
    const matchesUnit = unit === "Alle Wohnbereiche" || item.care_unit_name === unit;
    const matchesStatus = status === "Alle Termine" || statusName(item.status) === status;
    const haystack = `${item.title} ${appointmentTargetLabel(item)} ${item.category} ${item.location ?? ""}`.toLocaleLowerCase("de-CH");
    return matchesUnit && matchesStatus && haystack.includes(query.trim().toLocaleLowerCase("de-CH"));
  }), [appointments, unit, status, query]);
  const selectedDay = visible.filter((item) => {
    const start = Date.parse(zurichTimeToIso(focusDate, "00:00"));
    const end = Date.parse(zurichTimeToIso(addDays(focusDate, 1), "00:00"));
    return Date.parse(item.starts_at) < end && Date.parse(item.ends_at) > start;
  });
  const scheduledCount = appointments.filter((item) => item.status === "scheduled").length;
  const monthTitle = dateHeading(focusDate, { month: "long", year: "numeric" });
  const toolbarTitle = view === "month" ? monthTitle : view === "day" ? dateHeading(focusDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : `${dateHeading(days[0], { day: "numeric", month: "short" })} – ${dateHeading(days[6], { day: "numeric", month: "short", year: "numeric" })}`;

  function move(direction: number) {
    if (view === "day") setFocusDate((current) => addDays(current, direction));
    else if (view === "week") setFocusDate((current) => addDays(current, direction * 7));
    else setFocusDate((current) => { const next = dateFromKey(monthStart(current)); next.setUTCMonth(next.getUTCMonth() + direction); return dateKey(next); });
  }
  function create(date = focusDate, time = "09:00") { setEditor({ draft: { ...initialAppointmentDraft("", date, time), careUnitId: careUnits.find((item) => item.name === unit)?.id ?? "" } }); }
  function saved() { setEditor(null); setRevision((current) => current + 1); }

  return <ModulePageShell activeModule="shift" activeChild="Kalender" pageClass="resident-calendar-page" locationSecondary="Gesamtes Haus · alle Wohnbereiche">{() => <main className="workspace resident-calendar-workspace">
    <header className="page-heading resident-calendar-heading"><div className="heading-copy"><p className="eyebrow">CareCore Betrieb · Schicht</p><h1>Kalender</h1><p>Bewohnertermine und geplante Aufgaben im Wohnbereich an einem Ort.</p></div><button className="primary-button" type="button" onClick={() => create()}><Plus className="button-icon"/> Termin erstellen</button></header>
    <section className="resident-calendar-summary" aria-label="Kalenderübersicht"><span><CalendarDots/><strong>{appointments.length}</strong><small>Einträge im Zeitraum</small></span><span><Clock/><strong>{scheduledCount}</strong><small>geplant</small></span><span><UsersThree/><strong>{appointments.filter((item) => item.kind === "care_unit_task").length}</strong><small>Wohnbereichsaufgaben</small></span></section>
    <div className="resident-calendar-layout">
      <aside className="card resident-calendar-sidebar"><div className="resident-calendar-mini-head"><strong>{monthTitle}</strong><div><button type="button" aria-label="Vorheriger Monat" onClick={() => setFocusDate((current) => { const date = dateFromKey(monthStart(current)); date.setUTCMonth(date.getUTCMonth() - 1); return dateKey(date); })}><CaretLeft/></button><button type="button" aria-label="Nächster Monat" onClick={() => setFocusDate((current) => { const date = dateFromKey(monthStart(current)); date.setUTCMonth(date.getUTCMonth() + 1); return dateKey(date); })}><CaretRight/></button></div></div>
        <div className="resident-calendar-mini-grid">{weekDayNames.map((name) => <span key={name}>{name}</span>)}{monthDays(focusDate).map((date) => <button key={date} type="button" className={`${date === focusDate ? "selected" : ""} ${date.slice(0, 7) !== focusDate.slice(0, 7) ? "outside" : ""} ${date === today ? "today" : ""}`} onClick={() => setFocusDate(date)} aria-label={dateHeading(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>{Number(date.slice(-2))}</button>)}</div>
        <div className="resident-calendar-sidebar-section"><p className="eyebrow">Ansicht filtern</p><label><span>Wohnbereich</span><CareSelect label="Wohnbereich" value={unit} options={units} onChange={setUnit}/></label><label><span>Status</span><CareSelect label="Terminstatus" value={status} options={["Alle Termine", "Geplant", "Abgeschlossen", "Abgesagt"]} onChange={setStatus}/></label><label className="resident-calendar-search"><MagnifyingGlass/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Termin, Aufgabe oder Bewohner suchen" aria-label="Termine suchen"/></label></div>
        <div className="resident-calendar-sidebar-section resident-calendar-agenda"><p className="eyebrow">{dateHeading(focusDate, { weekday: "long", day: "numeric", month: "long" })}</p><strong>{selectedDay.length ? `${selectedDay.length} Einträge` : "Keine Einträge"}</strong>{selectedDay.map((item) => <button key={item.id} type="button" className={`resident-calendar-agenda-item ${item.status} ${item.kind === "care_unit_task" ? "care-unit-task" : ""}`} onClick={() => setEditor({ appointment: item })}><span>{appointmentLocalParts(item.starts_at).time}</span><div><strong>{item.title}</strong><small>{appointmentTargetLabel(item)}</small></div></button>)}{!selectedDay.length && <p className="resident-calendar-agenda-empty">Wähle einen anderen Tag oder plane einen neuen Termin.</p>}</div>
      </aside>
      <section className="card resident-calendar-board" aria-label="Bewohnerkalender"><div className="resident-calendar-toolbar"><div className="resident-calendar-navigation"><button className="secondary-button" type="button" onClick={() => setFocusDate(today)}>Heute</button><button type="button" aria-label="Vorheriger Zeitraum" onClick={() => move(-1)}><CaretLeft/></button><button type="button" aria-label="Nächster Zeitraum" onClick={() => move(1)}><CaretRight/></button><strong>{toolbarTitle}</strong></div><div className="resident-calendar-view-switch" role="group" aria-label="Kalenderansicht"><button type="button" className={view === "day" ? "active" : ""} aria-pressed={view === "day"} onClick={() => setView("day")}>Tag</button><button type="button" className={view === "week" ? "active" : ""} aria-pressed={view === "week"} onClick={() => setView("week")}>Woche</button><button type="button" className={view === "month" ? "active" : ""} aria-pressed={view === "month"} onClick={() => setView("month")}>Monat</button></div></div>
        {error && <div className="resident-calendar-error" role="alert">{error}<button type="button" onClick={() => setRevision((current) => current + 1)}>Erneut laden</button></div>}
        {loading && <div className="resident-calendar-loading" role="status">Termine werden geladen…</div>}
        {view === "month" ? <div className="resident-calendar-month-scroll"><div className="resident-calendar-month-grid">{weekDayNames.map((name) => <span className="resident-calendar-weekday" key={name}>{name}</span>)}{days.map((date) => { const entries = visible.filter((item) => appointmentLocalParts(item.starts_at).date === date); return <div className={`resident-calendar-month-day ${date.slice(0, 7) !== focusDate.slice(0, 7) ? "outside" : ""} ${date === focusDate ? "selected" : ""}`} key={date}><div className="resident-calendar-month-day-head"><button type="button" className={date === today ? "today" : ""} onClick={() => setFocusDate(date)} aria-label={dateHeading(date, { day: "numeric", month: "long" })}>{Number(date.slice(-2))}</button><button type="button" aria-label={`Termin am ${dateHeading(date, { day: "numeric", month: "long" })} erstellen`} onClick={() => create(date)}><Plus/></button></div><div className="resident-calendar-month-events">{entries.slice(0, 3).map((item) => <button className={`resident-calendar-event ${item.kind === "care_unit_task" ? "care-unit-task" : ""} ${item.category === "Arzttermin" ? "medical" : ""} ${item.status}`} type="button" key={item.id} onClick={() => setEditor({ appointment: item })}><small>{appointmentLocalParts(item.starts_at).time}</small><span>{item.title} · {appointmentTargetLabel(item)}</span></button>)}{entries.length > 3 && <button type="button" className="resident-calendar-more" onClick={() => setFocusDate(date)}>+ {entries.length - 3} weitere</button>}</div></div>; })}</div></div> : <TimedCalendarGrid days={days} today={today} view={view} appointments={visible} scrollRef={weekScrollRef} onCreate={create} onSelectDate={setFocusDate} onOpen={(item) => setEditor({ appointment: item })}/> }
        {!loading && !error && visible.length === 0 && <div className="resident-calendar-empty"><CalendarDots/><strong>Keine Einträge in dieser Ansicht</strong><p>Wähle einen anderen Zeitraum oder erfasse einen Bewohnertermin oder eine Wohnbereichsaufgabe.</p><button className="secondary-button" type="button" onClick={() => create()}><Plus/> Termin erstellen</button></div>}
        <div className="resident-calendar-board-foot"><span><i className="medical"/> Arzttermin</span><span><i/> Weitere Termine</span><span><i className="care-unit-task"/> Wohnbereichsaufgabe</span><span><i className="completed"/> Abgeschlossen</span><span><i className="cancelled"/> Abgesagt</span><span className="resident-calendar-board-help"><MapPin/> Alle Wohnbereiche</span></div>
      </section>
    </div>
    {editor && <ResidentAppointmentEditor key={editor.appointment?.id ?? `new-${editor.draft?.date}-${editor.draft?.startTime}`} appointment={editor.appointment} initialDraft={editor.draft} residents={residents} careUnits={careUnits} onClose={() => setEditor(null)} onSaved={saved}/>}
  </main>}</ModulePageShell>;
}

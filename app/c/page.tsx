"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/app-header";
import AppSidebar from "../components/app-sidebar";
import { navigationForRole, routeFor } from "../components/navigation";
import {
  ArrowsLeftRight,
  Bell,
  Buildings,
  CalendarDots,
  CaretDown,
  CaretRight,
  ChartBar,
  ChatsCircle,
  Check,
  ClipboardText,
  FileText,
  Files,
  FirstAidKit,
  ForkKnife,
  GearSix,
  GraduationCap,
  Heartbeat,
  House,
  ListChecks,
  MagnifyingGlass,
  NotePencil,
  Pill,
  Plus,
  Pulse,
  ShieldCheck,
  SidebarSimple,
  SignOut,
  Sparkle,
  Stethoscope,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";

type IconName = "home" | "residents" | "tasks" | "handover" | "calendar" | "team" | "learn" | "docs" | "chart" | "quality" | "settings" | "search" | "bell" | "building" | "chevron" | "caretDown" | "alert" | "check" | "plus" | "pulse" | "close" | "note" | "vitals" | "report" | "plan" | "med" | "wounds" | "nutrition" | "assess" | "shift" | "ai" | "sidebar" | "logout";

type WebMCPContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const icons = {
    home: House,
    residents: UsersThree,
    tasks: ListChecks,
    handover: ArrowsLeftRight,
    calendar: CalendarDots,
    team: ChatsCircle,
    learn: GraduationCap,
    docs: Files,
    chart: ChartBar,
    quality: ShieldCheck,
    settings: GearSix,
    search: MagnifyingGlass,
    bell: Bell,
    building: Buildings,
    chevron: CaretRight,
    caretDown: CaretDown,
    alert: Warning,
    check: Check,
    plus: Plus,
    pulse: Pulse,
    close: X,
    note: NotePencil,
    vitals: Heartbeat,
    report: FileText,
    plan: ClipboardText,
    med: Pill,
    wounds: FirstAidKit,
    nutrition: ForkKnife,
    assess: Stethoscope,
    shift: Heartbeat,
    ai: Sparkle,
    sidebar: SidebarSimple,
    logout: SignOut,
  };
  const Component = icons[name];
  return <Component className={className} aria-hidden="true" weight="regular"/>;
}

type DashboardChange = { id: string; initials: string; name: string; note: string; time: string; status: string; type: string };

type DashboardTask = { id: string; title: string; resident: string; time: string; dueAt: string | null; completed: boolean; overdue: boolean };
type DashboardResident = { initials: string; name: string; room: string; risk: string; critical?: boolean };
type DashboardNote = { id: string; title: string; body: string; pinned: boolean; updated_at: string };
type ResidentNews = { id: string; first_name: string; last_name: string; room: string; care_unit_name: string | null; title: string | null; body: string | null; importance: string | null; occurred_at: string | null; flag_label: string | null; flag_severity: string | null };

type DashboardWidgetId = "summary" | "critical" | "shift" | "tasks" | "residents";

const dashboardWidgets: Array<{ id: DashboardWidgetId; label: string; description: string; wide?: boolean }> = [
  { id: "summary", label: "Schichtübersicht", description: "Kennzahlen für den aktuellen Dienst", wide: true },
  { id: "critical", label: "Wichtiger Hinweis", description: "Kritische Informationen", wide: true },
  { id: "tasks", label: "Als Nächstes", description: "Offene Aufgaben" },
  { id: "shift", label: "Meine Schicht", description: "Zeitlicher Dienstplan" },
  { id: "residents", label: "Meine Bewohner", description: "Zugewiesene Bewohner", wide: true },
];

const defaultDashboardOrder = dashboardWidgets.map((widget) => widget.id);
const dashboardLayoutStorageKey = "carecore.dashboard-layout.v1";

function readStoredDashboardLayout() {
  if (typeof window === "undefined") return { order: defaultDashboardOrder, hidden: [] as DashboardWidgetId[] };
  try {
    const saved = window.localStorage.getItem(dashboardLayoutStorageKey);
    if (!saved) return { order: defaultDashboardOrder, hidden: [] as DashboardWidgetId[] };
    const layout = JSON.parse(saved) as { order?: DashboardWidgetId[]; hidden?: DashboardWidgetId[] };
    const allowed = new Set(defaultDashboardOrder);
    const order = (layout.order ?? []).filter((id): id is DashboardWidgetId => allowed.has(id));
    return { order: [...order, ...defaultDashboardOrder.filter((id) => !order.includes(id))], hidden: (layout.hidden ?? []).filter((id): id is DashboardWidgetId => allowed.has(id)) };
  } catch {
    return { order: defaultDashboardOrder, hidden: [] as DashboardWidgetId[] };
  }
}

export default function Home() {
  const router = useRouter();
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  const [assignedResidents, setAssignedResidents] = useState<DashboardResident[]>([]);
  const [changes, setChanges] = useState<DashboardChange[]>([]);
  const [residentNews, setResidentNews] = useState<ResidentNews[]>([]);
  const [newsScope, setNewsScope] = useState("Alle Wohnbereiche");
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState("");
  const [notes, setNotes] = useState<DashboardNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [noteEditor, setNoteEditor] = useState<DashboardNote | "new" | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notePinned, setNotePinned] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteFormError, setNoteFormError] = useState("");
  const [noteConfirmDelete, setNoteConfirmDelete] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [employeeName, setEmployeeName] = useState("Anna");
  const [primaryCareUnitName, setPrimaryCareUnitName] = useState("");
  const [dashboardEditing, setDashboardEditing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(() => readStoredDashboardLayout().order);
  const [hiddenWidgets, setHiddenWidgets] = useState<DashboardWidgetId[]>(() => readStoredDashboardLayout().hidden);
  const [draggedWidget, setDraggedWidget] = useState<DashboardWidgetId | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileGroupId, setMobileGroupId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const visibleNavigation = useMemo(() => navigationForRole(role), [role]);
  const mobileGroup = visibleNavigation.find((group) => group.id === mobileGroupId);
  const mobileNeedsMenu = mobileGroup ? mobileGroup.modules.length > 4 : true;

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function chooseMobileGroup(groupId: string) {
    const group = visibleNavigation.find((item) => item.id === groupId);
    const firstModule = group?.modules[0];
    const firstChild = firstModule?.children[0];
    setMobileGroupId(groupId);
    setMobileMenuOpen(false);
    const href = firstModule && firstChild ? routeFor(firstModule.id, firstChild) : null;
    if (href) router.push(href);
  }

  function chooseMobileChild(moduleId: string, child: string) {
    const href = routeFor(moduleId, child);
    if (href) {
      setMobileMenuOpen(false);
      router.push(href);
    }
  }

  const openSearch = useCallback(() => setSearchOpen(true), []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); }
      if (event.key === "Escape") { setSearchOpen(false); setNoteEditor(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    void fetch("/api/dashboard/layout", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() as Promise<{ layout: { order?: DashboardWidgetId[]; hidden?: DashboardWidgetId[] } | null }> : null)
      .then((payload) => {
        if (!active || !payload?.layout) return;
        const stored = payload.layout;
        const allowed = new Set(defaultDashboardOrder);
        const order = (stored.order ?? []).filter((id): id is DashboardWidgetId => allowed.has(id));
        setWidgetOrder([...order, ...defaultDashboardOrder.filter((id) => !order.includes(id))]);
        setHiddenWidgets((stored.hidden ?? []).filter((id): id is DashboardWidgetId => allowed.has(id)));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/work-context", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() as Promise<{ profile?: { displayName?: string; primaryCareUnitName?: string; role?: string } }> : null)
      .then((context) => { if (active && context?.profile?.displayName) { setEmployeeName(context.profile.displayName); setPrimaryCareUnitName(context.profile.primaryCareUnitName ?? ""); setRole(context.profile.role ?? null); } })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([fetch("/api/tasks", { cache: "no-store" }), fetch("/api/residents", { cache: "no-store" })]).then(async ([tasksResponse, residentsResponse]) => {
      if (!tasksResponse.ok || !residentsResponse.ok) throw new Error("Dashboard-Daten konnten nicht geladen werden.");
      const taskData = await tasksResponse.json() as { tasks: Array<{ id: string; title: string; resident_name: string; due_at: string | null; status: string; assigned_to: string | null }>; currentUserId: string };
      const residentData = await residentsResponse.json() as { residents: Array<{ first_name: string; last_name: string; room: string; care_unit: string; note: string; severity: string; status: string }> };
      if (!active) return;
      setTasks(taskData.tasks.filter((item) => item.assigned_to === taskData.currentUserId && item.status !== "cancelled").map((item) => ({ id: item.id, title: item.title, resident: item.resident_name, dueAt: item.due_at, time: item.due_at ? new Date(item.due_at).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }) : "—", completed: item.status === "completed", overdue: Boolean(item.due_at && new Date(item.due_at).getTime() < Date.now()) })));
      setAssignedResidents(residentData.residents.filter((item) => item.status === "active" && (!primaryCareUnitName || item.care_unit === primaryCareUnitName)).map((item) => ({ initials: `${item.first_name[0] ?? ""}${item.last_name[0] ?? ""}`, name: `${item.first_name} ${item.last_name}`, room: item.room || "Zimmer offen", risk: item.note, critical: item.severity === "critical" })));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [primaryCareUnitName]);

  useEffect(() => {
    let active = true;
    void fetch("/api/dashboard/changes", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { error?: string; scope?: string; residents?: ResidentNews[]; changes?: Array<{ id: string; first_name: string; last_name: string; title: string | null; body: string; importance: string; occurred_at: string }> };
      if (!response.ok) throw new Error(data.error || "Bewohner-Neuigkeiten konnten nicht geladen werden.");
      return data;
    }).then((data) => {
      if (!active) return;
      setResidentNews(data.residents ?? []);
      setNewsScope(data.scope ?? "Alle Wohnbereiche");
      setChanges((data.changes ?? []).map((item) => ({ id: item.id, initials: `${item.first_name[0]}${item.last_name[0]}`, name: `${item.first_name} ${item.last_name}`, note: item.body, time: new Date(item.occurred_at).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }), type: ["critical", "important"].includes(item.importance) ? "critical" : item.importance === "observation" ? "attention" : "info", status: item.title || "Dokumentiert" })));
      setNewsError("");
    }).catch((error) => { if (active) setNewsError(error instanceof Error ? error.message : "Bewohner-Neuigkeiten konnten nicht geladen werden."); }).finally(() => { if (active) setNewsLoading(false); });
    return () => { active = false; };
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/notes", { cache: "no-store" });
      const data = await response.json() as { notes?: DashboardNote[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Notizen konnten nicht geladen werden.");
      setNotes(data.notes ?? []);
      setNotesError("");
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Notizen konnten nicht geladen werden.");
    } finally { setNotesLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void loadNotes(); }, 0); return () => window.clearTimeout(timer); }, [loadNotes]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMCPContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const completeTask = {
      name: "complete_shift_task",
      title: "Schichtaufgabe abschliessen",
      description: "Markiert eine sichtbare Aufgabe der aktuellen Schicht als erledigt.",
      inputSchema: {
        type: "object",
        properties: { taskId: { type: "string", format: "uuid" } },
        required: ["taskId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        const taskId = (input as { taskId?: unknown })?.taskId;
        const task = tasksRef.current.find((item) => item.id === taskId);
        if (!task || typeof taskId !== "string") throw new Error("Unbekannte Aufgaben-ID");
        const response = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: taskId, completed: true }) });
        if (!response.ok) throw new Error("Aufgabe konnte nicht gespeichert werden");
        setTasks((current) => current.map((item) => item.id === taskId ? { ...item, completed: true } : item));
        setToast(`„${task.title}“ als erledigt markiert`);
        return { taskId, status: "completed" };
      },
    };
    try {
      void Promise.resolve(context.registerTool(completeTask, { signal: lifecycle.signal })).catch(() => undefined);
    } catch {
      return () => lifecycle.abort();
    }
    return () => lifecycle.abort();
  }, []);

  const completed = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const filteredResults = useMemo(() => [
    ...residentNews.map((resident) => ({ title: `${resident.first_name} ${resident.last_name}`, meta: `Bewohner · ${resident.room}`, icon: "residents" as IconName, href: `/c/bewohner?resident=${resident.id}` })),
    { title: "Bewohnerverzeichnis", meta: "Alle aktiven Bewohner", icon: "residents" as IconName, href: "/c/bewohner" },
    { title: "Aufgaben", meta: "Meine offenen Aufgaben", icon: "tasks" as IconName, href: "/c/betrieb/aufgaben" },
    { title: "Kalender", meta: "Termine im Wohnbereich", icon: "calendar" as IconName, href: "/c/betrieb/schicht/kalender" },
  ].filter((result) => `${result.title} ${result.meta}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [query, residentNews]);

  async function toggleTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const response = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, completed: !task.completed }) });
    if (!response.ok) { setToast("Aufgabe konnte nicht gespeichert werden"); return; }
    setTasks((current) => current.map((item) => item.id === id ? { ...item, completed: !item.completed } : item));
    if (!task.completed) setToast(`„${task.title}“ als erledigt markiert`);
  }

  function persistDashboardLayout(nextOrder: DashboardWidgetId[], nextHidden: DashboardWidgetId[]) {
    window.localStorage.setItem(dashboardLayoutStorageKey, JSON.stringify({ order: nextOrder, hidden: nextHidden }));
    void fetch("/api/dashboard/layout", { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: nextOrder, hidden: nextHidden }) }).catch(() => undefined);
  }

  function toggleWidget(widgetId: DashboardWidgetId) {
    const nextHidden = hiddenWidgets.includes(widgetId) ? hiddenWidgets.filter((id) => id !== widgetId) : [...hiddenWidgets, widgetId];
    setHiddenWidgets(nextHidden);
    persistDashboardLayout(widgetOrder, nextHidden);
  }

  function resetDashboardLayout() {
    setWidgetOrder(defaultDashboardOrder);
    setHiddenWidgets([]);
    window.localStorage.removeItem(dashboardLayoutStorageKey);
    void fetch("/api/dashboard/layout", { method: "DELETE", credentials: "same-origin" }).catch(() => undefined);
  }

  function moveWidget(targetId: DashboardWidgetId) {
    if (!draggedWidget || draggedWidget === targetId) return;
    const nextOrder = [...widgetOrder];
    const from = nextOrder.indexOf(draggedWidget);
    const to = nextOrder.indexOf(targetId);
    nextOrder.splice(from, 1);
    nextOrder.splice(to, 0, draggedWidget);
    setWidgetOrder(nextOrder);
    persistDashboardLayout(nextOrder, hiddenWidgets);
  }

  function openNote(note: DashboardNote | "new") {
    setNoteEditor(note);
    setNoteTitle(note === "new" ? "" : note.title);
    setNoteBody(note === "new" ? "" : note.body);
    setNotePinned(note === "new" ? false : note.pinned);
    setNoteFormError("");
    setNoteConfirmDelete(false);
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteEditor) return;
    setNoteSaving(true);
    setNoteFormError("");
    try {
      const response = await fetch("/api/dashboard/notes", {
        method: noteEditor === "new" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: noteEditor === "new" ? undefined : noteEditor.id, title: noteTitle, body: noteBody, pinned: notePinned }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Notiz konnte nicht gespeichert werden.");
      setNoteEditor(null);
      setToast("Notiz gespeichert");
      await loadNotes();
    } catch (error) { setNoteFormError(error instanceof Error ? error.message : "Notiz konnte nicht gespeichert werden."); }
    finally { setNoteSaving(false); }
  }

  async function deleteNote() {
    if (!noteEditor || noteEditor === "new") return;
    setNoteSaving(true);
    setNoteFormError("");
    try {
      const response = await fetch("/api/dashboard/notes", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: noteEditor.id }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Notiz konnte nicht gelöscht werden.");
      setNoteEditor(null);
      setToast("Notiz gelöscht");
      await loadNotes();
    } catch (error) { setNoteFormError(error instanceof Error ? error.message : "Notiz konnte nicht gelöscht werden."); }
    finally { setNoteSaving(false); }
  }

  const formattedDate = now?.toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" }) ?? "Dein Arbeitstag";
  const formattedTime = now?.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" }) ?? "--:--";
  const hour = now ? Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Zurich" }).format(now)) : 8;
  const greeting = hour < 11 ? "Guten Morgen" : hour < 17 ? "Guten Tag" : "Guten Abend";
  const firstName = employeeName === "CareCore Administrator" ? employeeName : employeeName.split(" ")[0] || employeeName;
  const openTasks = tasks.filter((item) => !item.completed);
  const nextTasks = openTasks.filter((item) => item.dueAt).sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!)).slice(0, 3);
  const currentScope = primaryCareUnitName || "alle Wohnbereiche";

  const dashboardContent: Record<DashboardWidgetId, ReactNode> = {
    summary: <section className="summary-strip" aria-label="Schichtübersicht"><div className="summary-item"><span className="summary-icon"><Icon name="residents"/></span><span><strong className="summary-value">{assignedResidents.length}</strong><span className="summary-label">Bewohner zugeteilt</span></span></div><div className="summary-item"><span className="summary-icon"><Icon name="tasks"/></span><span><strong className="summary-value">{tasks.length}</strong><span className="summary-label">Aufgaben geplant</span></span></div><div className="summary-item"><span className="summary-icon attention"><Icon name="pulse"/></span><span><strong className="summary-value">{assignedResidents.filter((item) => item.critical).length}</strong><span className="summary-label">wichtige Hinweise</span></span></div><div className="summary-item"><span className="summary-icon info"><Icon name="handover"/></span><span><strong className="summary-value">{tasks.filter((item) => !item.completed).length}</strong><span className="summary-label">Aufgaben offen</span></span></div></section>,
    critical: <section className="critical-alert" aria-label="Kritischer Hinweis"><span className="critical-symbol"><Icon name="alert"/></span><div><strong>{changes.find((item) => item.type === "critical") ? `Unmittelbar prüfen · ${changes.find((item) => item.type === "critical")?.name}` : "Keine kritischen Hinweise"}</strong><p>{changes.find((item) => item.type === "critical")?.note ?? "Aktuell liegen keine kritischen Dokumentationen vor."}</p></div><button className="secondary-button" type="button" onClick={() => router.push("/c/pflegedokumentation/verlauf")}>Verlauf öffnen <Icon name="chevron" className="button-icon"/></button></section>,
    shift: <section className="card timeline-card" aria-labelledby="timeline-title"><div className="card-header"><div><h2 className="card-title" id="timeline-title">Mein Dienst</h2><p className="card-subtitle">Deine nächsten terminierten Aufgaben</p></div><button className="quiet-button" type="button" onClick={() => router.push("/c/betrieb/dienstplanung")}>Dienste ansehen</button></div><div className="timeline-list">{nextTasks.length ? nextTasks.map((task, index) => <Timeline key={task.id} time={task.time} title={task.title} detail={task.resident || currentScope} state={task.overdue ? "Überfällig" : "Geplant"} rail={index < nextTasks.length - 1}/>) : <p className="home-widget-empty">Keine terminierten Aufgaben offen.</p>}</div></section>,
    tasks: <section className="card tasks-card" aria-labelledby="tasks-title"><div className="card-header"><div><h2 className="card-title" id="tasks-title">Als Nächstes</h2><p className="card-subtitle">{tasks.filter((task) => !task.completed).length} Aufgaben offen</p></div><div className="progress-ring" style={{ "--progress": `${progress}%` } as CSSProperties} aria-label={`${progress} Prozent erledigt`}><span>{progress}%</span></div></div><div className="dashboard-task-list">{tasks.map((task) => <div className={`dashboard-task-row ${task.completed ? "completed" : ""}`} key={task.id}><button className="dashboard-task-check" type="button" aria-label={`${task.title} ${task.completed ? "wieder öffnen" : "erledigen"}`} onClick={() => void toggleTask(task.id)}><Icon name="check"/></button><span className="dashboard-task-copy"><strong className="dashboard-task-title">{task.title}</strong><span className="dashboard-task-resident">{task.resident}</span></span><time className={`dashboard-task-time ${task.overdue && !task.completed ? "overdue" : ""}`}>{task.time}</time></div>)}</div><div className="tasks-footer"><button className="quiet-button" type="button" onClick={() => router.push("/c/betrieb/aufgaben")}>Alle Aufgaben <Icon name="chevron" className="button-icon"/></button></div></section>,
    residents: <section className="card residents-card" aria-labelledby="residents-title"><div className="card-header"><div><h2 className="card-title" id="residents-title">Bewohner im Blick</h2><p className="card-subtitle">{assignedResidents.length} in {currentScope}</p></div><button className="quiet-button" type="button" onClick={() => router.push("/c/bewohner")}>Verzeichnis öffnen</button></div><div className="resident-grid">{assignedResidents.map((resident) => <button className="resident-tile" type="button" key={resident.name} onClick={() => router.push("/c/bewohner")}><span className={`resident-avatar ${resident.critical ? "critical" : ""}`}>{resident.initials}</span><span><strong>{resident.name}</strong><p>{resident.room} · <span className="risk-label">{resident.risk}</span></p></span></button>)}</div></section>,
  };

  return <div className="app-shell">
    <AppSidebar activeModule="home" onToast={setToast}/>

    <div className="main-column">
      <AppHeader searchOpen={searchOpen} onSearch={openSearch} onToast={setToast}/>

      <main className="workspace home-workspace">
        <section className="home-hero" aria-labelledby="page-title">
          <div className="home-hero-top"><span className="home-kicker"><Icon name="pulse"/> Mein Arbeitsplatz</span><div className="home-hero-tools"><span className="home-scope"><Icon name="building"/>{primaryCareUnitName || "Gesamtes Haus"}</span><button className="home-edit-button" type="button" aria-pressed={dashboardEditing} onClick={() => setDashboardEditing((value) => !value)}><Icon name="settings"/>{dashboardEditing ? "Fertig" : "Arbeitsplatz bearbeiten"}</button></div></div>
          <div className="home-hero-intro"><div><p className="home-date">{formattedDate}</p><h1 id="page-title">{greeting}, {firstName}.</h1><p>Das ist dein Überblick für {currentScope}. Notizen, Aufgaben und Bewohner-Neuigkeiten sind hier an einem Ort.</p></div><div className="home-clock" aria-label={`Aktuelle Uhrzeit ${formattedTime}`}><strong>{formattedTime}</strong><span>Uhr · Zürich</span></div></div>
          <div className="home-desk-grid">
            <section className="home-desk-card home-shortcuts" aria-labelledby="home-shortcuts-title"><div className="home-card-head"><div><p className="eyebrow">Direkt weiter</p><h2 id="home-shortcuts-title">Schnellzugriff</h2></div></div><div className="home-shortcut-grid"><button type="button" onClick={() => router.push("/c/bewohner")}><span><Icon name="residents"/></span>Bewohner</button><button type="button" onClick={() => router.push("/c/pflegedokumentation")}><span><Icon name="note"/></span>Dokumentation</button><button type="button" onClick={() => router.push("/c/betrieb/aufgaben")}><span><Icon name="tasks"/></span>Aufgaben</button><button type="button" onClick={() => router.push("/c/betrieb/schicht/kalender")}><span><Icon name="calendar"/></span>Kalender</button></div></section>
            <section className="home-desk-card home-notes" aria-labelledby="home-notes-title"><div className="home-card-head"><div><p className="eyebrow">Nur für dich sichtbar</p><h2 id="home-notes-title">Meine Notizen</h2></div><button type="button" aria-label="Notiz erstellen" onClick={() => openNote("new")}><Icon name="plus"/></button></div>{notesError ? <p className="home-card-message error">{notesError}</p> : notesLoading ? <p className="home-card-message">Notizen werden geladen…</p> : notes.length ? <div className="home-note-list">{notes.map((note) => <button type="button" key={note.id} onClick={() => openNote(note)}><span><strong>{note.title}</strong>{note.pinned && <small>Fixiert</small>}</span><p>{note.body}</p><time>{new Date(note.updated_at).toLocaleDateString("de-CH", { day: "2-digit", month: "short" })}</time></button>)}</div> : <div className="home-notes-empty"><Icon name="note"/><strong>Platz für deine Gedanken</strong><p>Halte persönliche To-dos und Merkpunkte fest. Klinische Einträge gehören weiterhin in die Bewohnerakte.</p><button type="button" onClick={() => openNote("new")}>Erste Notiz erstellen <Icon name="chevron"/></button></div>}</section>
            <section className="home-desk-card home-day-card" aria-labelledby="home-day-title"><div className="home-card-head"><div><p className="eyebrow">Im Dienst</p><h2 id="home-day-title">Heute wichtig</h2></div><span className="home-count">{openTasks.length} offen</span></div><div className="home-day-summary"><strong>{assignedResidents.length}</strong><span>Bewohner im Blick</span><i/><strong>{changes.filter((item) => item.type === "critical").length}</strong><span>wichtige Einträge</span></div><div className="home-day-tasks">{nextTasks.length ? nextTasks.map((task) => <button key={task.id} type="button" onClick={() => router.push("/c/betrieb/aufgaben")}><span className="home-task-time">{task.time}</span><span><strong>{task.title}</strong><small>{task.resident || currentScope}</small></span><Icon name="chevron"/></button>) : <p>Keine terminierten Aufgaben offen.</p>}</div><button className="home-card-footer" type="button" onClick={() => router.push("/c/betrieb/aufgaben")}>Aufgaben öffnen <Icon name="chevron"/></button></section>
          </div>
        </section>

        <section className="home-news" aria-labelledby="home-news-title"><div className="home-news-head"><div><p className="eyebrow">Bewohner im Blick</p><h2 id="home-news-title">Neues aus {newsScope}</h2><p>Letzte Dokumentation und aktuelle Hinweise für jeden Bewohner in deinem Arbeitsbereich.</p></div><span>{residentNews.length} Bewohner</span></div>{newsError ? <div className="home-news-empty" role="alert">{newsError}</div> : newsLoading ? <div className="home-news-empty">Bewohner-Neuigkeiten werden geladen…</div> : residentNews.length ? <div className="home-news-list">{residentNews.map((resident) => { const importance = resident.importance === "critical" || resident.flag_severity === "critical" ? "critical" : resident.importance === "important" || resident.flag_severity === "attention" ? "attention" : "normal"; return <article className="home-news-row" key={resident.id} role="link" tabIndex={0} onClick={() => router.push(`/c/bewohner?resident=${resident.id}`)} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/c/bewohner?resident=${resident.id}`); }}><span className={`resident-avatar ${importance === "critical" ? "critical" : ""}`}>{resident.first_name[0]}{resident.last_name[0]}</span><div className="home-news-person"><strong>{resident.first_name} {resident.last_name}</strong><small>{resident.room} · {resident.care_unit_name || "ohne Wohnbereich"}</small></div><div className="home-news-entry"><strong>{resident.title || resident.flag_label || "Keine neuen Einträge"}</strong><p>{resident.body || (resident.flag_label ? "Aktuellen Hinweis in der Bewohnerakte prüfen." : "Aktuell liegt keine Pflegedokumentation vor.")}</p></div><div className="home-news-meta"><span className={`home-news-status ${importance}`}>{importance === "critical" ? "Wichtig" : importance === "attention" ? "Beachten" : "Aktuell"}</span><time>{resident.occurred_at ? new Date(resident.occurred_at).toLocaleDateString("de-CH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</time></div></article>; })}</div> : <div className="home-news-empty">In diesem Wohnbereich sind aktuell keine aktiven Bewohner erfasst.</div>}<div className="home-news-foot"><button type="button" onClick={() => router.push("/c/bewohner")}>Bewohnerverzeichnis öffnen <Icon name="chevron"/></button><button type="button" onClick={() => router.push("/c/pflegedokumentation/verlauf")}>Pflegeverlauf ansehen <Icon name="chevron"/></button></div></section>

        {dashboardEditing && <section className="dashboard-customizer" aria-label="Arbeitsplatz bearbeiten"><div><p className="eyebrow">Weitere Bausteine</p><h2>Arbeitsplatz anpassen</h2><p>Ordne die Zusatzbereiche unterhalb der Bewohner-Neuigkeiten an oder blende sie aus.</p></div><div className="dashboard-customizer-list">{dashboardWidgets.map((widget) => <button className={!hiddenWidgets.includes(widget.id) ? "active" : ""} type="button" key={widget.id} onClick={() => toggleWidget(widget.id)}><span>{!hiddenWidgets.includes(widget.id) ? "✓" : "+"}</span><div><strong>{widget.label}</strong><small>{widget.description}</small></div></button>)}</div><button className="quiet-button" type="button" onClick={resetDashboardLayout}>Standard wiederherstellen</button></section>}

        <div className={`dashboard-custom-grid ${dashboardEditing ? "is-editing" : ""}`}>{widgetOrder.filter((id) => !hiddenWidgets.includes(id)).map((id) => { const widget = dashboardWidgets.find((item) => item.id === id)!; return <div className={`dashboard-widget ${widget.wide ? "wide" : ""}`} key={id} draggable={dashboardEditing} onDragStart={() => setDraggedWidget(id)} onDragEnd={() => setDraggedWidget(null)} onDragOver={(event) => dashboardEditing && event.preventDefault()} onDrop={() => moveWidget(id)}>{dashboardEditing && <div className="dashboard-widget-handle" aria-label={`${widget.label} verschieben`}>⠿ <span>{widget.label}</span></div>}{dashboardContent[id]}</div>; })}</div>
      </main>
    </div>

    <button className="floating-action" type="button" aria-label="Notiz erstellen" onClick={() => openNote("new")}><Icon name="plus"/></button>
    {mobileMenuOpen && <div className="mobile-nav-menu" role="dialog" aria-label="Hauptmenü"><div className="mobile-nav-menu-head"><div>{mobileGroup && <button className="mobile-nav-back" type="button" onClick={() => setMobileGroupId(null)}><Icon name="chevron"/> Alle Hauptbereiche</button>}<p className="eyebrow">CareCore Navigation</p><strong>{mobileGroup?.label ?? "Hauptbereiche"}</strong></div><button type="button" aria-label="Hauptmenü schliessen" onClick={() => setMobileMenuOpen(false)}><Icon name="close"/></button></div>{mobileGroup ? <div className="mobile-nav-subgroups">{mobileGroup.modules.map((module) => <section key={module.id}><h3><Icon name={module.icon as IconName}/>{module.label}</h3><div>{module.children.map((child) => <button type="button" key={child} onClick={() => chooseMobileChild(module.id, child)}>{child}<Icon name="chevron"/></button>)}</div></section>)}</div> : <div className="mobile-nav-groups">{visibleNavigation.map((group) => <button className={group.id === mobileGroupId ? "active" : ""} type="button" key={group.id} onClick={() => chooseMobileGroup(group.id)}><span className="mobile-nav-group-icon"><Icon name={(group.modules[0]?.icon ?? "pulse") as IconName}/></span><span><strong>{group.label}</strong><small>{group.modules.length} Bereiche</small></span><Icon name="chevron"/></button>)}</div>}</div>}
    <nav className="bottom-nav" aria-label="Mobile Navigation"><button className="active" type="button" onClick={() => { setMobileGroupId(null); setMobileMenuOpen(false); router.push("/c"); }}><Icon name="home"/><span>Startseite</span></button>{!mobileGroup ? <button className={mobileMenuOpen ? "active" : ""} type="button" aria-haspopup="dialog" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((value) => !value)}><Icon name="sidebar"/><span>Menü</span></button> : <>{mobileGroup.modules.map((module) => { const href = routeFor(module.id, module.children[0]); return <button type="button" key={module.id} onClick={() => href && router.push(href)}><Icon name={module.icon as IconName}/><span>{module.label}</span></button>; })}{mobileNeedsMenu && <button className={mobileMenuOpen ? "active" : ""} type="button" aria-haspopup="dialog" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((value) => !value)}><Icon name="sidebar"/><span>Menü</span></button>}</>} </nav>

    {searchOpen && <div className="overlay" role="presentation" onClick={(event) => event.currentTarget === event.target && closeSearch()}><section id="global-search-dialog" className="search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche"><div className="search-input-wrap"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner oder Funktionen suchen…" aria-label="Suchbegriff"/><button type="button" onClick={closeSearch} aria-label="Suche schliessen">ESC</button></div><div className="search-results"><span className="search-group-label">{query ? "Suchergebnisse" : "Schnellzugriff"}</span>{filteredResults.map((result) => <button className="search-result" type="button" key={result.href} onClick={() => { closeSearch(); router.push(result.href); }}><span className="result-icon"><Icon name={result.icon}/></span><span><strong>{result.title}</strong><small>{result.meta}</small></span></button>)}</div></section></div>}

    {noteEditor && <div className="area-editor-overlay home-note-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setNoteEditor(null)}><section className="area-editor-panel home-note-panel" role="dialog" aria-modal="true" aria-labelledby="home-note-dialog-title"><div className="area-editor-header"><div><p className="eyebrow">MEIN ARBEITSPLATZ · PRIVAT</p><h2 id="home-note-dialog-title">{noteEditor === "new" ? "Notiz erstellen" : "Notiz bearbeiten"}</h2><p>Persönliche Merkpunkte für deinen Arbeitsalltag. Pflegebeobachtungen bitte in der Bewohnerakte dokumentieren.</p></div><button className="home-note-close" type="button" aria-label="Schliessen" onClick={() => setNoteEditor(null)}><Icon name="close"/></button></div><form className="area-editor-form home-note-form" onSubmit={(event) => void saveNote(event)}><div className="home-note-fields"><label>Titel<input required maxLength={160} value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Worum geht es?"/></label><label>Notiz<textarea required maxLength={4000} rows={9} value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Schreibe deinen Merkpunkt auf…"/></label><label className="home-note-pin"><input type="checkbox" checked={notePinned} onChange={(event) => setNotePinned(event.target.checked)}/><span>Oben anheften</span></label>{noteFormError && <p className="home-note-error" role="alert">{noteFormError}</p>}</div><div className="home-note-actions">{noteEditor !== "new" && <button className="home-note-delete" type="button" disabled={noteSaving} onClick={() => noteConfirmDelete ? void deleteNote() : setNoteConfirmDelete(true)}>{noteConfirmDelete ? "Löschen bestätigen" : "Notiz löschen"}</button>}<div><button className="secondary-button" type="button" onClick={() => setNoteEditor(null)}>Abbrechen</button><button className="primary-button" type="submit" disabled={noteSaving}>{noteSaving ? "Speichern…" : "Notiz speichern"}</button></div></div></form></section></div>}

    {toast && <div className="toast" role="status"><Icon name="check"/>{toast}</div>}
  </div>;
}

function Timeline({ time, title, detail, state, variant = "", rail = false }: { time: string; title: string; detail: string; state: string; variant?: string; rail?: boolean }) {
  return <div className={`timeline-row ${variant}`}><time className="timeline-time">{time}</time><span className="timeline-line"><i className="timeline-dot"/>{rail && <i className="timeline-rail"/>}</span><span className="timeline-content"><strong>{title}</strong><span>{detail}</span></span><span className={`timeline-state ${variant === "done" ? "done" : variant === "current" ? "now" : ""}`}>{state}</span></div>;
}

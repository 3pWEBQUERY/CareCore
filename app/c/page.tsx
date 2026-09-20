"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/app-header";
import AppSidebar from "../components/app-sidebar";
import { navigation, routeFor } from "../components/navigation";
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

type DashboardTask = { id: string; title: string; resident: string; time: string; completed: boolean; overdue: boolean };
type DashboardResident = { initials: string; name: string; room: string; risk: string; critical?: boolean };

type DashboardWidgetId = "summary" | "critical" | "changes" | "shift" | "tasks" | "residents";

const dashboardWidgets: Array<{ id: DashboardWidgetId; label: string; description: string; wide?: boolean }> = [
  { id: "summary", label: "Schichtübersicht", description: "Kennzahlen für den aktuellen Dienst", wide: true },
  { id: "critical", label: "Wichtiger Hinweis", description: "Kritische Informationen", wide: true },
  { id: "changes", label: "Seit letztem Dienst", description: "Relevante Veränderungen" },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [residentOpen, setResidentOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [employeeName, setEmployeeName] = useState("Anna");
  const [primaryCareUnitName, setPrimaryCareUnitName] = useState("");
  const [dashboardEditing, setDashboardEditing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(() => readStoredDashboardLayout().order);
  const [hiddenWidgets, setHiddenWidgets] = useState<DashboardWidgetId[]>(() => readStoredDashboardLayout().hidden);
  const [draggedWidget, setDraggedWidget] = useState<DashboardWidgetId | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileGroupId, setMobileGroupId] = useState<string | null>(null);
  const mobileGroup = navigation.find((group) => group.id === mobileGroupId);
  const mobileNeedsMenu = mobileGroup ? mobileGroup.modules.length > 4 : true;

  function chooseMobileGroup(groupId: string) {
    const group = navigation.find((item) => item.id === groupId);
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

  const openSearch = useCallback(() => {
    setResidentOpen(false);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); }
      if (event.key === "Escape") { setSearchOpen(false); setResidentOpen(false); }
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
      .then((response) => response.ok ? response.json() as Promise<{ profile?: { displayName?: string; primaryCareUnitName?: string } }> : null)
      .then((context) => { if (active && context?.profile?.displayName) { setEmployeeName(context.profile.displayName); setPrimaryCareUnitName(context.profile.primaryCareUnitName ?? ""); } })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([fetch("/api/tasks", { cache: "no-store" }), fetch("/api/residents", { cache: "no-store" })]).then(async ([tasksResponse, residentsResponse]) => {
      if (!tasksResponse.ok || !residentsResponse.ok) throw new Error("Dashboard-Daten konnten nicht geladen werden.");
      const taskData = await tasksResponse.json() as { tasks: Array<{ id: string; title: string; resident_name: string; due_at: string | null; status: string; assigned_to: string | null }>; currentUserId: string };
      const residentData = await residentsResponse.json() as { residents: Array<{ first_name: string; last_name: string; room: string; care_unit: string; note: string; severity: string }> };
      if (!active) return;
      setTasks(taskData.tasks.filter((item) => item.assigned_to === taskData.currentUserId).map((item) => ({ id: item.id, title: item.title, resident: item.resident_name, time: item.due_at ? new Date(item.due_at).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }) : "—", completed: item.status === "completed", overdue: Boolean(item.due_at && new Date(item.due_at).getTime() < Date.now()) })));
      setAssignedResidents(residentData.residents.filter((item) => !primaryCareUnitName || item.care_unit === primaryCareUnitName).map((item) => ({ initials: `${item.first_name[0] ?? ""}${item.last_name[0] ?? ""}`, name: `${item.first_name} ${item.last_name}`, room: item.room || "Zimmer offen", risk: item.note, critical: item.severity === "critical" })));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [primaryCareUnitName]);

  useEffect(() => {
    let active = true;
    void fetch("/api/dashboard/changes", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<{ changes: Array<{ id: string; first_name: string; last_name: string; title: string | null; body: string; importance: string; occurred_at: string }> }> : null).then((data) => {
      if (!active || !data) return;
      setChanges(data.changes.map((item) => ({ id: item.id, initials: `${item.first_name[0]}${item.last_name[0]}`, name: `${item.first_name} ${item.last_name}`, note: item.body, time: new Date(item.occurred_at).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }), type: ["critical", "important"].includes(item.importance) ? "critical" : item.importance === "observation" ? "attention" : "info", status: item.title || "Dokumentiert" })));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

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
    { title: "Frau Maria Keller", meta: "Bewohnerin · Zimmer 204", icon: "residents" as IconName },
    { title: "Herr Hans Müller", meta: "Bewohner · Zimmer 207", icon: "residents" as IconName },
    { title: "Weisung: Vorgehen bei Sturz", meta: "Dokument · Version 4.2", icon: "docs" as IconName },
    { title: "Meine Übergabe", meta: "3 offene Punkte", icon: "handover" as IconName },
  ].filter((result) => `${result.title} ${result.meta}`.toLowerCase().includes(query.toLowerCase())), [query]);

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

  const dashboardContent: Record<DashboardWidgetId, ReactNode> = {
    summary: <section className="summary-strip" aria-label="Schichtübersicht"><div className="summary-item"><span className="summary-icon"><Icon name="residents"/></span><span><strong className="summary-value">{assignedResidents.length}</strong><span className="summary-label">Bewohner zugeteilt</span></span></div><div className="summary-item"><span className="summary-icon"><Icon name="tasks"/></span><span><strong className="summary-value">{tasks.length}</strong><span className="summary-label">Aufgaben geplant</span></span></div><div className="summary-item"><span className="summary-icon attention"><Icon name="pulse"/></span><span><strong className="summary-value">{assignedResidents.filter((item) => item.critical).length}</strong><span className="summary-label">wichtige Hinweise</span></span></div><div className="summary-item"><span className="summary-icon info"><Icon name="handover"/></span><span><strong className="summary-value">{tasks.filter((item) => !item.completed).length}</strong><span className="summary-label">Aufgaben offen</span></span></div></section>,
    critical: <section className="critical-alert" aria-label="Kritischer Hinweis"><span className="critical-symbol"><Icon name="alert"/></span><div><strong>{changes.find((item) => item.type === "critical") ? `Unmittelbar prüfen · ${changes.find((item) => item.type === "critical")?.name}` : "Keine kritischen Hinweise"}</strong><p>{changes.find((item) => item.type === "critical")?.note ?? "Aktuell liegen keine kritischen Dokumentationen vor."}</p></div><button className="secondary-button" type="button" onClick={() => router.push("/c/pflegedokumentation/verlauf")}>Verlauf öffnen <Icon name="chevron" className="button-icon"/></button></section>,
    changes: <section className="card" aria-labelledby="changes-title"><div className="card-header"><div><h2 className="card-title" id="changes-title">Seit deinem letzten Dienst</h2><p className="card-subtitle">Relevante Veränderungen · letzte 16 Stunden</p></div><button className="filter-pill" type="button">Alle {changes.length}</button></div><div className="changes-list">{changes.map((change) => <button className="change-row" key={change.id} type="button" onClick={() => router.push("/c/pflegedokumentation/verlauf")}><span className={`resident-avatar ${change.type === "critical" ? "critical" : ""}`}>{change.initials}<span className="avatar-status"/></span><span className="change-main"><strong>{change.name}</strong><p>{change.note}</p></span><span className="change-meta"><span>{change.time}</span><span className={`status-badge ${change.type}`}>{change.status}</span><Icon name="chevron" className="chevron"/></span></button>)}</div></section>,
    shift: <section className="card timeline-card" aria-labelledby="timeline-title"><div className="card-header"><div><h2 className="card-title" id="timeline-title">Meine Schicht</h2><p className="card-subtitle">Der Plan passt sich neuen Ereignissen an</p></div><button className="quiet-button" type="button" onClick={() => setToast("Gesamte Schichtansicht geöffnet")}>Gesamter Plan</button></div><div className="timeline-list"><Timeline time="06:45" title="Übergabe Nachtdienst" detail="Wohnbereich 2 · Teamraum" state="Erledigt" variant="done" rail/><Timeline time="07:30" title="Medikamentenrunde" detail="7 Bewohner · 1 Anpassung" state="Jetzt" variant="current" rail/><Timeline time="08:00" title="Blutzucker & Sturzkontrolle" detail="Frau Keller · Herr Müller" state="In 18 Min." rail/><Timeline time="09:30" title="Arztvisite" detail="Zimmer 204, 207 und 211" state="Geplant" rail/><Timeline time="10:00" title="Verbandwechsel" detail="Frau Baumann · Zimmer 214" state="Geplant"/></div></section>,
    tasks: <section className="card tasks-card" aria-labelledby="tasks-title"><div className="card-header"><div><h2 className="card-title" id="tasks-title">Als Nächstes</h2><p className="card-subtitle">{tasks.filter((task) => !task.completed).length} Aufgaben offen</p></div><div className="progress-ring" style={{ "--progress": `${progress}%` } as CSSProperties} aria-label={`${progress} Prozent erledigt`}><span>{progress}%</span></div></div><div className="dashboard-task-list">{tasks.map((task) => <div className={`dashboard-task-row ${task.completed ? "completed" : ""}`} key={task.id}><button className="dashboard-task-check" type="button" aria-label={`${task.title} ${task.completed ? "wieder öffnen" : "erledigen"}`} onClick={() => void toggleTask(task.id)}><Icon name="check"/></button><span className="dashboard-task-copy"><strong className="dashboard-task-title">{task.title}</strong><span className="dashboard-task-resident">{task.resident}</span></span><time className={`dashboard-task-time ${task.overdue && !task.completed ? "overdue" : ""}`}>{task.time}</time></div>)}</div><div className="tasks-footer"><button className="quiet-button" type="button" onClick={() => router.push("/c/betrieb/aufgaben")}>Alle Aufgaben <Icon name="chevron" className="button-icon"/></button></div></section>,
    residents: <section className="card residents-card" aria-labelledby="residents-title"><div className="card-header"><div><h2 className="card-title" id="residents-title">Meine Bewohner</h2><p className="card-subtitle">{assignedResidents.length} im gewählten Wohnbereich</p></div><button className="quiet-button" type="button" onClick={() => router.push("/c/bewohner")}>Alle anzeigen</button></div><div className="resident-grid">{assignedResidents.map((resident) => <button className="resident-tile" type="button" key={resident.name} onClick={() => router.push("/c/bewohner")}><span className={`resident-avatar ${resident.critical ? "critical" : ""}`}>{resident.initials}</span><span><strong>{resident.name}</strong><p>{resident.room} · <span className="risk-label">{resident.risk}</span></p></span></button>)}</div></section>,
  };

  return <div className="app-shell">
    <AppSidebar activeModule="home" onToast={setToast}/>

    <div className="main-column">
      <AppHeader searchOpen={searchOpen} onSearch={openSearch} onToast={setToast}/>

      <main className="workspace">
        <section className="page-heading" aria-labelledby="page-title"><div className="heading-copy"><p className="eyebrow">Montag, 7. September · Frühdienst</p><h1 id="page-title">Guten Morgen, {employeeName}.</h1><p>Deine Schicht auf Wohnbereich 2 ist vorbereitet.</p></div><div className="dashboard-heading-actions"><button className="secondary-button" type="button" aria-pressed={dashboardEditing} onClick={() => setDashboardEditing((value) => !value)}>{dashboardEditing ? "Fertig" : "Arbeitsplatz bearbeiten"}</button><button className="primary-button" type="button" onClick={() => setToast("Neue Dokumentation vorbereitet")}><Icon name="plus" className="button-icon"/>Dokumentieren</button></div></section>

        {dashboardEditing && <section className="dashboard-customizer" aria-label="Arbeitsplatz bearbeiten"><div><p className="eyebrow">Persönlicher Arbeitsplatz</p><h2>Komponenten anordnen</h2><p>Ziehe sichtbare Komponenten auf dem Dashboard an die gewünschte Stelle oder blende sie ein und aus.</p></div><div className="dashboard-customizer-list">{dashboardWidgets.map((widget) => <button className={!hiddenWidgets.includes(widget.id) ? "active" : ""} type="button" key={widget.id} onClick={() => toggleWidget(widget.id)}><span>{!hiddenWidgets.includes(widget.id) ? "✓" : "+"}</span><div><strong>{widget.label}</strong><small>{widget.description}</small></div></button>)}</div><button className="quiet-button" type="button" onClick={resetDashboardLayout}>Standard wiederherstellen</button></section>}

        <div className={`dashboard-custom-grid ${dashboardEditing ? "is-editing" : ""}`}>{widgetOrder.filter((id) => !hiddenWidgets.includes(id)).map((id) => { const widget = dashboardWidgets.find((item) => item.id === id)!; return <div className={`dashboard-widget ${widget.wide ? "wide" : ""}`} key={id} draggable={dashboardEditing} onDragStart={() => setDraggedWidget(id)} onDragEnd={() => setDraggedWidget(null)} onDragOver={(event) => dashboardEditing && event.preventDefault()} onDrop={() => moveWidget(id)}>{dashboardEditing && <div className="dashboard-widget-handle" aria-label={`${widget.label} verschieben`}>⠿ <span>{widget.label}</span></div>}{dashboardContent[id]}</div>; })}</div>
      </main>
    </div>

    <button className="floating-action" type="button" aria-label="Schnellaktion" onClick={() => setResidentOpen(true)}><Icon name="plus"/></button>
    {mobileMenuOpen && <div className="mobile-nav-menu" role="dialog" aria-label="Hauptmenü"><div className="mobile-nav-menu-head"><div>{mobileGroup && <button className="mobile-nav-back" type="button" onClick={() => setMobileGroupId(null)}><Icon name="chevron"/> Alle Hauptbereiche</button>}<p className="eyebrow">CareCore Navigation</p><strong>{mobileGroup?.label ?? "Hauptbereiche"}</strong></div><button type="button" aria-label="Hauptmenü schliessen" onClick={() => setMobileMenuOpen(false)}><Icon name="close"/></button></div>{mobileGroup ? <div className="mobile-nav-subgroups">{mobileGroup.modules.map((module) => <section key={module.id}><h3><Icon name={module.icon as IconName}/>{module.label}</h3><div>{module.children.map((child) => <button type="button" key={child} onClick={() => chooseMobileChild(module.id, child)}>{child}<Icon name="chevron"/></button>)}</div></section>)}</div> : <div className="mobile-nav-groups">{navigation.map((group) => <button className={group.id === mobileGroupId ? "active" : ""} type="button" key={group.id} onClick={() => chooseMobileGroup(group.id)}><span className="mobile-nav-group-icon"><Icon name={(group.modules[0]?.icon ?? "pulse") as IconName}/></span><span><strong>{group.label}</strong><small>{group.modules.length} Bereiche</small></span><Icon name="chevron"/></button>)}</div>}</div>}
    <nav className="bottom-nav" aria-label="Mobile Navigation"><button className="active" type="button" onClick={() => { setMobileGroupId(null); setMobileMenuOpen(false); router.push("/c"); }}><Icon name="home"/><span>Startseite</span></button>{!mobileGroup ? <button className={mobileMenuOpen ? "active" : ""} type="button" aria-haspopup="dialog" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((value) => !value)}><Icon name="sidebar"/><span>Menü</span></button> : <>{mobileGroup.modules.map((module) => { const href = routeFor(module.id, module.children[0]); return <button type="button" key={module.id} onClick={() => href && router.push(href)}><Icon name={module.icon as IconName}/><span>{module.label}</span></button>; })}{mobileNeedsMenu && <button className={mobileMenuOpen ? "active" : ""} type="button" aria-haspopup="dialog" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((value) => !value)}><Icon name="sidebar"/><span>Menü</span></button>}</>} </nav>

    {searchOpen && <div className="overlay" role="presentation" onClick={(event) => event.currentTarget === event.target && closeSearch()}><section id="global-search-dialog" className="search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche"><div className="search-input-wrap"><Icon name="search"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner, Dokumente oder Funktionen suchen…" aria-label="Suchbegriff"/><button type="button" onClick={closeSearch} aria-label="Suche schliessen">ESC</button></div><div className="search-results"><span className="search-group-label">{query ? "Suchergebnisse" : "Schnellzugriff"}</span>{filteredResults.map((result) => <button className="search-result" type="button" key={result.title} onClick={() => { closeSearch(); if (result.icon === "residents") { setResidentOpen(true); } else { setToast(`${result.title} geöffnet`); } }}><span className="result-icon"><Icon name={result.icon}/></span><span><strong>{result.title}</strong><small>{result.meta}</small></span></button>)}</div></section></div>}

    {residentOpen && <div className="drawer-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setResidentOpen(false)}><aside className="resident-drawer" role="dialog" aria-modal="true" aria-labelledby="resident-title"><div className="drawer-header"><div className="drawer-topline"><span>BEWOHNERÜBERSICHT</span><button className="close-button" type="button" aria-label="Schliessen" onClick={() => setResidentOpen(false)}><Icon name="close"/></button></div><div className="resident-identity"><span className="resident-avatar critical">HM</span><div><h2 id="resident-title">Hans Müller</h2><p>84 Jahre · Zimmer 207</p></div></div><div className="risk-row"><span className="risk-chip critical">Sturzrisiko hoch</span><span className="risk-chip">Antikoagulation</span><span className="risk-chip">Rollator</span></div></div><div className="drawer-body"><section className="drawer-section"><h3>Aktuell wichtig</h3><div className="clinical-note"><strong>Sturz um 02:10 Uhr</strong>Keine sichtbaren Verletzungen. Neurologische Kontrolle gemäss Standard bis 14:00 Uhr weiterführen.</div></section><section className="drawer-section"><h3>Letzte Ereignisse</h3><DrawerEvent time="06:10">Vitalwerte stabil: BD 132/78, Puls 72/min.</DrawerEvent><DrawerEvent time="04:10">Neurologische Kontrolle ohne Auffälligkeit.</DrawerEvent><DrawerEvent time="02:18">Arzt gemäss Nachtstandard telefonisch informiert.</DrawerEvent><DrawerEvent time="02:10">Sturz neben dem Bett, auf rechter Seite aufgefunden.</DrawerEvent></section><section className="drawer-section"><h3>Schnellaktionen</h3><div className="quick-actions-grid"><QuickAction icon="note" label="Dokumentieren" action={() => setToast("Dokumentation für Hans Müller vorbereitet")}/><QuickAction icon="vitals" label="Vitalwert erfassen" action={() => setToast("Vitalwerterfassung vorbereitet")}/><QuickAction icon="tasks" label="Aufgabe erstellen" action={() => setToast("Neue Aufgabe vorbereitet")}/><QuickAction icon="report" label="Ereignis melden" action={() => setToast("Ereignismeldung vorbereitet")}/></div></section></div></aside></div>}

    {toast && <div className="toast" role="status"><Icon name="check"/>{toast}</div>}
  </div>;
}

function Timeline({ time, title, detail, state, variant = "", rail = false }: { time: string; title: string; detail: string; state: string; variant?: string; rail?: boolean }) {
  return <div className={`timeline-row ${variant}`}><time className="timeline-time">{time}</time><span className="timeline-line"><i className="timeline-dot"/>{rail && <i className="timeline-rail"/>}</span><span className="timeline-content"><strong>{title}</strong><span>{detail}</span></span><span className={`timeline-state ${variant === "done" ? "done" : variant === "current" ? "now" : ""}`}>{state}</span></div>;
}

function DrawerEvent({ time, children }: { time: string; children: ReactNode }) {
  return <div className="drawer-timeline-item"><time>{time}</time><i/><p>{children}</p></div>;
}

function QuickAction({ icon, label, action }: { icon: IconName; label: string; action: () => void }) {
  return <button className="quick-action" type="button" onClick={action}><Icon name={icon}/>{label}</button>;
}

"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
  Sparkle,
  Stethoscope,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";

type IconName = "home" | "residents" | "tasks" | "handover" | "calendar" | "team" | "learn" | "docs" | "chart" | "quality" | "settings" | "search" | "bell" | "building" | "chevron" | "caretDown" | "alert" | "check" | "plus" | "pulse" | "close" | "note" | "vitals" | "report" | "plan" | "med" | "wounds" | "nutrition" | "assess" | "shift" | "ai" | "sidebar";

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
  };
  const Component = icons[name];
  return <Component className={className} aria-hidden="true" weight="regular"/>;
}

type NavModule = { id: string; label: string; icon: IconName; children: string[]; badge?: number };
type NavGroup = { id: string; label: string; modules: NavModule[] };

const navigation: NavGroup[] = [
  { id: "clinical", label: "Clinical", modules: [
    { id: "residents", label: "Residents", icon: "residents", children: ["Übersicht", "Timeline", "Pflegeakte"] },
    { id: "plan", label: "Plan", icon: "plan", children: ["Pflegeplanung", "Ziele & Massnahmen", "Evaluation"] },
    { id: "chart", label: "Chart", icon: "note", children: ["Schnelldokumentation", "Verlaufsdokumentation"] },
    { id: "vitals", label: "Vitals", icon: "vitals", children: ["Messwerte", "Trends", "Grenzwerte"] },
    { id: "med", label: "Med", icon: "med", children: ["Medikamentenplan", "Medikamentenrunde", "Bestände"] },
    { id: "wounds", label: "Wounds", icon: "wounds", children: ["Wundübersicht", "Dokumentation"] },
    { id: "nutrition", label: "Nutrition", icon: "nutrition", children: ["Ernährungsplan", "Trinkprotokoll"] },
    { id: "assess", label: "Assess", icon: "assess", children: ["Assessments", "Fälligkeiten"] },
  ] },
  { id: "operations", label: "Operations", modules: [
    { id: "shift", label: "Shift", icon: "shift", children: ["Mein Dienst", "Schicht-Timeline"] },
    { id: "tasks", label: "Tasks", icon: "tasks", children: ["Meine Aufgaben", "Teamaufgaben"], badge: 3 },
    { id: "handover", label: "Handover", icon: "handover", children: ["Meine Übergabe", "Seit letztem Dienst"] },
    { id: "schedule", label: "Schedule", icon: "calendar", children: ["Mein Dienstplan", "Teamplanung"] },
  ] },
  { id: "workforce", label: "Workforce", modules: [
    { id: "team", label: "Team", icon: "team", children: ["News & Kanäle", "Chat"] },
    { id: "learn", label: "Learn", icon: "learn", children: ["Meine Schulungen", "Compliance"] },
    { id: "docs", label: "Docs", icon: "docs", children: ["Dokumente", "Standards & Weisungen"] },
  ] },
  { id: "management", label: "Management", modules: [
    { id: "quality", label: "Quality", icon: "quality", children: ["Ereignisse", "Massnahmen"] },
    { id: "insights", label: "Insights", icon: "chart", children: ["Pflege", "Management", "Workforce"] },
    { id: "admin", label: "Admin", icon: "settings", children: ["Organisation", "Benutzer & Rollen", "Konfiguration"] },
  ] },
  { id: "intelligence", label: "Intelligence", modules: [
    { id: "ai", label: "CareCore AI", icon: "ai", children: ["Assistenz", "AI-Entwürfe"] },
  ] },
];

const changes = [
  { initials: "HM", name: "Herr Hans Müller", note: "Sturz um 02:10 Uhr. Keine sichtbaren Verletzungen, engmaschige Beobachtung läuft.", time: "02:10", status: "Kritisch", type: "critical" },
  { initials: "MK", name: "Frau Maria Keller", note: "Schmerzen im rechten Knie, NRS 6. Bedarfsmedikation um 05:40 verabreicht.", time: "05:40", status: "Beobachten", type: "attention" },
  { initials: "EM", name: "Frau Erika Meier", note: "Metoprolol ab heute auf 50 mg angepasst. Erste Gabe zur Medikamentenrunde.", time: "Gestern", status: "Geändert", type: "info" },
] as const;

const residents = [
  { initials: "MK", name: "Maria Keller", room: "Zimmer 204", risk: "Sturzrisiko" },
  { initials: "HM", name: "Hans Müller", room: "Zimmer 207", risk: "Beobachtung", critical: true },
  { initials: "EM", name: "Erika Meier", room: "Zimmer 211", risk: "Medikation neu" },
  { initials: "RB", name: "Ruth Baumann", room: "Zimmer 214", risk: "Stabil" },
];

const initialTasks = [
  { id: 1, title: "Blutzucker kontrollieren", resident: "Frau Keller · Zimmer 204", time: "07:30", completed: false, overdue: true },
  { id: 2, title: "Medikation verabreichen", resident: "Frau Meier · Zimmer 211", time: "07:45", completed: false },
  { id: 3, title: "Sturz-Nachkontrolle", resident: "Herr Müller · Zimmer 207", time: "08:00", completed: false },
  { id: 4, title: "Morgenpflege dokumentieren", resident: "Frau Baumann · Zimmer 214", time: "08:15", completed: true },
  { id: 5, title: "Trinkmenge erfassen", resident: "Herr Aebischer · Zimmer 215", time: "08:30", completed: false },
];

function Brand() {
  return <div className="brand" aria-label="CareCore"><span className="brand-mark"><Icon name="pulse"/></span><span className="brand-copy"><span className="brand-name">CareCore</span><small>Mehr Zeit für Pflege.</small></span></div>;
}

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [residentOpen, setResidentOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["operations"]);
  const [openModules, setOpenModules] = useState<string[]>(["shift"]);
  const [activeNav, setActiveNav] = useState("Mein Dienst");

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
    const context = (document as Document & { modelContext?: WebMCPContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const completeTask = {
      name: "complete_shift_task",
      title: "Schichtaufgabe abschliessen",
      description: "Markiert eine sichtbare Aufgabe der aktuellen Schicht als erledigt.",
      inputSchema: {
        type: "object",
        properties: { taskId: { type: "integer", minimum: 1, maximum: 5 } },
        required: ["taskId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const taskId = (input as { taskId?: unknown })?.taskId;
        const task = initialTasks.find((item) => item.id === taskId);
        if (!task || typeof taskId !== "number") throw new Error("Unbekannte Aufgaben-ID");
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
  const progress = Math.round((completed / tasks.length) * 100);
  const filteredResults = useMemo(() => [
    { title: "Frau Maria Keller", meta: "Bewohnerin · Zimmer 204", icon: "residents" as IconName },
    { title: "Herr Hans Müller", meta: "Bewohner · Zimmer 207", icon: "residents" as IconName },
    { title: "Weisung: Vorgehen bei Sturz", meta: "Dokument · Version 4.2", icon: "docs" as IconName },
    { title: "Meine Übergabe", meta: "3 offene Punkte", icon: "handover" as IconName },
  ].filter((result) => `${result.title} ${result.meta}`.toLowerCase().includes(query.toLowerCase())), [query]);

  function toggleTask(id: number) {
    const task = tasks.find((item) => item.id === id);
    setTasks((current) => current.map((item) => item.id === id ? { ...item, completed: !item.completed } : item));
    if (task && !task.completed) setToast(`„${task.title}“ als erledigt markiert`);
  }

  const unavailable = (label: string) => setToast(`${label} ist in dieser Demo noch nicht freigeschaltet`);

  function toggleGroup(id: string) {
    if (sidebarCollapsed) setSidebarCollapsed(false);
    setOpenGroups((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleModule(groupId: string, moduleId: string) {
    if (sidebarCollapsed) setSidebarCollapsed(false);
    if (!openGroups.includes(groupId)) setOpenGroups((current) => [...current, groupId]);
    setOpenModules((current) => current.includes(moduleId) ? current.filter((item) => item !== moduleId) : [...current, moduleId]);
  }

  function selectNav(label: string) {
    setActiveNav(label);
    setToast(`${label} geöffnet`);
  }

  return <div className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
    <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-head"><Brand/><button className="sidebar-collapse" type="button" aria-label={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"} onClick={() => setSidebarCollapsed((value) => !value)}><Icon name="sidebar"/></button></div>
      <nav className="sidebar-scroll" aria-label="Hauptnavigation">
        <button className={`nav-button nav-home ${activeNav === "Home" ? "active" : ""}`} type="button" title="Home" onClick={() => selectNav("Home")}><Icon name="home"/><span className="nav-label">Home</span></button>
        <div className="nav-groups">
          {navigation.map((group) => {
            const groupOpen = openGroups.includes(group.id);
            return <section className={`nav-group ${groupOpen ? "open" : ""}`} key={group.id}>
              <button className="group-toggle" type="button" aria-expanded={groupOpen} title={group.label} onClick={() => toggleGroup(group.id)}><span>{group.label}</span><Icon name="caretDown"/></button>
              <div className="module-list">
                {group.modules.map((module) => {
                  const moduleOpen = openModules.includes(module.id);
                  const moduleActive = module.children.includes(activeNav);
                  return <div className={`module-block ${moduleOpen ? "open" : ""}`} key={module.id}>
                    <button className={`nav-button module-button ${moduleActive ? "active" : ""}`} type="button" aria-expanded={moduleOpen} title={module.label} onClick={() => toggleModule(group.id, module.id)}><Icon name={module.icon}/><span className="nav-label">{module.label}</span>{module.badge && <span className="nav-badge">{module.badge}</span>}<Icon name="chevron" className="module-caret"/></button>
                    <div className="submenu">{module.children.map((child) => <button className={`submenu-button ${activeNav === child ? "active" : ""}`} type="button" key={child} onClick={() => selectNav(child)}><span className="submenu-rail"/><span>{child}</span></button>)}</div>
                  </div>;
                })}
              </div>
            </section>;
          })}
        </div>
      </nav>
      <div className="sidebar-footer"><button className="nav-button" type="button" title="Einstellungen" onClick={() => selectNav("Einstellungen")}><Icon name="settings"/><span className="nav-label">Einstellungen</span></button><button className="nav-button" type="button" title="Hilfe & Support" onClick={() => setToast("Hilfe & Support geöffnet")}><Icon name="docs"/><span className="nav-label">Hilfe & Support</span></button></div>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <button className="location-control" type="button" onClick={() => setToast("Standortauswahl geöffnet")}><span className="location-icon"><Icon name="building"/></span><span><small>Alterszentrum Sonnengarten</small><strong>Wohnbereich 2 · 1. OG</strong></span><Icon name="chevron" className="chevron"/></button>
        <div className="top-actions"><button className="search-trigger" type="button" onClick={openSearch} aria-label="Globale Suche öffnen" aria-haspopup="dialog" aria-controls="global-search-dialog" aria-expanded={searchOpen}><Icon name="search"/><span>Suchen…</span><kbd>⌘ K</kbd></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><Icon name="bell"/><span className="notification-dot"/></button><div className="profile"><span className="avatar">AM</span><span><small>Pflegefachfrau HF</small><strong>Anna Meier</strong></span></div></div>
      </header>
      <header className="mobile-top"><Brand/><div className="mobile-actions"><button className="icon-button" type="button" aria-label="Suche öffnen" onClick={openSearch} aria-haspopup="dialog" aria-controls="global-search-dialog" aria-expanded={searchOpen}><Icon name="search"/></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><Icon name="bell"/><span className="notification-dot"/></button></div></header>

      <main className="workspace">
        <section className="page-heading" aria-labelledby="page-title"><div className="heading-copy"><p className="eyebrow">Montag, 7. September · Frühdienst</p><h1 id="page-title">Guten Morgen, Anna.</h1><p>Deine Schicht auf Wohnbereich 2 ist vorbereitet.</p></div><button className="primary-button" type="button" onClick={() => setToast("Neue Dokumentation vorbereitet")}><Icon name="plus" className="button-icon"/>Dokumentieren</button></section>

        <section className="summary-strip" aria-label="Schichtübersicht">
          <div className="summary-item"><span className="summary-icon"><Icon name="residents"/></span><span><strong className="summary-value">7</strong><span className="summary-label">Bewohner zugeteilt</span></span></div>
          <div className="summary-item"><span className="summary-icon"><Icon name="tasks"/></span><span><strong className="summary-value">18</strong><span className="summary-label">Aufgaben geplant</span></span></div>
          <div className="summary-item"><span className="summary-icon attention"><Icon name="pulse"/></span><span><strong className="summary-value">3</strong><span className="summary-label">wichtige Änderungen</span></span></div>
          <div className="summary-item"><span className="summary-icon info"><Icon name="handover"/></span><span><strong className="summary-value">1</strong><span className="summary-label">Übergabe offen</span></span></div>
        </section>

        <section className="critical-alert" aria-label="Kritischer Hinweis"><span className="critical-symbol"><Icon name="alert"/></span><div><strong>Unmittelbar prüfen · Herr Müller</strong><p>Sturz in der Nacht. Nächste neurologische Kontrolle um 08:00 Uhr.</p></div><button className="secondary-button" type="button" onClick={() => setResidentOpen(true)}>Fall öffnen <Icon name="chevron" className="button-icon"/></button></section>

        <div className="dashboard-grid">
          <div>
            <section className="card" aria-labelledby="changes-title">
              <div className="card-header"><div><h2 className="card-title" id="changes-title">Seit deinem letzten Dienst</h2><p className="card-subtitle">Relevante Veränderungen · letzte 16 Stunden</p></div><button className="filter-pill" type="button">Alle 3</button></div>
              <div className="changes-list">{changes.map((change) => <button className="change-row" key={change.name} type="button" onClick={() => setResidentOpen(true)}><span className={`resident-avatar ${change.type === "critical" ? "critical" : ""}`}>{change.initials}<span className="avatar-status"/></span><span className="change-main"><strong>{change.name}</strong><p>{change.note}</p></span><span className="change-meta"><span>{change.time}</span><span className={`status-badge ${change.type}`}>{change.status}</span><Icon name="chevron" className="chevron"/></span></button>)}</div>
            </section>

            <section className="card timeline-card" aria-labelledby="timeline-title">
              <div className="card-header"><div><h2 className="card-title" id="timeline-title">Meine Schicht</h2><p className="card-subtitle">Der Plan passt sich neuen Ereignissen an</p></div><button className="quiet-button" type="button" onClick={() => setToast("Gesamte Schichtansicht geöffnet")}>Gesamter Plan</button></div>
              <div className="timeline-list">
                <Timeline time="06:45" title="Übergabe Nachtdienst" detail="Wohnbereich 2 · Teamraum" state="Erledigt" variant="done" rail/>
                <Timeline time="07:30" title="Medikamentenrunde" detail="7 Bewohner · 1 Anpassung" state="Jetzt" variant="current" rail/>
                <Timeline time="08:00" title="Blutzucker & Sturzkontrolle" detail="Frau Keller · Herr Müller" state="In 18 Min." rail/>
                <Timeline time="09:30" title="Arztvisite" detail="Zimmer 204, 207 und 211" state="Geplant" rail/>
                <Timeline time="10:00" title="Verbandwechsel" detail="Frau Baumann · Zimmer 214" state="Geplant"/>
              </div>
            </section>
          </div>

          <section className="card tasks-card" aria-labelledby="tasks-title">
            <div className="card-header"><div><h2 className="card-title" id="tasks-title">Als Nächstes</h2><p className="card-subtitle">{tasks.filter((task) => !task.completed).length} Aufgaben bis 09:00 Uhr</p></div><div className="progress-ring" style={{"--progress": `${progress}%`} as CSSProperties} aria-label={`${progress} Prozent erledigt`}><span>{progress}%</span></div></div>
            <div className="task-list">{tasks.map((task) => <div className={`task-row ${task.completed ? "completed" : ""}`} key={task.id}><button className="task-check" type="button" aria-label={`${task.title} ${task.completed ? "wieder öffnen" : "erledigen"}`} onClick={() => toggleTask(task.id)}><Icon name="check"/></button><span><strong className="task-title">{task.title}</strong><span className="task-resident">{task.resident}</span></span><time className={`task-time ${task.overdue && !task.completed ? "overdue" : ""}`}>{task.time}</time></div>)}</div>
            <div className="tasks-footer"><button className="quiet-button" type="button" onClick={() => setToast("Alle 18 Aufgaben geöffnet")}>Alle 18 Aufgaben <Icon name="chevron" className="button-icon"/></button></div>
          </section>

          <section className="card residents-card" aria-labelledby="residents-title"><div className="card-header"><div><h2 className="card-title" id="residents-title">Meine Bewohner</h2><p className="card-subtitle">4 von 7 mit aktuellen Hinweisen</p></div><button className="quiet-button" type="button" onClick={() => unavailable("Bewohnerübersicht")}>Alle anzeigen</button></div><div className="resident-grid">{residents.map((resident) => <button className="resident-tile" type="button" key={resident.name} onClick={() => setResidentOpen(true)}><span className={`resident-avatar ${resident.critical ? "critical" : ""}`}>{resident.initials}</span><span><strong>{resident.name}</strong><p>{resident.room} · <span className="risk-label">{resident.risk}</span></p></span></button>)}</div></section>
        </div>
      </main>
    </div>

    <button className="floating-action" type="button" aria-label="Schnellaktion" onClick={() => setResidentOpen(true)}><Icon name="plus"/></button>
    <nav className="bottom-nav" aria-label="Mobile Navigation">{([["Home","home"],["Bewohner","residents"],["Aufgaben","tasks"],["Team","team"],["Mehr","settings"]] as const).map(([label,icon]) => <button className={label === "Home" ? "active" : ""} type="button" key={label} onClick={() => label !== "Home" && unavailable(label)}><Icon name={icon}/><span>{label}</span></button>)}</nav>

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

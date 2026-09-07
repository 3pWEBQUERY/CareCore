"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

type IconName = "home" | "residents" | "tasks" | "handover" | "calendar" | "team" | "learn" | "docs" | "chart" | "quality" | "settings" | "search" | "bell" | "building" | "chevron" | "alert" | "check" | "plus" | "pulse" | "close" | "note" | "vitals" | "report";

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
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
    residents: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-2.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V20M16 4.7a3 3 0 0 1 0 5.7M16.5 13a4.5 4.5 0 0 1 4 4.5V20"/></>,
    tasks: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8M8 15h8"/></>,
    handover: <><path d="M7 7h11l-3-3M17 17H6l3 3"/><path d="m18 7-3 3M6 17l3-3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
    team: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13 15a4.5 4.5 0 0 1 8 3v2"/></>,
    learn: <><path d="m3 6 9-3 9 3-9 3-9-3Z"/><path d="M6 8v6c3 3 9 3 12 0V8M21 6v7"/></>,
    docs: <><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    quality: <><path d="M12 2 4 5v6c0 5 3.4 9.2 8 11 4.6-1.8 8-6 8-11V5l-8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    building: <><path d="M4 21V5l8-3 8 3v16M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M9 21v-5h6v5"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    alert: <><path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    pulse: <path d="M3 12h4l2-5 4 10 2-5h6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    note: <><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    vitals: <><circle cx="12" cy="12" r="10"/><path d="M3 12h4l2-5 4 10 2-5h6"/></>,
    report: <><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const navigation = [
  [["Home","home"],["Bewohner","residents"],["Aufgaben","tasks"],["Übergabe","handover"],["Dienstplan","calendar"]],
  [["Team","team"],["Lernen","learn"],["Dokumente","docs"]],
  [["Insights","chart"],["Qualität","quality"],["Administration","settings"]],
] as const;

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
  return <div className="brand" aria-label="CareCore"><span className="brand-mark" aria-hidden="true"/><span className="brand-name">CareCore</span></div>;
}

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [residentOpen, setResidentOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") { setSearchOpen(false); setResidentOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  return <div className="app-shell">
    <aside className="sidebar">
      <Brand />
      <nav aria-label="Hauptnavigation">
        {navigation.map((section, sectionIndex) => <div className="nav-section" key={sectionIndex}>
          {section.map(([label, icon]) => <button className={`nav-button ${label === "Home" ? "active" : ""}`} key={label} type="button" onClick={() => label !== "Home" && unavailable(label)}><Icon name={icon}/><span>{label}</span></button>)}
        </div>)}
      </nav>
      <div className="nav-spacer" />
      <div className="shift-mini"><span className="shift-mini-label">Aktuelle Schicht</span><strong>Frühdienst</strong><p>06:45–15:15 · 22 %</p><div className="progress-track"><span/></div></div>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <button className="location-control" type="button" onClick={() => setToast("Standortauswahl geöffnet")}><span className="location-icon"><Icon name="building"/></span><span><small>Alterszentrum Sonnengarten</small><strong>Wohnbereich 2 · 1. OG</strong></span><Icon name="chevron" className="chevron"/></button>
        <div className="top-actions"><button className="search-trigger" type="button" onClick={() => setSearchOpen(true)} aria-label="Globale Suche öffnen"><Icon name="search"/><span>Suchen…</span><kbd>⌘ K</kbd></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><Icon name="bell"/><span className="notification-dot"/></button><div className="profile"><span className="avatar">AM</span><span><small>Pflegefachfrau HF</small><strong>Anna Meier</strong></span></div></div>
      </header>
      <header className="mobile-top"><Brand/><div className="mobile-actions"><button className="icon-button" type="button" aria-label="Suche öffnen" onClick={() => setSearchOpen(true)}><Icon name="search"/></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><Icon name="bell"/><span className="notification-dot"/></button></div></header>

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

    {searchOpen && <div className="overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setSearchOpen(false)}><section className="search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche"><div className="search-input-wrap"><Icon name="search"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner, Dokumente oder Funktionen suchen…" aria-label="Suchbegriff"/><button type="button" onClick={() => setSearchOpen(false)}>ESC</button></div><div className="search-results"><span className="search-group-label">{query ? "Suchergebnisse" : "Schnellzugriff"}</span>{filteredResults.map((result) => <button className="search-result" type="button" key={result.title} onClick={() => { setSearchOpen(false); result.icon === "residents" ? setResidentOpen(true) : setToast(`${result.title} geöffnet`); }}><span className="result-icon"><Icon name={result.icon}/></span><span><strong>{result.title}</strong><small>{result.meta}</small></span></button>)}</div></section></div>}

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

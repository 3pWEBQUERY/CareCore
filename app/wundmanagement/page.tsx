"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
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
  Files,
  FirstAidKit,
  ForkKnife,
  Funnel,
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
} from "@phosphor-icons/react";

type IconName = "home" | "residents" | "tasks" | "handover" | "calendar" | "team" | "learn" | "docs" | "chart" | "quality" | "settings" | "search" | "bell" | "building" | "chevron" | "caretDown" | "alert" | "check" | "plus" | "pulse" | "note" | "vitals" | "plan" | "med" | "wounds" | "nutrition" | "assess" | "shift" | "ai" | "sidebar" | "filter";
type NavModule = { id: string; label: string; icon: IconName; children: string[]; badge?: number; href?: string };
type NavGroup = { id: string; label: string; modules: NavModule[] };
type WoundStatus = "Alle" | "Kritisch" | "In Behandlung" | "Heilend";

type WoundCase = {
  id: string;
  initials: string;
  resident: string;
  room: string;
  location: string;
  diagnosis: string;
  size: string;
  status: Exclude<WoundStatus, "Alle">;
  tone: "critical" | "attention" | "stable";
  lastCare: string;
  nextCare: string;
  progress: number;
  owner: string;
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const icons = { home: House, residents: UsersThree, tasks: ListChecks, handover: ArrowsLeftRight, calendar: CalendarDots, team: ChatsCircle, learn: GraduationCap, docs: Files, chart: ChartBar, quality: ShieldCheck, settings: GearSix, search: MagnifyingGlass, bell: Bell, building: Buildings, chevron: CaretRight, caretDown: CaretDown, alert: Warning, check: Check, plus: Plus, pulse: Pulse, note: NotePencil, vitals: Heartbeat, plan: ClipboardText, med: Pill, wounds: FirstAidKit, nutrition: ForkKnife, assess: Stethoscope, shift: Heartbeat, ai: Sparkle, sidebar: SidebarSimple, filter: Funnel };
  const Component = icons[name];
  return <Component className={className} aria-hidden="true" weight="regular"/>;
}

const navigation: NavGroup[] = [
  { id: "clinical", label: "Pflege & Klinik", modules: [
    { id: "residents", label: "Bewohner", icon: "residents", href: "/bewohner", children: ["Übersicht", "Verlauf", "Pflegeakte"] },
    { id: "plan", label: "Pflegeplanung", icon: "plan", children: ["Pflegeplanung", "Ziele & Massnahmen", "Auswertung"] },
    { id: "chart", label: "Pflegedokumentation", icon: "note", children: ["Schnelldokumentation", "Verlaufsdokumentation"] },
    { id: "vitals", label: "Vitalwerte", icon: "vitals", children: ["Messwerte", "Entwicklung", "Grenzwerte"] },
    { id: "med", label: "Medikation", icon: "med", children: ["Medikamentenplan", "Medikamentenrunde", "Bestände"] },
    { id: "wounds", label: "Wundmanagement", icon: "wounds", children: ["Wundübersicht", "Dokumentation"] },
    { id: "nutrition", label: "Ernährung", icon: "nutrition", children: ["Ernährungsplan", "Trinkprotokoll"] },
    { id: "assess", label: "Einschätzungen", icon: "assess", children: ["Einschätzungen", "Fälligkeiten"] },
  ] },
  { id: "operations", label: "Betrieb", modules: [
    { id: "shift", label: "Schicht", icon: "shift", href: "/", children: ["Mein Dienst", "Schichtverlauf"] },
    { id: "tasks", label: "Aufgaben", icon: "tasks", children: ["Meine Aufgaben", "Teamaufgaben"], badge: 3 },
    { id: "handover", label: "Übergabe", icon: "handover", children: ["Meine Übergabe", "Seit letztem Dienst"] },
    { id: "schedule", label: "Dienstplanung", icon: "calendar", children: ["Mein Dienstplan", "Teamplanung"] },
  ] },
  { id: "workforce", label: "Personal", modules: [
    { id: "team", label: "Team", icon: "team", children: ["Neuigkeiten & Kanäle", "Nachrichten"] },
    { id: "learn", label: "Schulungen", icon: "learn", children: ["Meine Schulungen", "Pflichtnachweise"] },
    { id: "docs", label: "Dokumente", icon: "docs", children: ["Dokumente", "Standards & Weisungen"] },
  ] },
  { id: "management", label: "Leitung", modules: [
    { id: "quality", label: "Qualität", icon: "quality", children: ["Ereignisse", "Massnahmen"] },
    { id: "insights", label: "Kennzahlen & Analysen", icon: "chart", children: ["Pflege", "Leitung", "Personal"] },
    { id: "admin", label: "Administration", icon: "settings", children: ["Organisation", "Benutzer & Rollen", "Konfiguration"] },
  ] },
  { id: "intelligence", label: "Intelligenz", modules: [{ id: "ai", label: "CareCore KI", icon: "ai", children: ["Assistenz", "KI-Entwürfe"] }] },
];

const wounds: WoundCase[] = [
  { id: "w1", initials: "HM", resident: "Hans Müller", room: "Zimmer 207", location: "Linker Unterarm", diagnosis: "Hautläsion", size: "2,1 × 0,8 cm", status: "Kritisch", tone: "critical", lastCare: "Heute, 07:55", nextCare: "Morgen, 08:00", progress: 32, owner: "Lea Frei" },
  { id: "w2", initials: "MK", resident: "Maria Keller", room: "Zimmer 204", location: "Sakralbereich", diagnosis: "Dekubitus Grad 2", size: "3,4 × 2,6 cm", status: "In Behandlung", tone: "attention", lastCare: "Heute, 06:50", nextCare: "Heute, 14:00", progress: 54, owner: "Anna Meier" },
  { id: "w3", initials: "EM", resident: "Erika Meier", room: "Zimmer 211", location: "Rechter Unterschenkel", diagnosis: "Ulcus cruris venosum", size: "4,8 × 3,1 cm", status: "In Behandlung", tone: "attention", lastCare: "Gestern, 17:20", nextCare: "Heute, 10:30", progress: 61, owner: "Nora Baumann" },
  { id: "w4", initials: "RB", resident: "Ruth Baumann", room: "Zimmer 214", location: "Linke Ferse", diagnosis: "Druckstelle Grad 1", size: "1,2 × 1,0 cm", status: "Heilend", tone: "stable", lastCare: "Gestern, 15:40", nextCare: "Morgen, 09:15", progress: 82, owner: "Lea Frei" },
  { id: "w5", initials: "PA", resident: "Peter Aebischer", room: "Zimmer 115", location: "Rechter Handrücken", diagnosis: "Skin Tear Kategorie 1", size: "1,7 × 0,9 cm", status: "Heilend", tone: "stable", lastCare: "8. September", nextCare: "Heute, 11:15", progress: 74, owner: "Anna Meier" },
];

function Brand() {
  return <div className="brand" aria-label="CareCore"><span className="brand-mark"><Icon name="pulse"/></span><span className="brand-copy"><span className="brand-name">CareCore</span><small>Mehr Zeit für Pflege.</small></span></div>;
}

export default function WoundOverviewPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["clinical"]);
  const [openModules, setOpenModules] = useState<string[]>(["wounds"]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<WoundStatus>("Alle");
  const [selectedWoundId, setSelectedWoundId] = useState("w1");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const selectedWound = wounds.find((wound) => wound.id === selectedWoundId) ?? wounds[0];

  const openSearch = useCallback(() => setSearchOpen(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredWounds = useMemo(() => wounds.filter((wound) => {
    const searchable = `${wound.resident} ${wound.room} ${wound.location} ${wound.diagnosis}`.toLocaleLowerCase("de-CH");
    return (status === "Alle" || wound.status === status) && searchable.includes(query.trim().toLocaleLowerCase("de-CH"));
  }), [query, status]);

  function toggleGroup(id: string) {
    if (sidebarCollapsed) setSidebarCollapsed(false);
    setOpenGroups((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleModule(groupId: string, module: NavModule) {
    if (module.href) { router.push(module.href); return; }
    if (sidebarCollapsed) setSidebarCollapsed(false);
    if (!openGroups.includes(groupId)) setOpenGroups((current) => [...current, groupId]);
    setOpenModules((current) => current.includes(module.id) ? current.filter((item) => item !== module.id) : [...current, module.id]);
  }

  function selectSubmenu(moduleId: string, child: string) {
    if (moduleId === "wounds" && child === "Wundübersicht") return;
    if (moduleId === "wounds" && child === "Dokumentation") { router.push("/wundmanagement/dokumentation"); return; }
    if (moduleId === "residents" && child === "Verlauf") { router.push("/bewohner/verlauf"); return; }
    setToast(`${child} geöffnet`);
  }

  return <div className={`app-shell wounds-page ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
    <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-head"><Brand/><button className="sidebar-collapse" type="button" aria-label={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"} onClick={() => setSidebarCollapsed((value) => !value)}><Icon name="sidebar"/></button></div>
      <nav className="sidebar-scroll" aria-label="Hauptnavigation">
        <button className="nav-button nav-home" type="button" title="Startseite" onClick={() => router.push("/")}><Icon name="home"/><span className="nav-label">Startseite</span></button>
        <div className="nav-groups">{navigation.map((group) => {
          const groupOpen = openGroups.includes(group.id);
          return <section className={`nav-group ${groupOpen ? "open" : ""}`} key={group.id}>
            <button className="group-toggle" type="button" aria-expanded={groupOpen} title={group.label} onClick={() => toggleGroup(group.id)}><span>{group.label}</span><Icon name="caretDown"/></button>
            <div className="module-list">{group.modules.map((module) => {
              const moduleOpen = openModules.includes(module.id);
              const moduleActive = module.id === "wounds";
              return <div className={`module-block ${moduleOpen ? "open" : ""}`} key={module.id}>
                <button className={`nav-button module-button ${moduleActive ? "active" : ""}`} type="button" aria-expanded={moduleOpen} title={module.label} onClick={() => toggleModule(group.id, module)}><Icon name={module.icon}/><span className="nav-label">{module.label}</span>{module.badge && <span className="nav-badge">{module.badge}</span>}<Icon name="chevron" className="module-caret"/></button>
                <div className="submenu">{module.children.map((child) => <button className={`submenu-button ${module.id === "wounds" && child === "Wundübersicht" ? "active" : ""}`} type="button" key={child} onClick={() => selectSubmenu(module.id, child)}><span className="submenu-rail"/><span>{child}</span></button>)}</div>
              </div>;
            })}</div>
          </section>;
        })}</div>
      </nav>
      <div className="sidebar-footer"><button className="nav-button" type="button" title="Einstellungen" onClick={() => setToast("Einstellungen geöffnet")}><Icon name="settings"/><span className="nav-label">Einstellungen</span></button><button className="nav-button" type="button" title="Hilfe & Support" onClick={() => setToast("Hilfe & Support geöffnet")}><Icon name="docs"/><span className="nav-label">Hilfe & Support</span></button></div>
    </aside>

    <div className="main-column">
      <header className="topbar"><button className="location-control" type="button" onClick={() => setToast("Standortauswahl geöffnet")}><span className="location-icon"><Icon name="building"/></span><span><small>Alterszentrum Sonnengarten</small><strong>Wohnbereich 2 · 1. OG</strong></span><Icon name="chevron" className="chevron"/></button><div className="top-actions"><button className="search-trigger" type="button" onClick={openSearch} aria-label="Globale Suche öffnen" aria-haspopup="dialog" aria-expanded={searchOpen}><Icon name="search"/><span>Suchen…</span><kbd>⌘ K</kbd></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><Icon name="bell"/><span className="notification-dot"/></button><div className="profile"><span className="avatar">AM</span><span><small>Pflegefachfrau HF</small><strong>Anna Meier</strong></span></div></div></header>
      <header className="mobile-top"><Brand/><div className="mobile-actions"><button className="icon-button" type="button" aria-label="Suche öffnen" onClick={openSearch}><Icon name="search"/></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><Icon name="bell"/><span className="notification-dot"/></button></div></header>

      <main className="workspace wounds-workspace">
        <section className="page-heading wounds-heading" aria-labelledby="wounds-page-title"><div className="heading-copy"><p className="eyebrow">CareCore Wounds</p><h1 id="wounds-page-title">Wundübersicht</h1><p>Aktive Wunden, anstehende Versorgungen und Heilungsverläufe im Blick.</p></div><button className="primary-button" type="button" onClick={() => setToast("Neue Wunddokumentation vorbereitet")}><Icon name="plus" className="button-icon"/>Neue Wunde erfassen</button></section>

        <section className="wound-summary" aria-label="Wundstatus">
          <div><span className="summary-icon"><Icon name="wounds"/></span><span><strong>5</strong><small>aktive Wunden</small></span></div>
          <div><span className="summary-icon attention"><Icon name="calendar"/></span><span><strong>3</strong><small>Versorgungen heute</small></span></div>
          <div><span className="summary-icon critical"><Icon name="alert"/></span><span><strong>1</strong><small>kritischer Verlauf</small></span></div>
          <div><span className="summary-icon"><Icon name="chart"/></span><span><strong>68%</strong><small>mittlerer Heilungsfortschritt</small></span></div>
        </section>

        <section className="critical-alert wound-alert" aria-label="Dringende Wundversorgung"><span className="critical-symbol"><Icon name="alert"/></span><div><strong>Heute priorisieren · Maria Keller</strong><p>Dekubitus im Sakralbereich: Verbandkontrolle und Fotodokumentation bis 14:00 Uhr.</p></div><button className="secondary-button" type="button" onClick={() => setSelectedWoundId("w2")}>Fall auswählen <Icon name="chevron" className="button-icon"/></button></section>

        <div className="wound-overview-layout">
          <section className="card wound-directory" aria-labelledby="wound-directory-title">
            <div className="wound-toolbar"><div><h2 className="card-title" id="wound-directory-title">Aktive Wunden</h2><p className="card-subtitle">{filteredWounds.length} von {wounds.length} Wundfällen</p></div><label className="resident-search"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner oder Wunde suchen" aria-label="Wunden durchsuchen"/></label><div className="wound-status-filter" aria-label="Wundstatus filtern">{(["Alle", "Kritisch", "In Behandlung", "Heilend"] as WoundStatus[]).map((filter) => <button className={status === filter ? "active" : ""} type="button" key={filter} aria-pressed={status === filter} onClick={() => setStatus(filter)}>{filter}</button>)}</div><button className="secondary-button" type="button" onClick={() => setToast("Weitere Wundfilter geöffnet")}><Icon name="filter"/>Filter</button></div>
            <div className="wound-table-head" aria-hidden="true"><span>Bewohner &amp; Wunde</span><span>Letzte Versorgung</span><span>Heilung</span><span>Status</span><span/></div>
            <div className="wound-case-list">{filteredWounds.map((wound) => <button className={`wound-case-row ${selectedWound.id === wound.id ? "selected" : ""}`} type="button" key={wound.id} onClick={() => setSelectedWoundId(wound.id)}>
              <span className={`resident-avatar ${wound.tone === "critical" ? "critical" : ""}`}>{wound.initials}</span>
              <span className="wound-case-main"><strong>{wound.resident}</strong><small>{wound.room} · {wound.location}</small><span>{wound.diagnosis} · {wound.size}</span></span>
              <span className="wound-care-date"><strong>{wound.lastCare}</strong><small>{wound.owner}</small></span>
              <span className="wound-progress"><span><i style={{ width: `${wound.progress}%` } as CSSProperties}/></span><strong>{wound.progress}%</strong></span>
              <span className={`status-badge ${wound.tone}`}>{wound.status}</span>
              <Icon name="chevron" className="chevron"/>
            </button>)}{filteredWounds.length === 0 && <div className="resident-empty"><Icon name="search"/><strong>Keine Wundfälle gefunden</strong><p>Suchbegriff oder Statusfilter anpassen.</p></div>}</div>
          </section>

          <aside className="wound-sidebar">
            <section className="card wound-focus-card" aria-live="polite"><div className="card-header"><div><p className="eyebrow">Ausgewählter Fall</p><h2 className="card-title">{selectedWound.resident}</h2><p className="card-subtitle">{selectedWound.room}</p></div><span className={`status-badge ${selectedWound.tone}`}>{selectedWound.status}</span></div><div className="wound-focus-body"><span className={`wound-focus-icon ${selectedWound.tone}`}><Icon name="wounds"/></span><h3>{selectedWound.location}</h3><p>{selectedWound.diagnosis} · {selectedWound.size}</p><dl><div><dt>Letzte Versorgung</dt><dd>{selectedWound.lastCare}</dd></div><div><dt>Nächste Versorgung</dt><dd>{selectedWound.nextCare}</dd></div><div><dt>Verantwortlich</dt><dd>{selectedWound.owner}</dd></div></dl><div className="wound-focus-progress"><span><i style={{ width: `${selectedWound.progress}%` } as CSSProperties}/></span><small>{selectedWound.progress}% Heilungsfortschritt</small></div><div className="wound-focus-actions"><button className="primary-button" type="button" onClick={() => setToast(`Wundakte von ${selectedWound.resident} geöffnet`)}>Wundakte öffnen</button><button className="secondary-button" type="button" onClick={() => setToast("Neue Verlaufskontrolle vorbereitet")}>Verlauf erfassen</button></div></div></section>

            <section className="card wound-schedule-card"><div className="card-header"><div><h2 className="card-title">Heute zu versorgen</h2><p className="card-subtitle">3 geplante Maßnahmen</p></div></div><div className="wound-schedule-list"><button type="button" onClick={() => setSelectedWoundId("w2")}><time>14:00</time><span><strong>Maria Keller</strong><small>Verbandkontrolle · Sakralbereich</small></span><span className="status-badge critical">Priorität</span></button><button type="button" onClick={() => setSelectedWoundId("w3")}><time>10:30</time><span><strong>Erika Meier</strong><small>Kompressionsverband · Unterschenkel</small></span></button><button type="button" onClick={() => setSelectedWoundId("w5")}><time>11:15</time><span><strong>Peter Aebischer</strong><small>Wundkontrolle · Handrücken</small></span></button></div></section>
          </aside>
        </div>
      </main>
    </div>

    <nav className="bottom-nav" aria-label="Mobile Navigation"><button type="button" onClick={() => router.push("/")}><Icon name="home"/><span>Startseite</span></button><button type="button" onClick={() => router.push("/bewohner")}><Icon name="residents"/><span>Bewohner</span></button><button type="button" onClick={() => setToast("Aufgaben geöffnet")}><Icon name="tasks"/><span>Aufgaben</span></button><button type="button" onClick={() => setToast("Team geöffnet")}><Icon name="team"/><span>Team</span></button><button className="active" type="button" onClick={() => setToast("Wundmanagement geöffnet")}><Icon name="wounds"/><span>Wunden</span></button></nav>

    {searchOpen && <div className="overlay" role="presentation" onClick={(event) => event.currentTarget === event.target && setSearchOpen(false)}><section className="search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche"><div className="search-input-wrap"><Icon name="search"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner oder Wundfall suchen…" aria-label="Suchbegriff"/><button type="button" onClick={() => setSearchOpen(false)} aria-label="Suche schliessen">ESC</button></div><div className="search-results"><span className="search-group-label">Wundfälle</span>{filteredWounds.map((wound) => <button className="search-result" type="button" key={wound.id} onClick={() => { setSelectedWoundId(wound.id); setSearchOpen(false); }}><span className="result-icon"><Icon name="wounds"/></span><span><strong>{wound.resident} · {wound.location}</strong><small>{wound.room} · {wound.diagnosis}</small></span></button>)}</div></section></div>}
    {toast && <div className="toast" role="status"><Icon name="check"/>{toast}</div>}
  </div>;
}

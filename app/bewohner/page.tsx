"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResidentRecord, type ResidentRecordData } from "./components/resident-record";
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
  X,
} from "@phosphor-icons/react";

type IconName = "home" | "residents" | "tasks" | "handover" | "calendar" | "team" | "learn" | "docs" | "chart" | "quality" | "settings" | "search" | "bell" | "building" | "chevron" | "caretDown" | "alert" | "check" | "plus" | "pulse" | "close" | "note" | "vitals" | "plan" | "med" | "wounds" | "nutrition" | "assess" | "shift" | "ai" | "sidebar" | "filter";

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
    plan: ClipboardText,
    med: Pill,
    wounds: FirstAidKit,
    nutrition: ForkKnife,
    assess: Stethoscope,
    shift: Heartbeat,
    ai: Sparkle,
    sidebar: SidebarSimple,
    filter: Funnel,
  };
  const Component = icons[name];
  return <Component className={className} aria-hidden="true" weight="regular"/>;
}

type NavModule = { id: string; label: string; icon: IconName; children: string[]; badge?: number; href?: string };
type NavGroup = { id: string; label: string; modules: NavModule[] };

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
  { id: "intelligence", label: "Intelligenz", modules: [
    { id: "ai", label: "CareCore KI", icon: "ai", children: ["Assistenz", "KI-Entwürfe"] },
  ] },
];

const residents: ResidentRecordData[] = [
  { initials: "HM", name: "Hans Müller", room: "Zimmer 207", unit: "Wohnbereich 2", careLevel: "Pflegestufe 4", note: "Sturzrisiko · neurologische Kontrollen", lastUpdate: "Heute, 08:00", status: "critical", statusLabel: "Kritisch" },
  { initials: "MK", name: "Maria Keller", room: "Zimmer 204", unit: "Wohnbereich 2", careLevel: "Pflegestufe 3", note: "Schmerzbeobachtung · Diabetes", lastUpdate: "Heute, 07:30", status: "attention", statusLabel: "Beobachten" },
  { initials: "EM", name: "Erika Meier", room: "Zimmer 211", unit: "Wohnbereich 2", careLevel: "Pflegestufe 3", note: "Medikationsplan heute angepasst", lastUpdate: "Heute, 06:55", status: "info", statusLabel: "Aktualisiert" },
  { initials: "RB", name: "Ruth Baumann", room: "Zimmer 214", unit: "Wohnbereich 2", careLevel: "Pflegestufe 2", note: "Mobilisation nach Plan", lastUpdate: "Gestern, 19:40", status: "stable", statusLabel: "Stabil" },
  { initials: "PA", name: "Peter Aebischer", room: "Zimmer 115", unit: "Wohnbereich 1", careLevel: "Pflegestufe 2", note: "Trinkmenge weiter beobachten", lastUpdate: "Heute, 07:10", status: "attention", statusLabel: "Beobachten" },
  { initials: "AS", name: "Anna Schmid", room: "Zimmer 118", unit: "Wohnbereich 1", careLevel: "Pflegestufe 1", note: "Keine aktuellen Hinweise", lastUpdate: "Gestern, 20:15", status: "stable", statusLabel: "Stabil" },
];

function Brand() {
  return <div className="brand" aria-label="CareCore"><span className="brand-mark"><Icon name="pulse"/></span><span className="brand-copy"><span className="brand-name">CareCore</span><small>Mehr Zeit für Pflege.</small></span></div>;
}

export default function ResidentsPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["clinical"]);
  const [openModules, setOpenModules] = useState<string[]>(["residents"]);
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("Alle");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidentRecordData | null>(null);
  const [toast, setToast] = useState("");

  const openSearch = useCallback(() => {
    setSelectedResident(null);
    setSearchOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); }
      if (event.key === "Escape") { setSearchOpen(false); setSelectedResident(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredResidents = useMemo(() => residents.filter((resident) => {
    const matchesQuery = `${resident.name} ${resident.room} ${resident.note}`.toLowerCase().includes(query.toLowerCase());
    const matchesUnit = unit === "Alle" || resident.unit === unit;
    return matchesQuery && matchesUnit;
  }), [query, unit]);

  function toggleGroup(id: string) {
    if (sidebarCollapsed) setSidebarCollapsed(false);
    setOpenGroups((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleModule(groupId: string, module: NavModule) {
    if (module.href) {
      router.push(module.href);
      return;
    }
    if (sidebarCollapsed) setSidebarCollapsed(false);
    if (!openGroups.includes(groupId)) setOpenGroups((current) => [...current, groupId]);
    setOpenModules((current) => current.includes(module.id) ? current.filter((item) => item !== module.id) : [...current, module.id]);
  }

  return <div className={`app-shell residents-page ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
    <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-head"><Brand/><button className="sidebar-collapse" type="button" aria-label={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"} onClick={() => setSidebarCollapsed((value) => !value)}><Icon name="sidebar"/></button></div>
      <nav className="sidebar-scroll" aria-label="Hauptnavigation">
        <button className="nav-button nav-home" type="button" title="Startseite" onClick={() => router.push("/")}><Icon name="home"/><span className="nav-label">Startseite</span></button>
        <div className="nav-groups">
          {navigation.map((group) => {
            const groupOpen = openGroups.includes(group.id);
            return <section className={`nav-group ${groupOpen ? "open" : ""}`} key={group.id}>
              <button className="group-toggle" type="button" aria-expanded={groupOpen} title={group.label} onClick={() => toggleGroup(group.id)}><span>{group.label}</span><Icon name="caretDown"/></button>
              <div className="module-list">
                {group.modules.map((module) => {
                  const moduleOpen = openModules.includes(module.id);
                  const moduleActive = module.id === "residents";
                  return <div className={`module-block ${moduleOpen ? "open" : ""}`} key={module.id}>
                    <button className={`nav-button module-button ${moduleActive ? "active" : ""}`} type="button" aria-expanded={moduleOpen} title={module.label} onClick={() => toggleModule(group.id, module)}><Icon name={module.icon}/><span className="nav-label">{module.label}</span>{module.badge && <span className="nav-badge">{module.badge}</span>}<Icon name="chevron" className="module-caret"/></button>
                    <div className="submenu">{module.children.map((child) => <button className={`submenu-button ${module.id === "residents" && child === "Übersicht" ? "active" : ""}`} type="button" key={child} onClick={() => setToast(`${child} geöffnet`)}><span className="submenu-rail"/><span>{child}</span></button>)}</div>
                  </div>;
                })}
              </div>
            </section>;
          })}
        </div>
      </nav>
      <div className="sidebar-footer"><button className="nav-button" type="button" title="Einstellungen" onClick={() => setToast("Einstellungen geöffnet")}><Icon name="settings"/><span className="nav-label">Einstellungen</span></button><button className="nav-button" type="button" title="Hilfe & Support" onClick={() => setToast("Hilfe & Support geöffnet")}><Icon name="docs"/><span className="nav-label">Hilfe & Support</span></button></div>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <button className="location-control" type="button" onClick={() => setToast("Standortauswahl geöffnet")}><span className="location-icon"><Icon name="building"/></span><span><small>Alterszentrum Sonnengarten</small><strong>Wohnbereich 2 · 1. OG</strong></span><Icon name="chevron" className="chevron"/></button>
        <div className="top-actions"><button className="search-trigger" type="button" onClick={openSearch} aria-label="Globale Suche öffnen" aria-haspopup="dialog" aria-controls="resident-global-search" aria-expanded={searchOpen}><Icon name="search"/><span>Suchen…</span><kbd>⌘ K</kbd></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><Icon name="bell"/><span className="notification-dot"/></button><div className="profile"><span className="avatar">AM</span><span><small>Pflegefachfrau HF</small><strong>Anna Meier</strong></span></div></div>
      </header>
      <header className="mobile-top"><Brand/><div className="mobile-actions"><button className="icon-button" type="button" aria-label="Suche öffnen" onClick={openSearch}><Icon name="search"/></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><Icon name="bell"/><span className="notification-dot"/></button></div></header>

      <main className="workspace residents-workspace">
        <section className="page-heading residents-heading" aria-labelledby="residents-page-title"><div className="heading-copy"><p className="eyebrow">CareCore Bewohner</p><h1 id="residents-page-title">Bewohner</h1><p>Zentrale Bewohner- und Patientenakte für den gesamten Wohnbereich.</p></div><button className="primary-button" type="button" onClick={() => setToast("Neue Bewohneraufnahme vorbereitet")}><Icon name="plus" className="button-icon"/>Bewohner aufnehmen</button></section>

        <section className="resident-summary" aria-label="Bewohnerübersicht">
          <div><span className="summary-icon"><Icon name="residents"/></span><span><strong>48</strong><small>Bewohner gesamt</small></span></div>
          <div><span className="summary-icon attention"><Icon name="alert"/></span><span><strong>7</strong><small>mit aktuellen Hinweisen</small></span></div>
          <div><span className="summary-icon info"><Icon name="note"/></span><span><strong>3</strong><small>Aufnahmen diese Woche</small></span></div>
          <div><span className="summary-icon"><Icon name="check"/></span><span><strong>96%</strong><small>Akten vollständig</small></span></div>
        </section>

        <section className="card resident-directory" aria-labelledby="directory-title">
          <div className="directory-toolbar">
            <div><h2 className="card-title" id="directory-title">Bewohnerverzeichnis</h2><p className="card-subtitle">{filteredResidents.length} Einträge in dieser Demo</p></div>
            <label className="resident-search"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name oder Zimmer suchen" aria-label="Bewohner suchen"/></label>
            <div className="unit-filter" aria-label="Wohnbereich filtern">{["Alle", "Wohnbereich 1", "Wohnbereich 2"].map((label) => <button className={unit === label ? "active" : ""} type="button" key={label} onClick={() => setUnit(label)}>{label}</button>)}</div>
            <button className="secondary-button directory-filter" type="button" onClick={() => setToast("Weitere Filter geöffnet")}><Icon name="filter"/>Filter</button>
          </div>

          <div className="resident-table" role="table" aria-label="Bewohnerliste">
            <div className="resident-table-head" role="row"><span role="columnheader">Bewohner</span><span role="columnheader">Wohnbereich</span><span role="columnheader">Pflegebedarf</span><span role="columnheader">Letzte Aktualisierung</span><span role="columnheader">Status</span><span aria-hidden="true"/></div>
            {filteredResidents.map((resident) => <button className="resident-list-row" type="button" role="row" key={resident.name} onClick={() => setSelectedResident(resident)}>
              <span className="resident-person" role="cell"><span className={`resident-avatar ${resident.status === "critical" ? "critical" : ""}`}>{resident.initials}</span><span><strong>{resident.name}</strong><small>{resident.room}</small></span></span>
              <span role="cell">{resident.unit}</span>
              <span role="cell"><strong>{resident.careLevel}</strong><small>{resident.note}</small></span>
              <span role="cell">{resident.lastUpdate}</span>
              <span role="cell"><span className={`status-badge ${resident.status}`}>{resident.statusLabel}</span></span>
              <span role="cell"><Icon name="chevron"/></span>
            </button>)}
            {filteredResidents.length === 0 && <div className="resident-empty"><Icon name="search"/><strong>Keine Bewohner gefunden</strong><p>Prüfe den Suchbegriff oder ändere den Wohnbereich.</p></div>}
          </div>
        </section>
      </main>
    </div>

    <nav className="bottom-nav" aria-label="Mobile Navigation"><button type="button" onClick={() => router.push("/")}><Icon name="home"/><span>Startseite</span></button><button className="active" type="button"><Icon name="residents"/><span>Bewohner</span></button><button type="button" onClick={() => setToast("Aufgaben geöffnet")}><Icon name="tasks"/><span>Aufgaben</span></button><button type="button" onClick={() => setToast("Team geöffnet")}><Icon name="team"/><span>Team</span></button><button type="button" onClick={() => setToast("Mehr geöffnet")}><Icon name="settings"/><span>Mehr</span></button></nav>

    {searchOpen && <div className="overlay" role="presentation" onClick={(event) => event.currentTarget === event.target && setSearchOpen(false)}><section id="resident-global-search" className="search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche"><div className="search-input-wrap"><Icon name="search"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner, Dokumente oder Funktionen suchen…" aria-label="Suchbegriff"/><button type="button" onClick={() => setSearchOpen(false)} aria-label="Suche schliessen">ESC</button></div><div className="search-results"><span className="search-group-label">Bewohner</span>{filteredResidents.map((resident) => <button className="search-result" type="button" key={resident.name} onClick={() => { setSearchOpen(false); setSelectedResident(resident); }}><span className="result-icon"><Icon name="residents"/></span><span><strong>{resident.name}</strong><small>{resident.room} · {resident.unit}</small></span></button>)}</div></section></div>}

    {selectedResident && <ResidentRecord resident={selectedResident} onClose={() => setSelectedResident(null)} onAction={setToast}/>}

    {toast && <div className="toast" role="status"><Icon name="check"/>{toast}</div>}
  </div>;
}

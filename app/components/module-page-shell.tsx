"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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

export type ModuleIconName = "home" | "residents" | "tasks" | "handover" | "calendar" | "team" | "learn" | "docs" | "chart" | "quality" | "settings" | "search" | "bell" | "building" | "chevron" | "caretDown" | "alert" | "check" | "plus" | "pulse" | "note" | "vitals" | "plan" | "med" | "wounds" | "nutrition" | "assess" | "shift" | "ai" | "sidebar" | "filter";

type NavModule = { id: string; label: string; icon: ModuleIconName; children: string[]; badge?: number; href?: string };
type NavGroup = { id: string; label: string; modules: NavModule[] };

export function ModuleIcon({ name, className = "" }: { name: ModuleIconName; className?: string }) {
  const icons = { home: House, residents: UsersThree, tasks: ListChecks, handover: ArrowsLeftRight, calendar: CalendarDots, team: ChatsCircle, learn: GraduationCap, docs: Files, chart: ChartBar, quality: ShieldCheck, settings: GearSix, search: MagnifyingGlass, bell: Bell, building: Buildings, chevron: CaretRight, caretDown: CaretDown, alert: Warning, check: Check, plus: Plus, pulse: Pulse, note: NotePencil, vitals: Heartbeat, plan: ClipboardText, med: Pill, wounds: FirstAidKit, nutrition: ForkKnife, assess: Stethoscope, shift: Heartbeat, ai: Sparkle, sidebar: SidebarSimple, filter: Funnel };
  const Component = icons[name];
  return <Component className={className} aria-hidden="true" weight="regular"/>;
}

const navigation: NavGroup[] = [
  { id: "clinical", label: "Pflege & Klinik", modules: [
    { id: "residents", label: "Bewohner", icon: "residents", href: "/bewohner", children: ["Übersicht", "Verlauf", "Pflegeakte"] },
    { id: "plan", label: "Pflegeplanung", icon: "plan", children: ["Pflegeplanung", "Ziele & Massnahmen", "Auswertung"] },
    { id: "chart", label: "Pflegedokumentation", icon: "note", children: ["Schnelldokumentation", "Verlaufsdokumentation"] },
    { id: "vitals", label: "Vitalwerte", icon: "vitals", children: ["Übersicht", "Entwicklung", "Grenzwerte"] },
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

const globalResults = [
  { title: "Hans Müller", meta: "Bewohner · Zimmer 207", icon: "residents" as ModuleIconName, href: "/bewohner" },
  { title: "Bewohnerverlauf", meta: "Alle Ereignisse im Wohnbereich", icon: "note" as ModuleIconName, href: "/bewohner/verlauf" },
  { title: "Pflegeakten", meta: "Pflegeprofile, Ziele und Maßnahmen", icon: "plan" as ModuleIconName, href: "/bewohner/pflegeakte" },
  { title: "Vitalwerte", meta: "Hausweite Übersicht aller Messungen", icon: "vitals" as ModuleIconName, href: "/vitalwerte" },
  { title: "Wundübersicht", meta: "5 aktive Wundfälle", icon: "wounds" as ModuleIconName, href: "/wundmanagement" },
  { title: "Wunddokumentation", meta: "Versorgung und Fotodokumentation", icon: "docs" as ModuleIconName, href: "/wundmanagement/dokumentation" },
];

function routeFor(moduleId: string, child: string) {
  if (moduleId === "residents" && child === "Übersicht") return "/bewohner";
  if (moduleId === "residents" && child === "Verlauf") return "/bewohner/verlauf";
  if (moduleId === "residents" && child === "Pflegeakte") return "/bewohner/pflegeakte";
  if (moduleId === "vitals" && child === "Übersicht") return "/vitalwerte";
  if (moduleId === "wounds" && child === "Wundübersicht") return "/wundmanagement";
  if (moduleId === "wounds" && child === "Dokumentation") return "/wundmanagement/dokumentation";
  return null;
}

function Brand() {
  return <div className="brand" aria-label="CareCore"><span className="brand-mark"><ModuleIcon name="pulse"/></span><span className="brand-copy"><span className="brand-name">CareCore</span><small>Mehr Zeit für Pflege.</small></span></div>;
}

export default function ModulePageShell({ activeModule, activeChild, pageClass, locationPrimary = "Alterszentrum Sonnengarten", locationSecondary = "Wohnbereich 2 · 1. OG", children }: { activeModule: string; activeChild: string; pageClass: string; locationPrimary?: string; locationSecondary?: string; children: (showToast: (message: string) => void) => ReactNode }) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["clinical"]);
  const [openModules, setOpenModules] = useState<string[]>([activeModule]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const filteredResults = useMemo(() => globalResults.filter((item) => `${item.title} ${item.meta}`.toLocaleLowerCase("de-CH").includes(searchQuery.trim().toLocaleLowerCase("de-CH"))), [searchQuery]);

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
    const route = routeFor(moduleId, child);
    if (route) { router.push(route); return; }
    setToast(`${child} ist in dieser Demo noch nicht freigeschaltet`);
  }

  const mobileWoundsActive = activeModule === "wounds";
  const mobileResidentsActive = activeModule === "residents";

  return <div className={`app-shell ${pageClass} ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
    <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-head"><Brand/><button className="sidebar-collapse" type="button" aria-label={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"} onClick={() => setSidebarCollapsed((value) => !value)}><ModuleIcon name="sidebar"/></button></div>
      <nav className="sidebar-scroll" aria-label="Hauptnavigation">
        <button className="nav-button nav-home" type="button" title="Startseite" onClick={() => router.push("/")}><ModuleIcon name="home"/><span className="nav-label">Startseite</span></button>
        <div className="nav-groups">{navigation.map((group) => {
          const groupOpen = openGroups.includes(group.id);
          return <section className={`nav-group ${groupOpen ? "open" : ""}`} key={group.id}>
            <button className="group-toggle" type="button" aria-expanded={groupOpen} title={group.label} onClick={() => toggleGroup(group.id)}><span>{group.label}</span><ModuleIcon name="caretDown"/></button>
            <div className="module-list">{group.modules.map((module) => {
              const moduleOpen = openModules.includes(module.id);
              const moduleActive = module.id === activeModule;
              return <div className={`module-block ${moduleOpen ? "open" : ""}`} key={module.id}>
                <button className={`nav-button module-button ${moduleActive ? "active" : ""}`} type="button" aria-expanded={moduleOpen} title={module.label} onClick={() => toggleModule(group.id, module)}><ModuleIcon name={module.icon}/><span className="nav-label">{module.label}</span>{module.badge && <span className="nav-badge">{module.badge}</span>}<ModuleIcon name="chevron" className="module-caret"/></button>
                <div className="submenu">{module.children.map((child) => <button className={`submenu-button ${module.id === activeModule && child === activeChild ? "active" : ""}`} type="button" key={child} onClick={() => selectSubmenu(module.id, child)}><span className="submenu-rail"/><span>{child}</span></button>)}</div>
              </div>;
            })}</div>
          </section>;
        })}</div>
      </nav>
      <div className="sidebar-footer"><button className="nav-button" type="button" title="Einstellungen" onClick={() => setToast("Einstellungen geöffnet")}><ModuleIcon name="settings"/><span className="nav-label">Einstellungen</span></button><button className="nav-button" type="button" title="Hilfe & Support" onClick={() => setToast("Hilfe & Support geöffnet")}><ModuleIcon name="docs"/><span className="nav-label">Hilfe & Support</span></button></div>
    </aside>

    <div className="main-column">
      <header className="topbar"><button className="location-control" type="button" onClick={() => setToast("Standortauswahl geöffnet")}><span className="location-icon"><ModuleIcon name="building"/></span><span><small>{locationPrimary}</small><strong>{locationSecondary}</strong></span><ModuleIcon name="chevron" className="chevron"/></button><div className="top-actions"><button className="search-trigger" type="button" onClick={openSearch} aria-label="Globale Suche öffnen" aria-haspopup="dialog" aria-expanded={searchOpen}><ModuleIcon name="search"/><span>Suchen…</span><kbd>⌘ K</kbd></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><ModuleIcon name="bell"/><span className="notification-dot"/></button><div className="profile"><span className="avatar">AM</span><span><small>Pflegefachfrau HF</small><strong>Anna Meier</strong></span></div></div></header>
      <header className="mobile-top"><Brand/><div className="mobile-actions"><button className="icon-button" type="button" aria-label="Suche öffnen" onClick={openSearch}><ModuleIcon name="search"/></button><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("3 neue Benachrichtigungen")}><ModuleIcon name="bell"/><span className="notification-dot"/></button></div></header>
      {children(setToast)}
    </div>

    <nav className="bottom-nav" aria-label="Mobile Navigation"><button type="button" onClick={() => router.push("/")}><ModuleIcon name="home"/><span>Startseite</span></button><button className={mobileResidentsActive ? "active" : ""} type="button" onClick={() => router.push("/bewohner")}><ModuleIcon name="residents"/><span>Bewohner</span></button><button type="button" onClick={() => setToast("Aufgaben geöffnet")}><ModuleIcon name="tasks"/><span>Aufgaben</span></button><button type="button" onClick={() => setToast("Team geöffnet")}><ModuleIcon name="team"/><span>Team</span></button><button className={mobileWoundsActive ? "active" : ""} type="button" onClick={() => router.push("/wundmanagement")}><ModuleIcon name="wounds"/><span>Wunden</span></button></nav>

    {searchOpen && <div className="overlay" role="presentation" onClick={(event) => event.currentTarget === event.target && setSearchOpen(false)}><section className="search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche"><div className="search-input-wrap"><ModuleIcon name="search"/><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Bewohner, Dokumente oder Funktionen suchen…" aria-label="Suchbegriff"/><button type="button" onClick={() => setSearchOpen(false)} aria-label="Suche schliessen">ESC</button></div><div className="search-results"><span className="search-group-label">{searchQuery ? "Suchergebnisse" : "Schnellzugriff"}</span>{filteredResults.map((result) => <button className="search-result" type="button" key={result.title} onClick={() => { setSearchOpen(false); router.push(result.href); }}><span className="result-icon"><ModuleIcon name={result.icon}/></span><span><strong>{result.title}</strong><small>{result.meta}</small></span></button>)}</div></section></div>}
    {toast && <div className="toast" role="status"><ModuleIcon name="check"/>{toast}</div>}
  </div>;
}

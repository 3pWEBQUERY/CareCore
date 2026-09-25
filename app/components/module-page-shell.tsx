"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "./app-header";
import AppSidebar from "./app-sidebar";
import { navigationForRole, routeFor, type ModuleIconName } from "./navigation";
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
  SignOut,
  Sparkle,
  Stethoscope,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";

export type { ModuleIconName } from "./navigation";

export function ModuleIcon({ name, className = "" }: { name: ModuleIconName; className?: string }) {
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
    note: NotePencil,
    vitals: Heartbeat,
    plan: ClipboardText,
    med: Pill,
    wounds: FirstAidKit,
    nutrition: ForkKnife,
    assess: Stethoscope,
    shift: Heartbeat,
    ai: Sparkle,
    sparkle: Sparkle,
    sidebar: SidebarSimple,
    filter: Funnel,
    logout: SignOut,
    close: X,
  };
  const Component = icons[name];
  return <Component className={className} aria-hidden="true" weight="regular" />;
}

const globalResults = [
  {
    title: "Benachrichtigungen",
    meta: "Aktuelle Hinweise und Aufgaben",
    icon: "bell" as ModuleIconName,
    href: "/benachrichtigungen",
  },
  { title: "Hans Müller", meta: "Bewohner · Zimmer 207", icon: "residents" as ModuleIconName, href: "/bewohner" },
  {
    title: "Bewohnerverlauf",
    meta: "Alle Ereignisse im Wohnbereich",
    icon: "note" as ModuleIconName,
    href: "/bewohner/verlauf",
  },
  {
    title: "Pflegeakten",
    meta: "Pflegeprofile, Ziele und Maßnahmen",
    icon: "plan" as ModuleIconName,
    href: "/bewohner/pflegeakte",
  },
  {
    title: "Vitalwerte",
    meta: "Hausweite Übersicht aller Messungen",
    icon: "vitals" as ModuleIconName,
    href: "/vitalwerte",
  },
  {
    title: "Pflegeplanung",
    meta: "Ziele, Ressourcen und Interventionen",
    icon: "plan" as ModuleIconName,
    href: "/pflegeplanung",
  },
  {
    title: "Ziele & Massnahmen",
    meta: "Aktive Pflegeziele im Team",
    icon: "tasks" as ModuleIconName,
    href: "/pflegeplanung/ziele-massnahmen",
  },
  {
    title: "Schnelldokumentation",
    meta: "Kurze Beobachtungen dokumentieren",
    icon: "note" as ModuleIconName,
    href: "/pflegedokumentation",
  },
  {
    title: "Verlaufsdokumentation",
    meta: "Chronologische Pflegeverläufe",
    icon: "note" as ModuleIconName,
    href: "/pflegedokumentation/verlauf",
  },
  {
    title: "Vitalwerte Entwicklung",
    meta: "Trends und Verläufe vergleichen",
    icon: "chart" as ModuleIconName,
    href: "/vitalwerte/entwicklung",
  },
  {
    title: "Vitalwerte Grenzwerte",
    meta: "Persönliche Zielbereiche verwalten",
    icon: "vitals" as ModuleIconName,
    href: "/vitalwerte/grenzwerte",
  },
  {
    title: "Ernährungsplan",
    meta: "Kostformen und Trinkziele",
    icon: "nutrition" as ModuleIconName,
    href: "/ernaehrung",
  },
  {
    title: "Trinkprotokoll",
    meta: "Flüssigkeitsaufnahme dokumentieren",
    icon: "nutrition" as ModuleIconName,
    href: "/ernaehrung/trinkprotokoll",
  },
  {
    title: "Medikamentenplan",
    meta: "Verordnungen und Einnahmezeiten",
    icon: "med" as ModuleIconName,
    href: "/medikation",
  },
  {
    title: "Medikamentenrunde",
    meta: "Geplante Gaben dokumentieren",
    icon: "tasks" as ModuleIconName,
    href: "/medikation/runde",
  },
  {
    title: "Medikamentenbestände",
    meta: "Lager, Mindestbestand und Verfall",
    icon: "docs" as ModuleIconName,
    href: "/medikation/bestaende",
  },
  {
    title: "Bedarfsmedikation",
    meta: "Ärztlich verordnete Reserven führen",
    icon: "plus" as ModuleIconName,
    href: "/medikation/reserven",
  },
  { title: "Wundübersicht", meta: "5 aktive Wundfälle", icon: "wounds" as ModuleIconName, href: "/wundmanagement" },
  {
    title: "Wunddokumentation",
    meta: "Versorgung und Fotodokumentation",
    icon: "docs" as ModuleIconName,
    href: "/wundmanagement/dokumentation",
  },
];

export default function ModulePageShell({
  activeModule,
  activeChild,
  pageClass,
  locationPrimary = "Alterszentrum Sonnengarten",
  locationSecondary = "Wohnbereich 2 · 1. OG",
  children,
}: {
  activeModule?: string;
  activeChild?: string;
  pageClass: string;
  locationPrimary?: string;
  locationSecondary?: string;
  children: (showToast: (message: string) => void) => ReactNode;
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const visibleNavigation = useMemo(() => navigationForRole(role), [role]);
  const [mobileGroupId, setMobileGroupId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/work-context")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setRole(data?.profile?.role ?? null))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setMobileGroupId(
          visibleNavigation.find((group) => group.modules.some((module) => module.id === activeModule))?.id ?? null,
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [activeModule, visibleNavigation]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const filteredResults = useMemo(
    () =>
      globalResults.filter((item) =>
        `${item.title} ${item.meta}`.toLocaleLowerCase("de-CH").includes(searchQuery.trim().toLocaleLowerCase("de-CH")),
      ),
    [searchQuery],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const mobileGroup = visibleNavigation.find((group) => group.id === mobileGroupId);
  const mobileNeedsMenu = mobileGroup ? mobileGroup.modules.length > 4 : true;
  const mobileVisibleModules = mobileGroup
    ? mobileGroup.modules.length <= 4
      ? mobileGroup.modules
      : [
          ...mobileGroup.modules.filter((module) => module.id === activeModule),
          ...mobileGroup.modules.filter((module) => module.id !== activeModule),
        ].slice(0, 3)
    : [];

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

  return (
    <div className={`app-shell ${pageClass}`}>
      <AppSidebar activeModule={activeModule} activeChild={activeChild} onToast={setToast} />

      <div className="main-column">
        <AppHeader
          locationPrimary={locationPrimary}
          locationSecondary={locationSecondary}
          searchOpen={searchOpen}
          onSearch={openSearch}
          onToast={setToast}
        />
        {children(setToast)}
      </div>

      {mobileMenuOpen && (
        <div className="mobile-nav-menu" role="dialog" aria-label="Hauptmenü">
          <div className="mobile-nav-menu-head">
            <div>
              {mobileGroup && (
                <button className="mobile-nav-back" type="button" onClick={() => setMobileGroupId(null)}>
                  <ModuleIcon name="chevron" /> Alle Hauptbereiche
                </button>
              )}
              <p className="eyebrow">CareCore Navigation</p>
              <strong>{mobileGroup?.label ?? "Hauptbereiche"}</strong>
            </div>
            <button type="button" aria-label="Hauptmenü schliessen" onClick={() => setMobileMenuOpen(false)}>
              <ModuleIcon name="close" />
            </button>
          </div>
          {mobileGroup ? (
            <div className="mobile-nav-subgroups">
              {mobileGroup.modules.map((module) => (
                <section key={module.id}>
                  <h3>
                    <ModuleIcon name={module.icon} />
                    {module.label}
                  </h3>
                  <div>
                    {module.children.map((child) => (
                      <button type="button" key={child} onClick={() => chooseMobileChild(module.id, child)}>
                        {child}
                        <ModuleIcon name="chevron" />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mobile-nav-groups">
              {visibleNavigation.map((group) => (
                <button
                  className={group.id === mobileGroupId ? "active" : ""}
                  type="button"
                  key={group.id}
                  onClick={() => chooseMobileGroup(group.id)}
                >
                  <span className="mobile-nav-group-icon">
                    <ModuleIcon name={group.modules[0]?.icon ?? "pulse"} />
                  </span>
                  <span>
                    <strong>{group.label}</strong>
                    <small>{group.modules.length} Bereiche</small>
                  </span>
                  <ModuleIcon name="chevron" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <nav className="bottom-nav" aria-label="Mobile Navigation">
        <button
          className={activeModule === "home" ? "active" : ""}
          type="button"
          onClick={() => {
            setMobileGroupId(null);
            setMobileMenuOpen(false);
            router.push("/c");
          }}
        >
          <ModuleIcon name="home" />
          <span>Startseite</span>
        </button>
        {!mobileGroup ? (
          <button
            className={mobileMenuOpen ? "active" : ""}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            <ModuleIcon name="sidebar" />
            <span>Menü</span>
          </button>
        ) : (
          <>
            {mobileVisibleModules.map((module) => {
              const href = routeFor(module.id, module.children[0]);
              return (
                <button
                  className={activeModule === module.id ? "active" : ""}
                  type="button"
                  key={module.id}
                  onClick={() => href && router.push(href)}
                >
                  <ModuleIcon name={module.icon} />
                  <span>{module.label}</span>
                </button>
              );
            })}
            {mobileNeedsMenu && (
              <button
                className={mobileMenuOpen ? "active" : ""}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((value) => !value)}
              >
                <ModuleIcon name="sidebar" />
                <span>Mehr</span>
              </button>
            )}
          </>
        )}
      </nav>

      {searchOpen && (
        <div
          className="overlay"
          role="presentation"
          onClick={(event) => event.currentTarget === event.target && setSearchOpen(false)}
        >
          <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche">
            <div className="search-input-wrap">
              <ModuleIcon name="search" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Bewohner, Dokumente oder Funktionen suchen…"
                aria-label="Suchbegriff"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Suche schliessen">
                ESC
              </button>
            </div>
            <div className="search-results">
              <span className="search-group-label">{searchQuery ? "Suchergebnisse" : "Schnellzugriff"}</span>
              {filteredResults.map((result) => (
                <button
                  className="search-result"
                  type="button"
                  key={result.title}
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(`/c${result.href}`);
                  }}
                >
                  <span className="result-icon">
                    <ModuleIcon name={result.icon} />
                  </span>
                  <span>
                    <strong>{result.title}</strong>
                    <small>{result.meta}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <ModuleIcon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}

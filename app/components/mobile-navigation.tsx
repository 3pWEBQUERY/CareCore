"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ModuleIcon } from "./module-icon";
import { openHelp } from "./help-panel";
import {
  openResidentPicker,
  useCareResident,
  useNavigationBadges,
  useWorkContext,
  type NavigationBadges,
} from "./care-context";
import { moduleBadges, quickLinks, routeFor, sidebarNavigation, type ModuleIconName } from "./navigation";

type BarItem = { id: string; label: string; icon: ModuleIconName; moduleId: string; child: string };

// Always the same buttons in the same place, so staff find them blind during a shift.
const BAR: BarItem[] = [
  { id: "residents", label: "Bewohner", icon: "residents", moduleId: "residents", child: "Übersicht" },
  { id: "chart", label: "Doku", icon: "note", moduleId: "chart", child: "Schnelldokumentation" },
  { id: "med", label: "Medikation", icon: "med", moduleId: "med", child: "Medikamentenrunde" },
];

// Schnellaktionen (Knopf über der unteren Leiste): häufige Erfassungen für den Bewohner aus der Kopfzeile.
const QUICK_ACTIONS: BarItem[] = [
  { id: "doc", label: "Dokumentation", icon: "note", moduleId: "chart", child: "Schnelldokumentation" },
  { id: "vitals", label: "Vitalwerte", icon: "vitals", moduleId: "vitals", child: "Vitalwerte" },
  { id: "fluid", label: "Trinkmenge", icon: "nutrition", moduleId: "vitals", child: "Trinkprotokoll" },
  { id: "prn", label: "Reservegabe", icon: "med", moduleId: "med", child: "Reserven" },
  { id: "wound", label: "Wundverlauf", icon: "wounds", moduleId: "wounds", child: "Dokumentation" },
  { id: "handover", label: "Übergabenotiz", icon: "handover", moduleId: "shift", child: "Übergabe" },
];

// Mobile bottom bar and main menu; shows only the areas the signed-in person may use.
export function MobileNavigation({ activeModule }: { activeModule?: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const context = useWorkContext();
  const permissions = context?.profile.permissions;
  const [residentId] = useCareResident();
  const resident = context?.residents.find((item) => item.id === residentId) ?? null;
  const groups = useMemo(() => sidebarNavigation(permissions), [permissions]);
  const badges = useNavigationBadges();
  const count = (keys: Array<keyof NavigationBadges>) =>
    badges ? keys.reduce((sum, key) => sum + (badges[key] ?? 0), 0) : 0;
  const allowed = new Set(groups.flatMap((group) => group.modules.map((module) => module.id)));
  const bar = BAR.filter((item) => allowed.has(item.moduleId));
  const quick = quickLinks.filter((link) => allowed.has(link.moduleId));
  const actions = QUICK_ACTIONS.filter((item) => allowed.has(item.moduleId) && routeFor(item.moduleId, item.child));
  const inBar = activeModule === "home" || bar.some((item) => item.moduleId === activeModule);
  const menuCount = count(["tasks", "handover", "messages"]);

  const sheetOpen = menuOpen || actionsOpen;
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      setActionsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("mobile-menu-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("mobile-menu-open");
    };
  }, [sheetOpen]);

  function go(moduleId: string, child: string) {
    const href = routeFor(moduleId, child);
    setMenuOpen(false);
    setActionsOpen(false);
    if (href) router.push(href);
  }

  return (
    <>
      {menuOpen && (
        <>
          <div className="mobile-nav-backdrop" role="presentation" onClick={() => setMenuOpen(false)} />
          <div className="mobile-nav-menu" role="dialog" aria-modal="true" aria-label="Hauptmenü">
            <div className="mobile-nav-menu-head">
              <div>
                <p className="eyebrow">CareCore</p>
                <strong>Menü</strong>
              </div>
              <button type="button" aria-label="Menü schliessen" onClick={() => setMenuOpen(false)}>
                <ModuleIcon name="close" />
              </button>
            </div>
            {quick.length > 0 && (
              <section className="mobile-nav-section">
                <h3>Schnellzugriff</h3>
                <div className="mobile-nav-quick">
                  {quick.map((link) => {
                    const value = link.badge ? count([link.badge]) : 0;
                    return (
                      <button
                        type="button"
                        key={`${link.moduleId}:${link.child}`}
                        onClick={() => go(link.moduleId, link.child)}
                      >
                        <ModuleIcon name={link.icon} />
                        <span>{link.label}</span>
                        {value > 0 && <em>{value}</em>}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            {groups.map((group) => (
              <section className="mobile-nav-section" key={group.id}>
                <h3>{group.label}</h3>
                <div className="mobile-nav-groups">
                  {group.modules.map((module) => {
                    const value = count(moduleBadges(module.id));
                    return (
                      <button
                        className={module.id === activeModule ? "active" : ""}
                        type="button"
                        key={module.id}
                        aria-current={module.id === activeModule ? "page" : undefined}
                        onClick={() => go(module.id, module.children[0])}
                      >
                        <span className="mobile-nav-group-icon">
                          <ModuleIcon name={module.icon} />
                        </span>
                        <span>
                          <strong>{module.label}</strong>
                          {module.children.length > 1 && <small>{module.children.join(" · ")}</small>}
                        </span>
                        {value > 0 ? <em className="mobile-nav-count">{value}</em> : <ModuleIcon name="chevron" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            <section className="mobile-nav-section">
              <div className="mobile-nav-groups">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/c/einstellungen");
                  }}
                >
                  <span className="mobile-nav-group-icon">
                    <ModuleIcon name="settings" />
                  </span>
                  <span>
                    <strong>Einstellungen</strong>
                  </span>
                  <ModuleIcon name="chevron" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openHelp();
                  }}
                >
                  <span className="mobile-nav-group-icon">
                    <ModuleIcon name="docs" />
                  </span>
                  <span>
                    <strong>Hilfe & Support</strong>
                  </span>
                  <ModuleIcon name="chevron" />
                </button>
              </div>
            </section>
          </div>
        </>
      )}
      {actionsOpen && (
        <>
          <div className="mobile-nav-backdrop" role="presentation" onClick={() => setActionsOpen(false)} />
          <div
            className="mobile-nav-menu mobile-actions-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Schnellaktionen"
          >
            <div className="mobile-nav-menu-head">
              <div>
                <p className="eyebrow">Schnellaktionen</p>
                <strong>{resident ? resident.name : "Kein Bewohner gewählt"}</strong>
              </div>
              <button type="button" aria-label="Schnellaktionen schliessen" onClick={() => setActionsOpen(false)}>
                <ModuleIcon name="close" />
              </button>
            </div>
            <section className="mobile-nav-section">
              <div className="mobile-nav-quick">
                {actions.map((item) => (
                  <button type="button" key={item.id} onClick={() => go(item.moduleId, item.child)}>
                    <ModuleIcon name={item.icon} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="mobile-nav-section">
              <div className="mobile-nav-groups">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    openResidentPicker();
                  }}
                >
                  <span className="mobile-nav-group-icon">
                    <ModuleIcon name="residents" />
                  </span>
                  <span>
                    <strong>{resident ? "Anderen Bewohner wählen" : "Bewohner wählen"}</strong>
                    <small>Die Erfassung gilt für den Bewohner aus der Kopfzeile.</small>
                  </span>
                  <ModuleIcon name="chevron" />
                </button>
              </div>
            </section>
          </div>
        </>
      )}
      {/* Auf der Startseite bleibt deren eigener Knopf „Notiz erstellen“; im Messenger läge er über dem Eingabefeld. */}
      {actions.length > 0 && activeModule !== "home" && activeModule !== "messenger" && (
        <button
          className="floating-action"
          type="button"
          aria-label="Schnellaktionen"
          aria-haspopup="dialog"
          aria-expanded={actionsOpen}
          onClick={() => setActionsOpen((value) => !value)}
        >
          <ModuleIcon name={actionsOpen ? "close" : "plus"} />
        </button>
      )}
      <nav className="bottom-nav" aria-label="Mobile Navigation">
        <button
          className={activeModule === "home" && !menuOpen ? "active" : ""}
          type="button"
          aria-current={activeModule === "home" ? "page" : undefined}
          onClick={() => {
            setMenuOpen(false);
            setActionsOpen(false);
            router.push("/c");
          }}
        >
          <ModuleIcon name="home" />
          <span>Start</span>
        </button>
        {bar.map((item) => {
          const value = item.id === "med" ? count(["medRound"]) : 0;
          const active = activeModule === item.moduleId && !menuOpen;
          return (
            <button
              className={active ? "active" : ""}
              type="button"
              key={item.id}
              aria-current={active ? "page" : undefined}
              aria-label={value ? `${item.label} (${value} überfällig)` : undefined}
              onClick={() => go(item.moduleId, item.child)}
            >
              <ModuleIcon name={item.icon} />
              <span>{item.label}</span>
              {value > 0 && <em className="bottom-nav-badge">{value > 99 ? "99+" : value}</em>}
            </button>
          );
        })}
        <button
          className={menuOpen || !inBar ? "active" : ""}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => {
            setActionsOpen(false);
            setMenuOpen((value) => !value);
          }}
        >
          <ModuleIcon name={menuOpen ? "close" : "sidebar"} />
          <span>Menü</span>
          {menuCount > 0 && !menuOpen && <em className="bottom-nav-badge">{menuCount > 99 ? "99+" : menuCount}</em>}
        </button>
      </nav>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ModuleIcon } from "./module-icon";
import { navigationForRole, routeFor } from "./navigation";

// Mobile main menu and bottom navigation; shows only the areas the signed-in role may use.
export function MobileNavigation({ activeModule }: { activeModule?: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const visibleNavigation = useMemo(() => navigationForRole(role), [role]);
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/work-context")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setRole(data?.profile?.role ?? null))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setGroupId(
          visibleNavigation.find((group) => group.modules.some((module) => module.id === activeModule))?.id ?? null,
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [activeModule, visibleNavigation]);

  const group = visibleNavigation.find((item) => item.id === groupId);
  const needsMenu = group ? group.modules.length > 4 : true;
  const visibleModules = group
    ? group.modules.length <= 4
      ? group.modules
      : [
          ...group.modules.filter((module) => module.id === activeModule),
          ...group.modules.filter((module) => module.id !== activeModule),
        ].slice(0, 3)
    : [];

  function chooseGroup(nextGroupId: string) {
    const next = visibleNavigation.find((item) => item.id === nextGroupId);
    const firstModule = next?.modules[0];
    const firstChild = firstModule?.children[0];
    setGroupId(nextGroupId);
    setMenuOpen(false);
    const href = firstModule && firstChild ? routeFor(firstModule.id, firstChild) : null;
    if (href) router.push(href);
  }

  function chooseChild(moduleId: string, child: string) {
    const href = routeFor(moduleId, child);
    if (href) {
      setMenuOpen(false);
      router.push(href);
    }
  }

  const menuButton = (label: string) => (
    <button
      className={menuOpen ? "active" : ""}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen((value) => !value)}
    >
      <ModuleIcon name="sidebar" />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {menuOpen && (
        <div className="mobile-nav-menu" role="dialog" aria-label="Hauptmenü">
          <div className="mobile-nav-menu-head">
            <div>
              {group && (
                <button className="mobile-nav-back" type="button" onClick={() => setGroupId(null)}>
                  <ModuleIcon name="chevron" /> Alle Hauptbereiche
                </button>
              )}
              <p className="eyebrow">CareCore Navigation</p>
              <strong>{group?.label ?? "Hauptbereiche"}</strong>
            </div>
            <button type="button" aria-label="Hauptmenü schliessen" onClick={() => setMenuOpen(false)}>
              <ModuleIcon name="close" />
            </button>
          </div>
          {group ? (
            <div className="mobile-nav-subgroups">
              {group.modules.map((module) => (
                <section key={module.id}>
                  <h3>
                    <ModuleIcon name={module.icon} />
                    {module.label}
                  </h3>
                  <div>
                    {module.children.map((child) => (
                      <button type="button" key={child} onClick={() => chooseChild(module.id, child)}>
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
              {visibleNavigation.map((item) => (
                <button
                  className={item.id === groupId ? "active" : ""}
                  type="button"
                  key={item.id}
                  onClick={() => chooseGroup(item.id)}
                >
                  <span className="mobile-nav-group-icon">
                    <ModuleIcon name={item.modules[0]?.icon ?? "pulse"} />
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.modules.length} Bereiche</small>
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
            setGroupId(null);
            setMenuOpen(false);
            router.push("/c");
          }}
        >
          <ModuleIcon name="home" />
          <span>Startseite</span>
        </button>
        {!group ? (
          menuButton("Menü")
        ) : (
          <>
            {visibleModules.map((module) => {
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
            {needsMenu && menuButton("Mehr")}
          </>
        )}
      </nav>
    </>
  );
}

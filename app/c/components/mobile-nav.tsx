"use client";

import { routeFor } from "../../components/navigation";
import { IconName, Icon } from "./dashboard-shared";
import type { DashboardState } from "./use-dashboard";

export function MobileNavMenu({ r }: { r: DashboardState }) {
  const {
    setMobileMenuOpen,
    mobileGroupId,
    setMobileGroupId,
    visibleNavigation,
    mobileGroup,
    chooseMobileGroup,
    chooseMobileChild,
  } = r;
  return (
    <div className="mobile-nav-menu" role="dialog" aria-label="Hauptmenü">
      <div className="mobile-nav-menu-head">
        <div>
          {mobileGroup && (
            <button className="mobile-nav-back" type="button" onClick={() => setMobileGroupId(null)}>
              <Icon name="chevron" /> Alle Hauptbereiche
            </button>
          )}
          <p className="eyebrow">CareCore Navigation</p>
          <strong>{mobileGroup?.label ?? "Hauptbereiche"}</strong>
        </div>
        <button type="button" aria-label="Hauptmenü schliessen" onClick={() => setMobileMenuOpen(false)}>
          <Icon name="close" />
        </button>
      </div>
      {mobileGroup ? (
        <div className="mobile-nav-subgroups">
          {mobileGroup.modules.map((module) => (
            <section key={module.id}>
              <h3>
                <Icon name={module.icon as IconName} />
                {module.label}
              </h3>
              <div>
                {module.children.map((child) => (
                  <button type="button" key={child} onClick={() => chooseMobileChild(module.id, child)}>
                    {child}
                    <Icon name="chevron" />
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
                <Icon name={(group.modules[0]?.icon ?? "pulse") as IconName} />
              </span>
              <span>
                <strong>{group.label}</strong>
                <small>{group.modules.length} Bereiche</small>
              </span>
              <Icon name="chevron" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileBottomNav({ r }: { r: DashboardState }) {
  const { router, mobileMenuOpen, setMobileMenuOpen, setMobileGroupId, mobileGroup, mobileNeedsMenu } = r;
  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      <button
        className="active"
        type="button"
        onClick={() => {
          setMobileGroupId(null);
          setMobileMenuOpen(false);
          router.push("/c");
        }}
      >
        <Icon name="home" />
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
          <Icon name="sidebar" />
          <span>Menü</span>
        </button>
      ) : (
        <>
          {mobileGroup.modules.map((module) => {
            const href = routeFor(module.id, module.children[0]);
            return (
              <button type="button" key={module.id} onClick={() => href && router.push(href)}>
                <Icon name={module.icon as IconName} />
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
              <Icon name="sidebar" />
              <span>Menü</span>
            </button>
          )}
        </>
      )}{" "}
    </nav>
  );
}

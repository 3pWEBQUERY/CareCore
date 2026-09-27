"use client";

import Link from "next/link";
import { useNavigationBadges, useWorkContext } from "./care-context";
import { badgeFor, moduleById, navigationFor, routeFor } from "./navigation";

// The pages of the current module as tabs, e.g. "Mein Dienst": Heute · Übergabe · Termine.
// Replaces the former submenus of the sidebar.
export function PageTabs({ moduleId, child }: { moduleId: string; child: string }) {
  const context = useWorkContext();
  const badges = useNavigationBadges();
  const entry = navigationFor(context?.profile.permissions)
    .flatMap((group) => group.modules)
    .find((item) => item.id === moduleId);
  const tabs = entry?.children ?? moduleById(moduleId)?.children ?? [];
  if (tabs.length < 2) return null;
  return (
    <nav className="page-tabs" aria-label={`${entry?.label ?? "Bereich"}: Seiten`}>
      {tabs.map((tab) => {
        const href = routeFor(moduleId, tab);
        if (!href) return null;
        const badge = badgeFor(moduleId, tab);
        const count = badge && badges ? badges[badge] : 0;
        return (
          <Link
            key={tab}
            href={href}
            className={tab === child ? "active" : ""}
            aria-current={tab === child ? "page" : undefined}
          >
            {tab}
            {count > 0 && <em>{count > 99 ? "99+" : count}</em>}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useNavigationBadges, useWorkContext } from "./care-context";
import { badgeFor, moduleById, navigationFor, routeFor } from "./navigation";
import { navigationLabel, termsFor } from "@/lib/terminology";

// The pages of the current module as tabs, e.g. "Mein Dienst": Heute · Übergabe · Termine.
// Replaces the former submenus of the sidebar.
export function PageTabs({ moduleId, child }: { moduleId: string; child: string }) {
  const context = useWorkContext();
  const terms = termsFor(context?.terminology);
  const L = (label: string) => navigationLabel(label, terms);
  const badges = useNavigationBadges();
  const entry = navigationFor(context?.profile.permissions)
    .flatMap((group) => group.modules)
    .find((item) => item.id === moduleId);
  const tabs = entry?.children ?? moduleById(moduleId)?.children ?? [];
  const ref = useRef<HTMLElement>(null);
  // On narrow screens the active tab is scrolled into view.
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>("a.active");
    if (nav && active && nav.scrollWidth > nav.clientWidth)
      nav.scrollLeft = active.offsetLeft - nav.clientWidth / 2 + active.offsetWidth / 2;
  }, [child, tabs.length]);
  if (tabs.length < 2) return null;
  return (
    <nav ref={ref} className="page-tabs" aria-label={`${entry ? L(entry.label) : "Bereich"}: Seiten`}>
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
            transitionTypes={["nav-tab"]}
          >
            {L(tab)}
            {count > 0 && <em>{count > 99 ? "99+" : count}</em>}
          </Link>
        );
      })}
    </nav>
  );
}

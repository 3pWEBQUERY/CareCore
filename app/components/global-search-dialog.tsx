"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setCareResident, useWorkContext } from "./care-context";
import { ModuleIcon } from "./module-icon";
import { navigationFor, routeFor, type ModuleIconName } from "./navigation";

type SearchResult = {
  key: string;
  title: string;
  meta: string;
  icon: ModuleIconName;
  href: string;
  residentId?: string;
};

const MAX_RESULTS = 12;

// Global quick search over the residents and every function the person may use.
// Choosing a resident opens the resident record and makes it the working context.
export function GlobalSearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const context = useWorkContext();
  const [query, setQuery] = useState("");
  const all = useMemo(() => {
    const residents: SearchResult[] = (context?.residents ?? []).map((resident) => ({
      key: `resident-${resident.id}`,
      title: resident.name,
      meta: `Bewohner · ${[resident.room, resident.group].filter(Boolean).join(" · ")}`,
      icon: "residents",
      href: `/c/bewohner?resident=${resident.id}`,
      residentId: resident.id,
    }));
    const functions: SearchResult[] = navigationFor(context?.profile.permissions).flatMap((group) =>
      group.modules.flatMap((module) =>
        module.children.flatMap((child) => {
          const href = routeFor(module.id, child);
          return href
            ? [
                {
                  key: href,
                  title: child === module.label || module.children.length === 1 ? module.label : child,
                  meta: `${group.label} · ${module.label}`,
                  icon: module.icon,
                  href,
                },
              ]
            : [];
        }),
      ),
    );
    return { residents, functions };
  }, [context]);
  const needle = query.trim().toLocaleLowerCase("de-CH");
  const matches = (item: SearchResult) => `${item.title} ${item.meta}`.toLocaleLowerCase("de-CH").includes(needle);
  const results = needle
    ? [...all.residents.filter(matches), ...all.functions.filter(matches)].slice(0, MAX_RESULTS)
    : [
        {
          key: "notifications",
          title: "Benachrichtigungen",
          meta: "Aktuelle Hinweise und Aufgaben",
          icon: "bell" as ModuleIconName,
          href: "/c/benachrichtigungen",
        },
        ...all.functions.slice(0, MAX_RESULTS - 1),
      ];
  return (
    <div className="overlay" role="presentation" onClick={(event) => event.currentTarget === event.target && onClose()}>
      <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche">
        <div className="search-input-wrap">
          <ModuleIcon name="search" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) open(results[0]);
            }}
            placeholder="Bewohner, Dokumente oder Funktionen suchen…"
            aria-label="Suchbegriff"
          />
          <button type="button" onClick={onClose} aria-label="Suche schliessen">
            ESC
          </button>
        </div>
        <div className="search-results">
          <span className="search-group-label">{query ? "Suchergebnisse" : "Schnellzugriff"}</span>
          {results.map((result) => (
            <button className="search-result" type="button" key={result.key} onClick={() => open(result)}>
              <span className="result-icon">
                <ModuleIcon name={result.icon} />
              </span>
              <span>
                <strong>{result.title}</strong>
                <small>{result.meta}</small>
              </span>
            </button>
          ))}
          {needle && !results.length && <span className="search-group-label">Keine Treffer für „{query.trim()}“</span>}
        </div>
      </section>
    </div>
  );

  function open(result: SearchResult) {
    if (result.residentId) setCareResident(result.residentId);
    onClose();
    router.push(result.href);
  }
}

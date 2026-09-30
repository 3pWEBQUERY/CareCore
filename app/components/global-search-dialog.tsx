"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setCareResident, useCareResident, useWorkContext } from "./care-context";
import { actionMatches, availableActions, runAction, type CareAction } from "./actions";
import { ModuleIcon } from "./module-icon";
import { navigationFor, routeFor, type ModuleIconName } from "./navigation";
import { navigationLabel, termsFor } from "@/lib/terminology";

type SearchResult = {
  key: string;
  title: string;
  meta: string;
  icon: ModuleIconName;
  href: string;
  residentId?: string;
  action?: CareAction;
};

const MAX_RESULTS = 12;

// Global quick search over the residents and every function the person may use.
// Choosing a resident opens the resident record and makes it the working context.
export function GlobalSearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const context = useWorkContext();
  const [query, setQuery] = useState("");
  const [contextResidentId] = useCareResident();
  const all = useMemo(() => {
    const terms = termsFor(context?.terminology);
    const L = (label: string) => navigationLabel(label, terms);
    const residents: SearchResult[] = (context?.residents ?? []).map((resident) => ({
      key: `resident-${resident.id}`,
      title: resident.name,
      meta: `${terms.one} · ${[resident.room, resident.group].filter(Boolean).join(" · ")}`,
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
                  title: L(child === module.label || module.children.length === 1 ? module.label : child),
                  meta: `${L(group.label)} · ${L(module.label)}`,
                  icon: module.icon,
                  href,
                },
              ]
            : [];
        }),
      ),
    );
    return { residents, functions, actions: availableActions(context?.profile.permissions), terms };
  }, [context]);
  const needle = query.trim().toLocaleLowerCase("de-CH");
  const matches = (item: SearchResult) => `${item.title} ${item.meta}`.toLocaleLowerCase("de-CH").includes(needle);
  // Aktionen: „vital“ erfasst für die Person aus der Kopfzeile, „vital erna“ gleich für Erna.
  const contextResident = all.residents.find((item) => item.residentId === contextResidentId);
  const tokens = needle.split(/\s+/).filter(Boolean);
  const actionResults = all.actions.flatMap((action): SearchResult[] => {
    const used = tokens.filter((token) => actionMatches(action, token));
    if (!used.length) return [];
    const rest = tokens.filter((token) => !used.includes(token));
    const base = { icon: action.icon, href: "", action };
    if (!rest.length)
      return [
        {
          ...base,
          key: `action-${action.id}`,
          title: action.title,
          meta: contextResident ? `Aktion · für ${contextResident.title}` : "Aktion",
          residentId: contextResident?.residentId,
        },
      ];
    return all.residents
      .filter((item) => rest.every((token) => item.title.toLocaleLowerCase("de-CH").includes(token)))
      .slice(0, 3)
      .map((item) => ({
        ...base,
        key: `action-${action.id}-${item.residentId}`,
        title: `${action.title} · ${item.title}`,
        meta: `Aktion · ${item.meta}`,
        residentId: item.residentId,
      }));
  });
  const results = needle
    ? [...actionResults, ...all.residents.filter(matches), ...all.functions.filter(matches)].slice(0, MAX_RESULTS)
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
            placeholder={`${termsFor(context?.terminology).many}, Dokumente oder Funktionen suchen…`}
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
    onClose();
    if (result.action) return runAction(result.action, (href) => router.push(href), result.residentId);
    if (result.residentId) setCareResident(result.residentId);
    router.push(result.href);
  }
}

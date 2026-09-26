"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ModuleIcon } from "./module-icon";
import { type ModuleIconName } from "./navigation";

export const globalResults = [
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

// Global quick search over the main CareCore areas.
export function GlobalSearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      globalResults.filter((item) =>
        `${item.title} ${item.meta}`.toLocaleLowerCase("de-CH").includes(query.trim().toLocaleLowerCase("de-CH")),
      ),
    [query],
  );
  return (
    <div className="overlay" role="presentation" onClick={(event) => event.currentTarget === event.target && onClose()}>
      <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche">
        <div className="search-input-wrap">
          <ModuleIcon name="search" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
            <button
              className="search-result"
              type="button"
              key={result.title}
              onClick={() => {
                onClose();
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
  );
}

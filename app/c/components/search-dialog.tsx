"use client";

import { Icon } from "./dashboard-shared";
import type { DashboardState } from "./use-dashboard";

export function SearchDialog({ r }: { r: DashboardState }) {
  const { router, searchOpen, query, setQuery, closeSearch, filteredResults } = r;
  if (!searchOpen) return null;
  return (
    <div
      className="overlay"
      role="presentation"
      onClick={(event) => event.currentTarget === event.target && closeSearch()}
    >
      <section
        id="global-search-dialog"
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Globale Suche"
      >
        <div className="search-input-wrap">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Bewohner oder Funktionen suchen…"
            aria-label="Suchbegriff"
          />
          <button type="button" onClick={closeSearch} aria-label="Suche schliessen">
            ESC
          </button>
        </div>
        <div className="search-results">
          <span className="search-group-label">{query ? "Suchergebnisse" : "Schnellzugriff"}</span>
          {filteredResults.map((result) => (
            <button
              className="search-result"
              type="button"
              key={result.href}
              onClick={() => {
                closeSearch();
                router.push(result.href);
              }}
            >
              <span className="result-icon">
                <Icon name={result.icon} />
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

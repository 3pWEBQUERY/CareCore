"use client";

import { Icon } from "./residents-utils";
import type { ResidentsPageState } from "./use-residents-page";

export function ResidentSearchDialog({ r }: { r: ResidentsPageState }) {
  const { query, setQuery, setSearchOpen, setSelectedResident, filteredResidents } = r;
  return (
    <section
      id="resident-global-search"
      className="search-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Globale Suche"
    >
      <div className="search-input-wrap">
        <Icon name="search" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Bewohner, Dokumente oder Funktionen suchen…"
          aria-label="Suchbegriff"
        />
        <button type="button" onClick={() => setSearchOpen(false)} aria-label="Suche schliessen">
          ESC
        </button>
      </div>
      <div className="search-results">
        <span className="search-group-label">Bewohner</span>
        {filteredResidents.map((resident) => (
          <button
            className="search-result"
            type="button"
            key={resident.name}
            onClick={() => {
              setSearchOpen(false);
              setSelectedResident(resident);
            }}
          >
            <span className="result-icon">
              <Icon name="residents" />
            </span>
            <span>
              <strong>{resident.name}</strong>
              <small>
                {resident.room} · {resident.unit}
              </small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

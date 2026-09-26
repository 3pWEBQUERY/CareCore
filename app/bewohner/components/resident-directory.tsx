"use client";

import { Icon, residentStatusFilters, ResidentAvatar } from "./residents-utils";
import type { ResidentsPageState } from "./use-residents-page";

export function ResidentDirectory({ r }: { r: ResidentsPageState }) {
  const {
    query,
    setQuery,
    units,
    unit,
    setUnit,
    statusFilter,
    setStatusFilter,
    filtersOpen,
    setFiltersOpen,
    setSelectedResident,
    filteredResidents,
  } = r;
  return (
    <section className="card resident-directory" aria-labelledby="directory-title">
      <div className="directory-toolbar">
        <div>
          <h2 className="card-title" id="directory-title">
            Bewohnerverzeichnis
          </h2>
          <p className="card-subtitle">{filteredResidents.length} Einträge aus der Datenbank</p>
        </div>
        <label className="resident-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name oder Zimmer suchen"
            aria-label="Bewohner suchen"
          />
        </label>
        <button
          className={`secondary-button directory-filter ${filtersOpen ? "active" : ""}`}
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="resident-filter-panel"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <Icon name="filter" />
          {filtersOpen ? "Filter schliessen" : "Filter"}
          <Icon name="caretDown" className="directory-filter-caret" />
        </button>
      </div>
      <div
        id="resident-filter-panel"
        className={`resident-filter-panel ${filtersOpen ? "open" : ""}`}
        aria-hidden={!filtersOpen}
      >
        <div className="resident-filter-panel-inner" inert={!filtersOpen}>
          <div className="resident-filter-group">
            <span>Wohnbereich</span>
            <div className="unit-filter" aria-label="Wohnbereich filtern">
              {["Alle", ...units].map((label) => (
                <button
                  className={unit === label ? "active" : ""}
                  type="button"
                  aria-pressed={unit === label}
                  key={label}
                  onClick={() => setUnit(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="resident-filter-group">
            <span>Bewohnerstatus</span>
            <div className="resident-status-filter" aria-label="Bewohnerstatus filtern">
              {residentStatusFilters.map((label) => (
                <button
                  className={statusFilter === label ? "active" : ""}
                  type="button"
                  aria-pressed={statusFilter === label}
                  key={label}
                  onClick={() => setStatusFilter(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {(unit !== "Alle" || statusFilter !== "Alle" || query) && (
            <button
              className="resident-filter-reset"
              type="button"
              onClick={() => {
                setUnit("Alle");
                setStatusFilter("Alle");
                setQuery("");
              }}
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      <div className="resident-table" role="table" aria-label="Bewohnerliste">
        <div className="resident-table-head" role="row">
          <span role="columnheader">Bewohner</span>
          <span role="columnheader">Wohnbereich</span>
          <span role="columnheader">Pflegebedarf</span>
          <span role="columnheader">Letzte Aktualisierung</span>
          <span role="columnheader">Status</span>
          <span aria-hidden="true" />
        </div>
        {filteredResidents.map((resident) => (
          <button
            className="resident-list-row"
            type="button"
            role="row"
            key={resident.name}
            onClick={() => setSelectedResident(resident)}
          >
            <span className="resident-person" role="cell">
              <ResidentAvatar resident={resident} />
              <span>
                <strong>{resident.name}</strong>
                <small>{resident.room}</small>
              </span>
            </span>
            <span role="cell">{resident.unit}</span>
            <span role="cell">
              <strong>{resident.careLevel}</strong>
              <small>{resident.note}</small>
            </span>
            <span role="cell">{resident.lastUpdate}</span>
            <span role="cell">
              <span className={`status-badge ${resident.status}`}>{resident.statusLabel}</span>
            </span>
            <span role="cell">
              <Icon name="chevron" />
            </span>
          </button>
        ))}
        {filteredResidents.length === 0 && (
          <div className="resident-empty">
            <Icon name="search" />
            <strong>Keine Bewohner gefunden</strong>
            <p>Prüfe den Suchbegriff oder ändere den Wohnbereich.</p>
          </div>
        )}
      </div>
    </section>
  );
}

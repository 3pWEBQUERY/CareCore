"use client";

import { useMemo, useState } from "react";
import ModulePageShell from "@/app/components/module-page-shell";
import { ModuleIcon } from "@/app/components/module-icon";
import { residents } from "./history-data";
import { ResidentStatus } from "./history-data";

const statuses: ResidentStatus[] = ["Alle", "Aktiv", "Verlegt", "Ausgetreten", "Verstorben"];
const units = ["Gesamtes Haus", "Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Pflegewohngruppe"];

export default function ResidentHistoryPage() {
  const [status, setStatus] = useState<ResidentStatus>("Alle");
  const [unit, setUnit] = useState("Gesamtes Haus");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("r01");

  const filteredResidents = useMemo(
    () =>
      residents.filter((resident) => {
        const matchesStatus = status === "Alle" || resident.status === status;
        const matchesUnit = unit === "Gesamtes Haus" || resident.unit === unit;
        const searchable =
          `${resident.name} ${resident.room} ${resident.unit} ${resident.status} ${resident.lastEntry} ${resident.note}`.toLocaleLowerCase(
            "de-CH",
          );
        return matchesStatus && matchesUnit && searchable.includes(query.trim().toLocaleLowerCase("de-CH"));
      }),
    [query, status, unit],
  );
  const selectedResident = residents.find((resident) => resident.id === selectedId) ?? residents[0];
  const activeCount = residents.filter((resident) => resident.status === "Aktiv").length;
  const departedCount = residents.filter((resident) => resident.status === "Ausgetreten").length;
  const deceasedCount = residents.filter((resident) => resident.status === "Verstorben").length;
  const isArchived = selectedResident.status === "Ausgetreten" || selectedResident.status === "Verstorben";

  function resetFilters() {
    setStatus("Alle");
    setUnit("Gesamtes Haus");
    setQuery("");
  }

  return (
    <ModulePageShell
      activeModule="residents"
      activeChild="Verlauf"
      pageClass="resident-history-page"
      locationSecondary="Gesamtes Haus · alle Wohnbereiche"
    >
      {(showToast) => (
        <main className="workspace module-workspace">
          <section className="page-heading residents-heading" aria-labelledby="resident-history-title">
            <div className="heading-copy">
              <p className="eyebrow">CareCore Bewohner</p>
              <h1 id="resident-history-title">Bewohnerverlauf &amp; Archiv</h1>
              <p>Alle aktiven und ehemaligen Bewohnerakten des gesamten Hauses an einem Ort.</p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => showToast("Hausweiter Bericht wird vorbereitet")}
            >
              <ModuleIcon name="docs" className="button-icon" />
              Hausbericht erstellen
            </button>
          </section>

          <section className="wound-summary" aria-label="Hausweite Bewohnerübersicht">
            <div>
              <span className="summary-icon">
                <ModuleIcon name="residents" />
              </span>
              <span>
                <strong>{residents.length}</strong>
                <small>Bewohnerakten gesamt</small>
              </span>
            </div>
            <div>
              <span className="summary-icon">
                <ModuleIcon name="check" />
              </span>
              <span>
                <strong>{activeCount}</strong>
                <small>aktuell im Haus</small>
              </span>
            </div>
            <div>
              <span className="summary-icon info">
                <ModuleIcon name="handover" />
              </span>
              <span>
                <strong>{departedCount}</strong>
                <small>ausgetreten</small>
              </span>
            </div>
            <div>
              <span className="summary-icon archived">
                <ModuleIcon name="docs" />
              </span>
              <span>
                <strong>{deceasedCount}</strong>
                <small>verstorben · archiviert</small>
              </span>
            </div>
          </section>

          <section className="house-scope-note" aria-label="Umfang der Ansicht">
            <span>
              <ModuleIcon name="building" />
            </span>
            <div>
              <strong>Gesamtes Haus</strong>
              <p>
                Die Ansicht umfasst alle Wohnbereiche sowie aktive, verlegte, ausgetretene und verstorbene Bewohner.
              </p>
            </div>
            <button className="quiet-button" type="button" onClick={resetFilters}>
              Alle Filter zurücksetzen
            </button>
          </section>

          <div className="house-history-layout">
            <section className="card house-resident-directory" aria-labelledby="house-residents-title">
              <div className="house-history-toolbar">
                <div>
                  <h2 className="card-title" id="house-residents-title">
                    Bewohnerakten
                  </h2>
                  <p className="card-subtitle">
                    {filteredResidents.length} von {residents.length} Akten angezeigt
                  </p>
                </div>
                <label className="resident-search">
                  <ModuleIcon name="search" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Name, Zimmer oder Eintrag suchen"
                    aria-label="Alle Bewohnerakten durchsuchen"
                  />
                </label>
                <label className="house-unit-filter">
                  <span>Wohnbereich</span>
                  <select
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    aria-label="Wohnbereich filtern"
                  >
                    {units.map((item) => (
                      <option value={item} key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="house-status-filters" aria-label="Aktenstatus filtern">
                  {statuses.map((item) => (
                    <button
                      className={status === item ? "active" : ""}
                      type="button"
                      key={item}
                      aria-pressed={status === item}
                      onClick={() => setStatus(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="house-resident-table-head" aria-hidden="true">
                <span>Bewohner</span>
                <span>Wohnbereich</span>
                <span>Aufenthalt</span>
                <span>Letzter Eintrag</span>
                <span>Status</span>
                <span />
              </div>
              <div className="house-resident-list">
                {filteredResidents.map((resident) => (
                  <button
                    className={`house-resident-row ${selectedResident.id === resident.id ? "selected" : ""}`}
                    type="button"
                    key={resident.id}
                    onClick={() => setSelectedId(resident.id)}
                  >
                    <span
                      className={`resident-avatar ${resident.tone === "critical" ? "critical" : resident.tone === "archived" ? "archived" : ""}`}
                    >
                      {resident.initials}
                    </span>
                    <span className="house-resident-person">
                      <strong>{resident.name}</strong>
                      <small>{resident.room}</small>
                    </span>
                    <span className="house-resident-unit">
                      <strong>{resident.unit}</strong>
                      <small>{resident.status === "Aktiv" ? "Aktueller Aufenthalt" : "Letzter Wohnbereich"}</small>
                    </span>
                    <span className="house-resident-period">
                      <strong>{resident.period}</strong>
                      <small>{resident.status === "Aktiv" ? "Laufende Akte" : "Historische Akte"}</small>
                    </span>
                    <span className="house-resident-last">
                      <strong>{resident.lastEntry}</strong>
                      <small>
                        {resident.lastEntryAt} · {resident.author}
                      </small>
                    </span>
                    <span className={`resident-state ${resident.status.toLocaleLowerCase("de-CH")}`}>
                      {resident.status}
                    </span>
                    <ModuleIcon name="chevron" className="chevron" />
                  </button>
                ))}
                {filteredResidents.length === 0 && (
                  <div className="resident-empty">
                    <ModuleIcon name="search" />
                    <strong>Keine Bewohnerakten gefunden</strong>
                    <p>Suchbegriff, Wohnbereich oder Statusfilter anpassen.</p>
                    <button className="secondary-button" type="button" onClick={resetFilters}>
                      Filter zurücksetzen
                    </button>
                  </div>
                )}
              </div>
            </section>

            <aside className="house-history-sidebar">
              <section className={`card house-resident-focus ${isArchived ? "archived" : ""}`} aria-live="polite">
                <div className="card-header">
                  <div>
                    <p className="eyebrow">Ausgewählte Bewohnerakte</p>
                    <h2 className="card-title">{selectedResident.name}</h2>
                    <p className="card-subtitle">
                      {selectedResident.room} · {selectedResident.unit}
                    </p>
                  </div>
                  <span className={`resident-state ${selectedResident.status.toLocaleLowerCase("de-CH")}`}>
                    {selectedResident.status}
                  </span>
                </div>
                <div className="house-resident-focus-body">
                  <span
                    className={`resident-avatar ${selectedResident.tone === "critical" ? "critical" : selectedResident.tone === "archived" ? "archived" : ""}`}
                  >
                    {selectedResident.initials}
                  </span>
                  <h3>{selectedResident.lastEntry}</h3>
                  <p>{selectedResident.note}</p>
                  <dl>
                    <div>
                      <dt>Aktenstatus</dt>
                      <dd>{selectedResident.status}</dd>
                    </div>
                    <div>
                      <dt>Zeitraum</dt>
                      <dd>{selectedResident.period}</dd>
                    </div>
                    <div>
                      <dt>Letzter Eintrag</dt>
                      <dd>{selectedResident.lastEntryAt}</dd>
                    </div>
                    <div>
                      <dt>Erfasst von</dt>
                      <dd>{selectedResident.author}</dd>
                    </div>
                  </dl>
                  {isArchived && (
                    <div className="archive-privacy-note">
                      <ModuleIcon name="quality" />
                      <span>
                        <strong>Geschützte Archivakte</strong>
                        <small>Nur für berechtigte Mitarbeitende sichtbar.</small>
                      </span>
                    </div>
                  )}
                  <div className="course-focus-actions">
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() =>
                        showToast(`${isArchived ? "Archivakte" : "Bewohnerakte"} von ${selectedResident.name} geöffnet`)
                      }
                    >
                      {isArchived ? "Archivakte öffnen" : "Bewohnerakte öffnen"}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        showToast(isArchived ? "Archivierte Dokumente geöffnet" : "Verlauf zum Ergänzen geöffnet")
                      }
                    >
                      {isArchived ? "Dokumente anzeigen" : "Verlauf ergänzen"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="card house-status-overview">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Akten nach Status</h2>
                    <p className="card-subtitle">Gesamtes Haus</p>
                  </div>
                </div>
                <div>
                  {statuses.slice(1).map((item) => {
                    const count = residents.filter((resident) => resident.status === item).length;
                    return (
                      <button type="button" key={item} onClick={() => setStatus(item)}>
                        <span
                          className={`priority-dot ${item === "Aktiv" ? "stable" : item === "Verlegt" ? "info" : "archived"}`}
                        />
                        <span>
                          <strong>{item}</strong>
                          <small>
                            {count} {count === 1 ? "Akte" : "Akten"}
                          </small>
                        </span>
                        <ModuleIcon name="chevron" />
                      </button>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        </main>
      )}
    </ModulePageShell>
  );
}

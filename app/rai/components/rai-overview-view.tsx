"use client";

import { useMemo, useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { residents, assessorOptions } from "./rai-data";

export function OverviewView({ showToast }: { showToast: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Alle");
  const filtered = useMemo(
    () =>
      residents.filter(
        (resident) =>
          (filter === "Alle" || resident.status === filter) &&
          `${resident.name} ${resident.room} ${resident.unit}`
            .toLocaleLowerCase("de-CH")
            .includes(query.trim().toLocaleLowerCase("de-CH")),
      ),
    [filter, query],
  );
  return (
    <>
      <section className="rai-summary" aria-label="RAI Übersicht">
        <div>
          <span className="rai-summary-icon">
            <ModuleIcon name="assess" />
          </span>
          <span>
            <strong>48</strong>
            <small>aktive RAI-Akten</small>
          </span>
        </div>
        <div>
          <span className="rai-summary-icon attention">
            <ModuleIcon name="calendar" />
          </span>
          <span>
            <strong>7</strong>
            <small>Erfassungen fällig</small>
          </span>
        </div>
        <div>
          <span className="rai-summary-icon info">
            <ModuleIcon name="check" />
          </span>
          <span>
            <strong>86%</strong>
            <small>hausweit aktuell</small>
          </span>
        </div>
        <div>
          <span className="rai-summary-icon stable">
            <ModuleIcon name="team" />
          </span>
          <span>
            <strong>4</strong>
            <small>RAI Verantwortliche</small>
          </span>
        </div>
      </section>
      <div className="rai-overview-layout">
        <section className="card rai-worklist">
          <div className="rai-card-header">
            <div>
              <p className="eyebrow">Arbeitskorb</p>
              <h2 className="card-title">Bewohner und Erfassungen</h2>
              <p className="card-subtitle">
                {filtered.length} von {residents.length} Einträgen sichtbar
              </p>
            </div>
            <label className="resident-search">
              <ModuleIcon name="search" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Bewohner suchen"
                aria-label="RAI Bewohner suchen"
              />
            </label>
          </div>
          <div className="rai-filter-row">
            {["Alle", "Fällig", "In Bearbeitung", "Aktuell"].map((item) => (
              <button
                className={filter === item ? "active" : ""}
                type="button"
                key={item}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="rai-resident-list">
            {filtered.map((resident) => (
              <button
                type="button"
                className="rai-resident-row"
                key={resident.id}
                onClick={() => showToast(`${resident.name} für interRAI ausgewählt`)}
              >
                <span className="resident-avatar">{resident.initials}</span>
                <span>
                  <strong>{resident.name}</strong>
                  <small>
                    {resident.room} · {resident.unit}
                  </small>
                  <em>
                    {resident.assessor} · nächste Erfassung {resident.next}
                  </em>
                </span>
                <span className="rai-progress">
                  <i>
                    <span style={{ width: `${resident.progress}%` }} />
                  </i>
                  <b>{resident.progress}%</b>
                </span>
                <span className={`status-badge ${resident.tone}`}>{resident.status}</span>
                <ModuleIcon name="chevron" />
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="resident-empty">
                <ModuleIcon name="search" />
                <strong>Keine RAI-Akten gefunden</strong>
                <p>Suchbegriff oder Filter anpassen.</p>
              </div>
            )}
          </div>
        </section>
        <aside className="rai-side-stack">
          <section className="card rai-responsible-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Rollen und Rechte</p>
                <h2 className="card-title">RAI Verantwortliche</h2>
              </div>
              <span className="status-badge stable">4 aktiv</span>
            </div>
            <div className="rai-responsible-list">
              {assessorOptions.slice(0, 4).map((name, index) => (
                <div key={name}>
                  <span className="avatar">
                    {name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{name}</strong>
                    <small>
                      {index === 0
                        ? "Leitung RAI · LTCF"
                        : index === 1
                          ? "RAI Verantwortliche · HC"
                          : "RAI Verantwortliche · LTCF"}
                    </small>
                  </span>
                  <span className="rai-online-dot" />
                </div>
              ))}
            </div>
            <button className="secondary-button" type="button" onClick={() => showToast("RAI-Berechtigungen geöffnet")}>
              Berechtigungen verwalten <ModuleIcon name="chevron" />
            </button>
          </section>
          <section className="card rai-next-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Nächster Schritt</p>
                <h2 className="card-title">Erfassung fortsetzen</h2>
              </div>
            </div>
            <span className="rai-next-icon">
              <ModuleIcon name="assess" />
            </span>
            <strong>Hans Müller · interRAI LTCF</strong>
            <p>Die Erfassung ist zu 68% abgeschlossen. Die letzten Bereiche warten auf deine fachliche Einschätzung.</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => showToast("interRAI-Erfassung für Hans Müller geöffnet")}
            >
              Weiterarbeiten <ModuleIcon name="chevron" />
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}

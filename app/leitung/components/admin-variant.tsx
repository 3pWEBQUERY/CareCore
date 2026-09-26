"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import AdminUserManagement from "./admin-user-management";
import { Props, AreaSelect } from "./leadership-variant-parts";

export function AdminVariant({
  view,
  rows,
  selected,
  setSelectedId,
  showToast,
  employeeCreatorOpen,
  onCloseEmployeeCreator,
}: Props) {
  const [areaEditorOpen, setAreaEditorOpen] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [areaCapacity, setAreaCapacity] = useState("12");
  const [areaFloor, setAreaFloor] = useState("1. OG");
  const [areaManager, setAreaManager] = useState("Anna Meier");
  const [services, setServices] = useState(["Frühdienst", "Spätdienst"]);
  const toggleService = (service: string) =>
    setServices((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service],
    );
  if (view === "users")
    return (
      <AdminUserManagement
        showToast={showToast}
        createOpen={Boolean(employeeCreatorOpen)}
        onCloseCreate={onCloseEmployeeCreator ?? (() => undefined)}
      />
    );
  if (view === "configuration")
    return (
      <div className="admin-config-layout">
        <section className="card admin-config-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Systemsteuerung</p>
              <h2 className="card-title">Konfiguration</h2>
              <p className="card-subtitle">Zentrale Einstellungen und Integrationen</p>
            </div>
            <span className="status-badge stable">System aktiv</span>
          </div>
          <div className="admin-setting-list">
            {rows.map((row) => (
              <button
                className={selected.id === row.id ? "selected" : ""}
                type="button"
                key={row.id}
                onClick={() => setSelectedId(row.id)}
              >
                <span className={`governance-icon ${row.tone}`}>
                  <ModuleIcon name={row.icon} />
                </span>
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.detail}</small>
                </span>
                <span className={`status-badge ${row.tone}`}>{row.status}</span>
                <span className="admin-toggle on" />
              </button>
            ))}
          </div>
        </section>
        <aside className="card admin-system-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Systemstatus</p>
              <h2 className="card-title">Integrität</h2>
            </div>
          </div>
          <div className="admin-system-score">
            <strong>99,98 %</strong>
            <span>Verfügbarkeit</span>
          </div>
          <ul>
            <li>
              <ModuleIcon name="check" /> Datenbank synchronisiert
            </li>
            <li>
              <ModuleIcon name="check" /> Backup von heute 03:00 Uhr
            </li>
            <li>
              <ModuleIcon name="check" /> Keine Sicherheitswarnungen
            </li>
          </ul>
          <button className="secondary-button" type="button" onClick={() => showToast("Systemprotokoll geöffnet")}>
            Protokoll ansehen <ModuleIcon name="chevron" />
          </button>
        </aside>
      </div>
    );
  return (
    <>
      <div className="admin-organization-layout">
        <section className="card organization-map">
          <div className="card-header">
            <div>
              <p className="eyebrow">Standortstruktur</p>
              <h2 className="card-title">Alterszentrum Sonnengarten</h2>
              <p className="card-subtitle">4 Wohnbereiche · 52 Plätze</p>
            </div>
            <button className="primary-button" type="button" onClick={() => setAreaEditorOpen(true)}>
              <ModuleIcon name="plus" /> Wohnbereich
            </button>
          </div>
          <div className="organization-tree">
            <div className="organization-root">
              <ModuleIcon name="building" />
              <span>
                <strong>Gesamtes Haus</strong>
                <small>46 Plätze belegt · 62 Mitarbeitende</small>
              </span>
            </div>
            {rows.map((row) => (
              <button
                className={selected.id === row.id ? "selected" : ""}
                type="button"
                key={row.id}
                onClick={() => setSelectedId(row.id)}
              >
                <span className={`governance-icon ${row.tone}`}>
                  <ModuleIcon name={row.icon} />
                </span>
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.detail}</small>
                </span>
                <span className={`status-badge ${row.tone}`}>{row.status}</span>
                <ModuleIcon name="chevron" />
              </button>
            ))}
          </div>
        </section>
        <aside className="card organization-detail">
          <div className="card-header">
            <div>
              <p className="eyebrow">Bereichsprofil</p>
              <h2 className="card-title">{selected.title}</h2>
            </div>
            <span className="status-badge stable">Aktiv</span>
          </div>
          <div className="organization-capacity">
            <strong>10 / 12</strong>
            <span>Plätze belegt</span>
            <div>
              <span style={{ width: "83%" }} />
            </div>
          </div>
          <p>{selected.detail}</p>
          <button className="secondary-button" type="button" onClick={() => showToast("Bereichsdetails geöffnet")}>
            Details bearbeiten <ModuleIcon name="chevron" />
          </button>
        </aside>
      </div>
      {areaEditorOpen && (
        <div
          className="area-editor-overlay"
          role="presentation"
          onMouseDown={(event) => event.currentTarget === event.target && setAreaEditorOpen(false)}
        >
          <section className="area-editor-panel" role="dialog" aria-modal="true" aria-labelledby="area-editor-title">
            <header className="area-editor-header">
              <div>
                <p className="eyebrow">CareCore Admin · Organisation</p>
                <h2 id="area-editor-title">Wohnbereich erstellen</h2>
                <p>Lege einen neuen Bereich an und definiere direkt die wichtigsten Stammdaten.</p>
              </div>
              <button
                className="area-editor-close"
                type="button"
                onClick={() => setAreaEditorOpen(false)}
                aria-label="Bereichseditor schliessen"
              >
                ×
              </button>
            </header>
            <form
              className="area-editor-form"
              onSubmit={(event) => {
                event.preventDefault();
                setAreaEditorOpen(false);
                showToast(`${areaName || "Neuer Wohnbereich"} wurde angelegt`);
              }}
            >
              <div className="area-editor-intro">
                <span className="area-editor-icon">
                  <ModuleIcon name="building" />
                </span>
                <div>
                  <strong>Neuer Wohnbereich</strong>
                  <p>Alle Angaben können später in der Organisation bearbeitet werden.</p>
                </div>
              </div>
              <div className="area-editor-grid">
                <label>
                  Bezeichnung
                  <input
                    value={areaName}
                    onChange={(event) => setAreaName(event.target.value)}
                    placeholder="z. B. Wohnbereich 4"
                    required
                  />
                </label>
                <label>
                  Kürzel
                  <input
                    value={areaCode}
                    onChange={(event) => setAreaCode(event.target.value.toUpperCase())}
                    placeholder="z. B. WB4"
                    maxLength={5}
                  />
                </label>
                <label>
                  Etage
                  <AreaSelect
                    label="Etage"
                    value={areaFloor}
                    options={["EG", "1. OG", "2. OG", "3. OG"]}
                    onChange={setAreaFloor}
                  />
                </label>
                <label>
                  Kapazität
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={areaCapacity}
                    onChange={(event) => setAreaCapacity(event.target.value)}
                    required
                  />
                </label>
                <label className="area-editor-wide">
                  Verantwortliche Leitung
                  <AreaSelect
                    label="Verantwortliche Leitung"
                    value={areaManager}
                    options={["Anna Meier", "Lea Frei", "Nora Baumann", "Sven Keller"]}
                    onChange={setAreaManager}
                  />
                </label>
                <fieldset className="area-editor-wide">
                  <legend>Geplante Dienste</legend>
                  <div className="area-service-options">
                    {["Frühdienst", "Spätdienst", "Nachtwache"].map((service) => (
                      <label key={service}>
                        <input
                          type="checkbox"
                          checked={services.includes(service)}
                          onChange={() => toggleService(service)}
                        />
                        <span>{service}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="area-editor-wide">
                  Hinweis oder Zweck
                  <textarea placeholder="z. B. Schwerpunkt Demenzpflege, Kurzzeitpflege …" rows={4} />
                </label>
              </div>
              <footer className="area-editor-actions">
                <button className="secondary-button" type="button" onClick={() => setAreaEditorOpen(false)}>
                  Abbrechen
                </button>
                <button className="primary-button" type="submit">
                  <ModuleIcon name="check" /> Wohnbereich erstellen
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

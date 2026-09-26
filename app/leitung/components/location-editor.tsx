"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { AreaSelect } from "./leadership-variant-parts";

export function LocationEditor({
  open,
  onClose,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
}) {
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteType, setSiteType] = useState("Seniorenresidenz");
  const [siteCountry, setSiteCountry] = useState("Schweiz");
  const [siteManager, setSiteManager] = useState("Anna Meier");
  const [siteStatus, setSiteStatus] = useState("Aktiv");

  if (!open) return null;

  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section className="area-editor-panel" role="dialog" aria-modal="true" aria-labelledby="location-editor-title">
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Admin · Organisation</p>
            <h2 id="location-editor-title">Standort erstellen</h2>
            <p>Lege einen neuen Standort an und hinterlege die wichtigsten Organisationsdaten.</p>
          </div>
          <button className="area-editor-close" type="button" onClick={onClose} aria-label="Standorteditor schliessen">
            ×
          </button>
        </header>
        <form
          className="area-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
            showToast(`${siteName || "Neuer Standort"} wurde angelegt`);
          }}
        >
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="building" />
            </span>
            <div>
              <strong>Neuer Standort</strong>
              <p>Alle Angaben können später in der Organisation bearbeitet werden.</p>
            </div>
          </div>
          <div className="area-editor-grid">
            <label>
              Standortname
              <input
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                placeholder="z. B. Alterszentrum Sonnengarten"
                required
              />
            </label>
            <label>
              Kürzel
              <input
                value={siteCode}
                onChange={(event) => setSiteCode(event.target.value.toUpperCase())}
                placeholder="z. B. AZS"
                maxLength={6}
              />
            </label>
            <label>
              Standorttyp
              <AreaSelect
                label="Standorttyp"
                value={siteType}
                options={["Seniorenresidenz", "Pflegezentrum", "Tagespflege", "Ambulante Dienste"]}
                onChange={setSiteType}
              />
            </label>
            <label>
              Land
              <AreaSelect
                label="Land"
                value={siteCountry}
                options={["Schweiz", "Deutschland", "Österreich"]}
                onChange={setSiteCountry}
              />
            </label>
            <label>
              Adresse
              <input placeholder="z. B. Gartenstrasse 12" />
            </label>
            <label>
              PLZ und Ort
              <input placeholder="z. B. 8001 Zürich" />
            </label>
            <label className="area-editor-wide">
              Verantwortliche Leitung
              <AreaSelect
                label="Verantwortliche Leitung"
                value={siteManager}
                options={["Anna Meier", "Lea Frei", "Nora Baumann", "Sven Keller"]}
                onChange={setSiteManager}
              />
            </label>
            <label>
              Status
              <AreaSelect
                label="Status"
                value={siteStatus}
                options={["Aktiv", "In Vorbereitung", "Archiviert"]}
                onChange={setSiteStatus}
              />
            </label>
            <label className="area-editor-wide">
              Hinweis oder Zweck
              <textarea placeholder="z. B. Hauptstandort mit vier Wohnbereichen …" rows={4} />
            </label>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit">
              <ModuleIcon name="check" /> Standort erstellen
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

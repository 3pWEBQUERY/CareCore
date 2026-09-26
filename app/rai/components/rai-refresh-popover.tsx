"use client";

import { useEffect, useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { CareSelect } from "@/app/components/care-form-controls";

export function RaiRefreshPopover({
  open,
  onClose,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
}) {
  const [scope, setScope] = useState("Alle offenen Erfassungen");
  const [period, setPeriod] = useState("Aktueller Monat");
  const [units, setUnits] = useState(["Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Pflegewohngruppe"]);
  const [notify, setNotify] = useState(true);
  const [logChanges, setLogChanges] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const toggleUnit = (unit: string) =>
    setUnits((current) => (current.includes(unit) ? current.filter((item) => item !== unit) : [...current, unit]));
  return (
    <div
      className="area-editor-overlay rai-refresh-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section
        className="area-editor-panel rai-refresh-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rai-refresh-title"
      >
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore RAI · Arbeitskorb</p>
            <h2 id="rai-refresh-title">Fälligkeiten aktualisieren</h2>
            <p>
              Synchronisiere die RAI-Fälligkeiten mit dem aktuellen Bewohnerbestand und informiere die zuständigen RAI
              Verantwortlichen.
            </p>
          </div>
          <button className="area-editor-close" type="button" onClick={onClose} aria-label="Aktualisierung schliessen">
            ×
          </button>
        </header>
        <form
          className="area-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
            showToast("RAI-Fälligkeiten wurden aktualisiert");
          }}
        >
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="calendar" />
            </span>
            <div>
              <strong>Neue Aktualisierung</strong>
              <p>Die Prüfung berücksichtigt Eintritte, Austritte und offene Erfassungsbereiche.</p>
            </div>
            <span className="duty-assignment-status">
              <i />
              Bereit zur Synchronisierung
            </span>
          </div>
          <div className="area-editor-grid rai-refresh-grid">
            <label>
              Aktualisierungsumfang
              <CareSelect
                label="Aktualisierungsumfang"
                value={scope}
                options={["Alle offenen Erfassungen", "Nur überfällige Erfassungen", "Nur neue Bewohner"]}
                onChange={setScope}
              />
            </label>
            <label>
              Zeitraum
              <CareSelect
                label="Zeitraum"
                value={period}
                options={["Aktueller Monat", "Nächste 30 Tage", "Aktuelles Quartal"]}
                onChange={setPeriod}
              />
            </label>
            <fieldset className="area-editor-wide rai-refresh-units">
              <legend>Wohnbereiche einbeziehen</legend>
              <div className="area-service-options">
                {["Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Pflegewohngruppe"].map((unit) => (
                  <label className={units.includes(unit) ? "selected" : ""} key={unit}>
                    <input type="checkbox" checked={units.includes(unit)} onChange={() => toggleUnit(unit)} />
                    <span>{unit}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="area-editor-wide rai-refresh-options">
              <legend>Zusätzliche Optionen</legend>
              <div className="area-service-options">
                <label className={notify ? "selected" : ""}>
                  <input type="checkbox" checked={notify} onChange={() => setNotify((value) => !value)} />
                  <span>Verantwortliche benachrichtigen</span>
                </label>
                <label className={logChanges ? "selected" : ""}>
                  <input type="checkbox" checked={logChanges} onChange={() => setLogChanges((value) => !value)} />
                  <span>Änderungen protokollieren</span>
                </label>
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>Fälligkeiten neu priorisieren</span>
                </label>
              </div>
            </fieldset>
            <section className="rai-refresh-preview area-editor-wide" aria-label="Vorschau der Aktualisierung">
              <div>
                <span className="rai-refresh-preview-icon">
                  <ModuleIcon name="check" />
                </span>
                <span>
                  <strong>Vorschau</strong>
                  <small>
                    {scope} · {period}
                  </small>
                </span>
              </div>
              <span>
                <strong>{units.length}</strong>
                <small>Wohnbereiche</small>
              </span>
              <span>
                <strong>7</strong>
                <small>mögliche Fälligkeiten</small>
              </span>
            </section>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit" disabled={units.length === 0}>
              <ModuleIcon name="check" /> Fälligkeiten aktualisieren
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

"use client";

import { CareDatePicker, CareSelect } from "@/app/components/care-form-controls";
import { ArrowsLeftRight, Check, Pulse, Stethoscope, Warning } from "@phosphor-icons/react";
import type { ResidentRecordState } from "./use-resident-record";

export function RecordDocumentationView({ r }: { r: ResidentRecordState }) {
  const {
    resident,
    contentRef,
    entries,
    setActiveView,
    selectedEntryId,
    documentationText,
    setDocumentationText,
    documentationDate,
    setDocumentationDate,
    documentationCategory,
    setDocumentationCategory,
    documentationFlags,
    selectedEntry,
    openDocumentation,
    toggleDocumentationFlag,
    saveDocumentation,
  } = r;
  return (
    <main className="resident-record-content record-documentation-view" ref={contentRef} key="documentation">
      <div className="documentation-page-heading">
        <div>
          <span className="record-section-label">Dokumentation</span>
          <h3>{selectedEntry ? selectedEntry.title : "Neuer Pflegeeintrag"}</h3>
          <p>Die Erfassung bleibt vollständig innerhalb der geöffneten Bewohnerakte.</p>
        </div>
        <button type="button" onClick={() => setActiveView("overview")}>
          <span aria-hidden="true">←</span> Zur Übersicht
        </button>
      </div>

      <div className="documentation-layout">
        <form className="record-card documentation-editor" onSubmit={saveDocumentation}>
          <div className="documentation-form-grid">
            <label>
              <span>Datum</span>
              <CareDatePicker label="Datum" value={documentationDate} onChange={setDocumentationDate} />
            </label>
            <label>
              <span>Uhrzeit</span>
              <input type="time" defaultValue={selectedEntry?.time ?? "08:15"} />
            </label>
            <label>
              <span>Kategorie</span>
              <CareSelect
                label="Kategorie"
                value={documentationCategory}
                options={["Pflegebeobachtung", "Vitalwerte", "Medikation", "Mobilität", "Ernährung", "Übergabe"]}
                onChange={setDocumentationCategory}
              />
            </label>
            <label>
              <span>Dokumentiert von</span>
              <input type="text" value="Anna Meier · Pflegefachfrau HF" readOnly />
            </label>
          </div>

          <label className="documentation-text-field">
            <span>Pflegeeintrag</span>
            <textarea
              value={documentationText}
              onChange={(event) => setDocumentationText(event.target.value)}
              placeholder="Beobachtung, Massnahme und Wirkung dokumentieren …"
            />
          </label>

          <fieldset className="documentation-flags">
            <legend>Kennzeichnung &amp; Weitergabe</legend>
            <p>Markierungen machen den Eintrag in Übergabe, Visite und Schichtübersicht sichtbar.</p>
            <div>
              <button
                className={documentationFlags.includes("important") ? "active important" : ""}
                type="button"
                role="checkbox"
                aria-checked={documentationFlags.includes("important")}
                onClick={() => toggleDocumentationFlag("important")}
              >
                <Warning aria-hidden="true" />
                <span>
                  <strong>Wichtig</strong>
                  <small>Mit erhöhter Priorität anzeigen</small>
                </span>
                <i aria-hidden="true">
                  <Check />
                </i>
              </button>
              <button
                className={documentationFlags.includes("visit") ? "active visit" : ""}
                type="button"
                role="checkbox"
                aria-checked={documentationFlags.includes("visit")}
                onClick={() => toggleDocumentationFlag("visit")}
              >
                <Stethoscope aria-hidden="true" />
                <span>
                  <strong>Wichtig für Visite</strong>
                  <small>Für die nächste Visite vormerken</small>
                </span>
                <i aria-hidden="true">
                  <Check />
                </i>
              </button>
              <button
                className={documentationFlags.includes("observation") ? "active observation" : ""}
                type="button"
                role="checkbox"
                aria-checked={documentationFlags.includes("observation")}
                onClick={() => toggleDocumentationFlag("observation")}
              >
                <Pulse aria-hidden="true" />
                <span>
                  <strong>Beobachtungsphase</strong>
                  <small>Verlauf engmaschig weiterführen</small>
                </span>
                <i aria-hidden="true">
                  <Check />
                </i>
              </button>
              <button
                className={documentationFlags.includes("handover") ? "active handover" : ""}
                type="button"
                role="checkbox"
                aria-checked={documentationFlags.includes("handover")}
                onClick={() => toggleDocumentationFlag("handover")}
              >
                <ArrowsLeftRight aria-hidden="true" />
                <span>
                  <strong>Übergaberelevant</strong>
                  <small>In die nächste Übergabe aufnehmen</small>
                </span>
                <i aria-hidden="true">
                  <Check />
                </i>
              </button>
            </div>
          </fieldset>

          <fieldset className="documentation-tags">
            <legend>Bezug zur Pflegeplanung</legend>
            <div>
              <button className="active" type="button">
                Mobilität
              </button>
              <button type="button">Schmerz</button>
              <button type="button">Medikation</button>
              <button type="button">Ernährung</button>
              <button type="button">Psychosozial</button>
            </div>
          </fieldset>

          <div className="documentation-quality-note">
            <Check aria-hidden="true" />
            <span>
              <strong>Dokumentationsqualität</strong>
              <small>Eintrag ist eindeutig dem Bewohner, Zeitpunkt und Fachbereich zugeordnet.</small>
            </span>
          </div>

          <footer className="documentation-form-actions">
            <button className="secondary-button" type="button" onClick={() => setActiveView("overview")}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit">
              <Check aria-hidden="true" /> {selectedEntry ? "Änderungen speichern" : "Dokumentation speichern"}
            </button>
          </footer>
        </form>

        <aside className="documentation-sidebar">
          <section className="record-card documentation-context">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Kontext</span>
                <h3>{resident.name}</h3>
              </div>
            </div>
            <dl className="record-details">
              <div>
                <dt>Zimmer</dt>
                <dd>{resident.room}</dd>
              </div>
              <div>
                <dt>Wohnbereich</dt>
                <dd>{resident.unit}</dd>
              </div>
              <div>
                <dt>Pflegebedarf</dt>
                <dd>{resident.careLevel}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{resident.statusLabel}</dd>
              </div>
            </dl>
          </section>

          <section className="record-card documentation-recent">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Heute</span>
                <h3>Dokumentationspunkte</h3>
              </div>
            </div>
            <div>
              {entries.map((entry) => (
                <button
                  className={selectedEntryId === entry.id ? "active" : ""}
                  type="button"
                  key={entry.id}
                  onClick={() => openDocumentation(entry)}
                >
                  <time>{entry.time}</time>
                  <span>
                    <strong>{entry.title}</strong>
                    <small>{entry.category}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

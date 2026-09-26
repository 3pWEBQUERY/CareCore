"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { CareDatePicker, CareSelect, formatCareDate } from "@/app/components/care-form-controls";
import { careResidents } from "./care-records-data";

export function CareRecordEditor({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [resident, setResident] = useState("Hans Müller · Zimmer 207");
  const [careLevel, setCareLevel] = useState("Pflegestufe 3");
  const [owner, setOwner] = useState("Anna Meier");
  const [startDate, setStartDate] = useState("2026-09-15");
  const [evaluationDate, setEvaluationDate] = useState("2026-09-29");
  const [template, setTemplate] = useState("Standard Pflegeplanung");
  const [focus, setFocus] = useState("");
  if (!open) return null;
  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section
        className="area-editor-panel care-record-editor-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="care-record-editor-title"
      >
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Bewohner · Pflegeakte</p>
            <h2 id="care-record-editor-title">Pflegeakte erstellen</h2>
            <p>
              Lege eine neue Pflegeakte an und definiere direkt die Zuständigkeit, den Pflegeplan und die erste
              Evaluation.
            </p>
          </div>
          <button
            className="area-editor-close"
            type="button"
            onClick={onClose}
            aria-label="Pflegeakteneditor schliessen"
          >
            ×
          </button>
        </header>
        <form
          className="area-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
            onSuccess(`Pflegeakte für ${resident.split(" · ")[0]} wurde erstellt`);
          }}
        >
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="plan" />
            </span>
            <div>
              <strong>Neue Pflegeakte</strong>
              <p>Die Akte wird mit dem ausgewählten Bewohner verknüpft und für das Team sichtbar.</p>
            </div>
            <span className="duty-assignment-status">
              <i />
              Bereit zum Erstellen
            </span>
          </div>
          <div className="area-editor-grid">
            <label className="area-editor-wide">
              Bewohner
              <CareSelect
                label="Bewohner"
                value={resident}
                options={careResidents.map((person) => `${person.name} · ${person.room}`)}
                onChange={setResident}
              />
            </label>
            <label>
              Pflegestufe
              <CareSelect
                label="Pflegestufe"
                value={careLevel}
                options={["Pflegestufe 1", "Pflegestufe 2", "Pflegestufe 3", "Pflegestufe 4", "Pflegestufe 5"]}
                onChange={setCareLevel}
              />
            </label>
            <label>
              Pflegebeginn
              <CareDatePicker label="Pflegebeginn" value={startDate} onChange={setStartDate} />
            </label>
            <label>
              Bezugspflege
              <CareSelect
                label="Bezugspflege"
                value={owner}
                options={["Anna Meier", "Lea Frei", "Nora Baumann", "Sven Keller"]}
                onChange={setOwner}
              />
            </label>
            <label>
              Erste Evaluation
              <CareDatePicker label="Erste Evaluation" value={evaluationDate} onChange={setEvaluationDate} />
            </label>
            <label className="area-editor-wide">
              Vorlage
              <CareSelect
                label="Vorlage"
                value={template}
                options={["Standard Pflegeplanung", "Demenz & Orientierung", "Sturzprävention", "Palliative Pflege"]}
                onChange={setTemplate}
              />
            </label>
            <label className="area-editor-wide">
              Pflegefokus und erste Ziele
              <textarea
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                placeholder="z. B. Mobilität erhalten, Trinkmenge sichern, Schmerzen beobachten …"
                rows={5}
              />
            </label>
            <fieldset className="area-editor-wide duty-assignment-options">
              <legend>Pflegeakte aktivieren</legend>
              <div className="area-service-options">
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>Im Team freigeben</span>
                </label>
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>Evaluation vormerken</span>
                </label>
                <label>
                  <input type="checkbox" />
                  <span>Medikationsplan verknüpfen</span>
                </label>
              </div>
            </fieldset>
          </div>
          <div className="duty-assignment-summary">
            <span>
              <strong>{resident.split(" · ")[0]}</strong>
              <small>
                {resident.split(" · ")[1]} · {careLevel}
              </small>
            </span>
            <span>
              <strong>Start {formatCareDate(startDate)}</strong>
              <small>
                {owner} · Evaluation {formatCareDate(evaluationDate)}
              </small>
            </span>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit">
              <ModuleIcon name="check" /> Pflegeakte erstellen
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

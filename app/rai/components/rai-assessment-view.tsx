"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { CareDatePicker, CareSelect, formatCareDate } from "@/app/components/care-form-controls";
import { residents, instruments, assessorOptions } from "./rai-data";

export function AssessmentView({ showToast }: { showToast: (message: string) => void }) {
  const [resident, setResident] = useState("Hans Müller · Zimmer 207");
  const [instrument, setInstrument] = useState("interRAI LTCF");
  const [assessor, setAssessor] = useState("Anna Meier");
  const [date, setDate] = useState("2026-09-15");
  const [scores, setScores] = useState<Record<string, string>>({
    Alltag: "2 – Geringe Unterstützung",
    Kognition: "1 – Beobachten",
    Stimmung: "0 – Kein Bedarf",
    Gesundheit: "2 – Geringe Unterstützung",
  });
  const domains = [
    { id: "Alltag", description: "Essen, Körperpflege, Ankleiden und Mobilität" },
    { id: "Kognition", description: "Orientierung, Gedächtnis und Entscheidungsfähigkeit" },
    { id: "Stimmung", description: "Antrieb, Rückzug und psychosoziales Wohlbefinden" },
    { id: "Gesundheit", description: "Schmerz, Haut, Sturzrisiko und klinische Hinweise" },
  ];
  return (
    <section className="rai-assessment-layout">
      <section className="card rai-assessment-form">
        <div className="rai-card-header">
          <div>
            <p className="eyebrow">Neue Erfassung</p>
            <h2 className="card-title">interRAI strukturiert dokumentieren</h2>
            <p className="card-subtitle">Erfasse die Beobachtungen direkt im Kontext der Bewohnerakte.</p>
          </div>
          <span className="status-badge info">Entwurf</span>
        </div>
        <div className="area-editor-grid rai-form-grid">
          <label>
            Bewohner
            <CareSelect
              label="Bewohner"
              value={resident}
              options={residents.map((person) => `${person.name} · ${person.room}`)}
              onChange={setResident}
            />
          </label>
          <label>
            Instrument
            <CareSelect label="Instrument" value={instrument} options={instruments} onChange={setInstrument} />
          </label>
          <label>
            RAI Verantwortliche
            <CareSelect label="RAI Verantwortliche" value={assessor} options={assessorOptions} onChange={setAssessor} />
          </label>
          <label>
            Erfassungsdatum
            <CareDatePicker label="Erfassungsdatum" value={date} onChange={setDate} />
          </label>
        </div>
        <div className="rai-domain-grid">
          {domains.map((domain) => (
            <article className="rai-domain-card" key={domain.id}>
              <div>
                <span className="rai-domain-icon">
                  <ModuleIcon
                    name={
                      domain.id === "Kognition"
                        ? "assess"
                        : domain.id === "Gesundheit"
                          ? "vitals"
                          : domain.id === "Stimmung"
                            ? "pulse"
                            : "tasks"
                    }
                  />
                </span>
                <span>
                  <strong>{domain.id}</strong>
                  <small>{domain.description}</small>
                </span>
              </div>
              <CareSelect
                label={`${domain.id} Einschätzung`}
                value={scores[domain.id]}
                options={[
                  "0 – Kein Bedarf",
                  "1 – Beobachten",
                  "2 – Geringe Unterstützung",
                  "3 – Hoher Unterstützungsbedarf",
                  "4 – Umfassende Unterstützung",
                ]}
                onChange={(value) => setScores((current) => ({ ...current, [domain.id]: value }))}
              />
            </article>
          ))}
        </div>
        <label className="rai-notes-field">
          Fachliche Notiz
          <textarea placeholder="Beobachtungen, Ressourcen und Begründung der Einschätzung …" rows={6} />
        </label>
        <div className="rai-form-footer">
          <span>
            <ModuleIcon name="check" /> Autospeicherung aktiv · letzter Entwurf vor 2 Min.
          </span>
          <button
            className="primary-button"
            type="button"
            onClick={() => showToast(`interRAI-Erfassung für ${resident.split(" · ")[0]} gespeichert`)}
          >
            Erfassung speichern <ModuleIcon name="check" />
          </button>
        </div>
      </section>
      <aside className="rai-assessment-side">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Kontext</p>
              <h2 className="card-title">Erfassungsstatus</h2>
            </div>
          </div>
          <div className="rai-context-list">
            <div>
              <span>Bewohner</span>
              <strong>{resident.split(" · ")[0]}</strong>
            </div>
            <div>
              <span>Instrument</span>
              <strong>{instrument}</strong>
            </div>
            <div>
              <span>Datum</span>
              <strong>{formatCareDate(date)}</strong>
            </div>
            <div>
              <span>Verantwortlich</span>
              <strong>{assessor}</strong>
            </div>
          </div>
        </section>
        <section className="card rai-safety-card">
          <ModuleIcon name="quality" />
          <h2 className="card-title">Fachliche Verantwortung</h2>
          <p>
            Die Einschätzung bleibt ein fachlicher Entwurf, bis sie durch eine berechtigte RAI Verantwortliche
            freigegeben wird.
          </p>
        </section>
      </aside>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import {
  CalendarDots,
  ClipboardText,
  FileText,
  Heartbeat,
  ListChecks,
  NotePencil,
  Pill,
  Pulse,
  User,
  X,
} from "@phosphor-icons/react";

export type ResidentRecordData = {
  initials: string;
  name: string;
  room: string;
  unit: string;
  careLevel: string;
  note: string;
  lastUpdate: string;
  status: "critical" | "attention" | "info" | "stable";
  statusLabel: string;
};

type ResidentRecordProps = {
  resident: ResidentRecordData;
  onClose: () => void;
  onAction: (message: string) => void;
};

const recordTabs = ["Übersicht", "Pflegeakte", "Verlauf", "Dokumente"];

export function ResidentRecord({ resident, onClose, onAction }: ResidentRecordProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <div className="resident-record-layer">
      <article className="resident-record-panel" role="dialog" aria-modal="true" aria-labelledby="resident-record-title">
        <header className="resident-record-header">
          <div className="record-heading">
            <span className={`resident-avatar ${resident.status === "critical" ? "critical" : ""}`}>{resident.initials}</span>
            <div>
              <span className="record-kicker">Bewohnerakte</span>
              <h2 id="resident-record-title">{resident.name}</h2>
              <p>{resident.room} · {resident.unit} · {resident.careLevel}</p>
            </div>
          </div>
          <div className="record-header-actions">
            <span className={`status-badge ${resident.status}`}>{resident.statusLabel}</span>
            <button className="record-close-button" ref={closeButtonRef} type="button" aria-label="Bewohnerakte schliessen" onClick={onClose}><X aria-hidden="true"/></button>
          </div>
        </header>

        <nav className="resident-record-tabs" aria-label="Bereiche der Bewohnerakte">
          {recordTabs.map((tab, index) => <button className={index === 0 ? "active" : ""} type="button" key={tab} onClick={() => index > 0 && onAction(`${tab} geöffnet`)}>{tab}</button>)}
        </nav>

        <main className="resident-record-content">
          <section className="record-metrics" aria-label="Aktenübersicht">
            <div><span className="record-metric-icon"><User aria-hidden="true"/></span><span><small>Bezugspflege</small><strong>Anna Meier</strong></span></div>
            <div><span className="record-metric-icon"><Heartbeat aria-hidden="true"/></span><span><small>Letzte Vitalwerte</small><strong>Heute, 07:42</strong></span></div>
            <div><span className="record-metric-icon"><Pill aria-hidden="true"/></span><span><small>Medikationen heute</small><strong>4 von 6 erfolgt</strong></span></div>
            <div><span className="record-metric-icon"><CalendarDots aria-hidden="true"/></span><span><small>Nächster Termin</small><strong>Arztvisite, 09:30</strong></span></div>
          </section>

          <div className="resident-record-grid">
            <div className="record-primary-column">
              <section className="record-card record-alert-card">
                <div className="record-card-heading"><div><span className="record-section-label">Pflegehinweis</span><h3>Aktuell wichtig</h3></div><span>{resident.lastUpdate}</span></div>
                <div className={`record-clinical-alert ${resident.status}`}><Pulse aria-hidden="true"/><div><strong>{resident.note}</strong><p>Bitte im laufenden Dienst beachten und Veränderungen zeitnah dokumentieren.</p></div></div>
              </section>

              <section className="record-card">
                <div className="record-card-heading"><div><span className="record-section-label">Dokumentation</span><h3>Letzte Einträge</h3></div><button type="button" onClick={() => onAction("Gesamter Verlauf geöffnet")}>Gesamten Verlauf öffnen</button></div>
                <div className="record-history">
                  <div><time>08:00</time><i/><span><strong>Pflegebeobachtung aktualisiert</strong><p>{resident.note}</p><small>Anna Meier · Pflegefachfrau HF</small></span></div>
                  <div><time>07:42</time><i/><span><strong>Vitalwerte erfasst</strong><p>Blutdruck 132/78 mmHg · Puls 72/min · Temperatur 36,7 °C</p><small>Anna Meier · Pflegefachfrau HF</small></span></div>
                  <div><time>07:30</time><i/><span><strong>Medikation verabreicht</strong><p>Morgenmedikation gemäss aktuellem Medikamentenplan.</p><small>Lea Frei · Fachfrau Gesundheit</small></span></div>
                  <div><time>06:55</time><i/><span><strong>Dienstübergabe übernommen</strong><p>Nachtverlauf geprüft, offene Beobachtungen in den Dienstplan übernommen.</p><small>Systemeintrag</small></span></div>
                </div>
              </section>
            </div>

            <aside className="record-secondary-column">
              <section className="record-card">
                <div className="record-card-heading"><div><span className="record-section-label">Direktzugriff</span><h3>Schnellaktionen</h3></div></div>
                <div className="record-quick-actions">
                  <button type="button" onClick={() => onAction("Dokumentation vorbereitet")}><NotePencil aria-hidden="true"/><span><strong>Dokumentieren</strong><small>Neuen Pflegeeintrag erfassen</small></span></button>
                  <button type="button" onClick={() => onAction("Vitalwerterfassung vorbereitet")}><Heartbeat aria-hidden="true"/><span><strong>Vitalwert erfassen</strong><small>Messung dokumentieren</small></span></button>
                  <button type="button" onClick={() => onAction("Pflegeplanung geöffnet")}><ClipboardText aria-hidden="true"/><span><strong>Pflegeplanung</strong><small>Ziele und Massnahmen öffnen</small></span></button>
                  <button type="button" onClick={() => onAction("Aufgabe vorbereitet")}><ListChecks aria-hidden="true"/><span><strong>Aufgabe erstellen</strong><small>Intervention einplanen</small></span></button>
                </div>
              </section>

              <section className="record-card">
                <div className="record-card-heading"><div><span className="record-section-label">Bewohner</span><h3>Stammdaten</h3></div><button type="button" onClick={() => onAction("Stammdaten bearbeiten")}>Bearbeiten</button></div>
                <dl className="record-details">
                  <div><dt>Zimmer</dt><dd>{resident.room}</dd></div>
                  <div><dt>Wohnbereich</dt><dd>{resident.unit}</dd></div>
                  <div><dt>Pflegebedarf</dt><dd>{resident.careLevel}</dd></div>
                  <div><dt>Hausarzt</dt><dd>Dr. med. Martin Weber</dd></div>
                  <div><dt>Eintritt</dt><dd>12. Februar 2024</dd></div>
                  <div><dt>Aktenstatus</dt><dd>Vollständig</dd></div>
                </dl>
              </section>

              <button className="record-document-button" type="button" onClick={() => onAction("Dokumentenablage geöffnet")}><FileText aria-hidden="true"/><span><strong>Dokumente und Berichte</strong><small>12 hinterlegte Dokumente</small></span></button>
            </aside>
          </div>
        </main>
      </article>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CalendarDots,
  Check,
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

type RecordView = "overview" | "documentation";

type DocumentationEntry = {
  id: string;
  time: string;
  title: string;
  text: string;
  author: string;
  category: string;
};

const recordTabs = ["Übersicht", "Dokumentation", "Pflegeakte", "Verlauf", "Dokumente"];

function getDocumentationEntries(resident: ResidentRecordData): DocumentationEntry[] {
  return [
    { id: "observation", time: "08:00", title: "Pflegebeobachtung aktualisiert", text: resident.note, author: "Anna Meier · Pflegefachfrau HF", category: "Pflegebeobachtung" },
    { id: "vitals", time: "07:42", title: "Vitalwerte erfasst", text: "Blutdruck 132/78 mmHg · Puls 72/min · Temperatur 36,7 °C", author: "Anna Meier · Pflegefachfrau HF", category: "Vitalwerte" },
    { id: "medication", time: "07:30", title: "Medikation verabreicht", text: "Morgenmedikation gemäss aktuellem Medikamentenplan.", author: "Lea Frei · Fachfrau Gesundheit", category: "Medikation" },
    { id: "handover", time: "06:55", title: "Dienstübergabe übernommen", text: "Nachtverlauf geprüft, offene Beobachtungen in den Dienstplan übernommen.", author: "Systemeintrag", category: "Übergabe" },
  ];
}

export function ResidentRecord({ resident, onClose, onAction }: ResidentRecordProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const entries = getDocumentationEntries(resident);
  const [activeView, setActiveView] = useState<RecordView>("overview");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [documentationText, setDocumentationText] = useState("");
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeView, selectedEntryId]);

  function openDocumentation(entry?: DocumentationEntry) {
    setSelectedEntryId(entry?.id ?? null);
    setDocumentationText(entry?.text ?? "");
    setActiveView("documentation");
  }

  function selectTab(tab: string) {
    if (tab === "Übersicht") setActiveView("overview");
    else if (tab === "Dokumentation") openDocumentation();
    else onAction(`${tab} geöffnet`);
  }

  function saveDocumentation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAction(selectedEntry ? "Dokumentation aktualisiert" : "Dokumentation gespeichert");
  }

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
          {recordTabs.map((tab) => {
            const active = (tab === "Übersicht" && activeView === "overview") || (tab === "Dokumentation" && activeView === "documentation");
            return <button className={active ? "active" : ""} type="button" key={tab} aria-current={active ? "page" : undefined} onClick={() => selectTab(tab)}>{tab}</button>;
          })}
        </nav>

        {activeView === "overview" ? (
          <main className="resident-record-content" ref={contentRef} key="overview">
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
                  <div className="record-card-heading"><div><span className="record-section-label">Dokumentation</span><h3>Letzte Einträge</h3></div><button type="button" onClick={() => openDocumentation()}>Neue Dokumentation</button></div>
                  <div className="record-history">
                    {entries.map((entry) => <button className="record-history-entry" type="button" key={entry.id} onClick={() => openDocumentation(entry)} aria-label={`${entry.title} öffnen`}><time>{entry.time}</time><i/><span><strong>{entry.title}</strong><p>{entry.text}</p><small>{entry.author}</small></span></button>)}
                  </div>
                </section>
              </div>

              <aside className="record-secondary-column">
                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Direktzugriff</span><h3>Schnellaktionen</h3></div></div>
                  <div className="record-quick-actions">
                    <button type="button" onClick={() => openDocumentation()}><NotePencil aria-hidden="true"/><span><strong>Dokumentieren</strong><small>Neuen Pflegeeintrag erfassen</small></span></button>
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
        ) : (
          <main className="resident-record-content record-documentation-view" ref={contentRef} key="documentation">
            <div className="documentation-page-heading">
              <div><span className="record-section-label">Dokumentation</span><h3>{selectedEntry ? selectedEntry.title : "Neuer Pflegeeintrag"}</h3><p>Die Erfassung bleibt vollständig innerhalb der geöffneten Bewohnerakte.</p></div>
              <button type="button" onClick={() => setActiveView("overview")}><span aria-hidden="true">←</span> Zur Übersicht</button>
            </div>

            <div className="documentation-layout">
              <form className="record-card documentation-editor" onSubmit={saveDocumentation}>
                <div className="documentation-form-grid">
                  <label><span>Datum</span><input type="date" defaultValue="2026-09-09"/></label>
                  <label><span>Uhrzeit</span><input type="time" defaultValue={selectedEntry?.time ?? "08:15"}/></label>
                  <label><span>Kategorie</span><select defaultValue={selectedEntry?.category ?? "Pflegebeobachtung"}><option>Pflegebeobachtung</option><option>Vitalwerte</option><option>Medikation</option><option>Mobilität</option><option>Ernährung</option><option>Übergabe</option></select></label>
                  <label><span>Dokumentiert von</span><input type="text" value="Anna Meier · Pflegefachfrau HF" readOnly/></label>
                </div>

                <label className="documentation-text-field"><span>Pflegeeintrag</span><textarea value={documentationText} onChange={(event) => setDocumentationText(event.target.value)} placeholder="Beobachtung, Massnahme und Wirkung dokumentieren …"/></label>

                <fieldset className="documentation-tags"><legend>Bezug zur Pflegeplanung</legend><div><button className="active" type="button">Mobilität</button><button type="button">Schmerz</button><button type="button">Medikation</button><button type="button">Ernährung</button><button type="button">Psychosozial</button></div></fieldset>

                <div className="documentation-quality-note"><Check aria-hidden="true"/><span><strong>Dokumentationsqualität</strong><small>Eintrag ist eindeutig dem Bewohner, Zeitpunkt und Fachbereich zugeordnet.</small></span></div>

                <footer className="documentation-form-actions"><button className="secondary-button" type="button" onClick={() => setActiveView("overview")}>Abbrechen</button><button className="primary-button" type="submit"><Check aria-hidden="true"/> {selectedEntry ? "Änderungen speichern" : "Dokumentation speichern"}</button></footer>
              </form>

              <aside className="documentation-sidebar">
                <section className="record-card documentation-context">
                  <div className="record-card-heading"><div><span className="record-section-label">Kontext</span><h3>{resident.name}</h3></div></div>
                  <dl className="record-details"><div><dt>Zimmer</dt><dd>{resident.room}</dd></div><div><dt>Wohnbereich</dt><dd>{resident.unit}</dd></div><div><dt>Pflegebedarf</dt><dd>{resident.careLevel}</dd></div><div><dt>Status</dt><dd>{resident.statusLabel}</dd></div></dl>
                </section>

                <section className="record-card documentation-recent">
                  <div className="record-card-heading"><div><span className="record-section-label">Heute</span><h3>Dokumentationspunkte</h3></div></div>
                  <div>{entries.map((entry) => <button className={selectedEntryId === entry.id ? "active" : ""} type="button" key={entry.id} onClick={() => openDocumentation(entry)}><time>{entry.time}</time><span><strong>{entry.title}</strong><small>{entry.category}</small></span></button>)}</div>
                </section>
              </aside>
            </div>
          </main>
        )}
      </article>
    </div>
  );
}

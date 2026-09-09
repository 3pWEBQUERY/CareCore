"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowsLeftRight,
  CalendarDots,
  Check,
  ClipboardText,
  FileText,
  Heartbeat,
  ListChecks,
  NotePencil,
  Pill,
  Pulse,
  Stethoscope,
  User,
  Warning,
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

type RecordView = "overview" | "master-data" | "documentation" | "care-record";
type DocumentationFlag = "important" | "visit" | "observation" | "handover";

type DocumentationEntry = {
  id: string;
  time: string;
  title: string;
  text: string;
  author: string;
  category: string;
};

type CareDomain = {
  id: string;
  label: string;
  status: "critical" | "attention" | "info" | "stable";
  statusLabel: string;
  summary: string;
  goal: string;
  measures: string[];
};

const recordTabs = ["Übersicht", "Stammdaten", "Dokumentation", "Pflegeakte", "Verlauf", "Dokumente"];

const careDomains: CareDomain[] = [
  { id: "mobility", label: "Mobilität & Bewegung", status: "attention", statusLabel: "Beobachten", summary: "Mobilisation mit Rollator und Begleitung. Erhöhtes Sturzrisiko bei Lagewechseln und in der Nacht.", goal: "Sichere Mobilität im Wohnbereich erhalten und weitere Sturzereignisse vermeiden.", measures: ["Transfers mit verbaler Anleitung begleiten", "Rollator vor jedem Aufstehen bereitstellen", "Sturzprophylaxe und neurologische Kontrollen fortführen"] },
  { id: "nutrition", label: "Ernährung & Flüssigkeit", status: "stable", statusLabel: "Stabil", summary: "Normalkost, selbstständige Nahrungsaufnahme. Trinkmenge im vereinbarten Zielbereich.", goal: "Tägliche Flüssigkeitszufuhr von mindestens 1,5 Litern sicherstellen.", measures: ["Getränke sichtbar und erreichbar bereitstellen", "Trinkmenge pro Schicht dokumentieren", "Gewicht wöchentlich kontrollieren"] },
  { id: "cognition", label: "Kognition & Orientierung", status: "info", statusLabel: "Unterstützung", summary: "Zeitlich teilweise desorientiert, örtliche und persönliche Orientierung erhalten.", goal: "Orientierung und Selbstbestimmung im Tagesablauf bestmöglich unterstützen.", measures: ["Tagesstruktur sichtbar kommunizieren", "Kurze und eindeutige Informationen geben", "Biografiebezogene Aktivierung anbieten"] },
  { id: "skin", label: "Haut & Wunden", status: "stable", statusLabel: "Stabil", summary: "Haut intakt, aktuell keine offenen Wunden. Trockene Haut an beiden Unterschenkeln.", goal: "Intakte Haut erhalten und Hauttrockenheit reduzieren.", measures: ["Hautbeobachtung während der Körperpflege", "Unterschenkel morgens und abends eincremen", "Druckstellen unmittelbar dokumentieren"] },
  { id: "elimination", label: "Ausscheidung", status: "stable", statusLabel: "Stabil", summary: "Kontinente Ausscheidung mit selbstständiger Toilettennutzung am Tag.", goal: "Selbstständige Toilettennutzung und regelmäßige Ausscheidung erhalten.", measures: ["Toilettengänge nach Bedarf begleiten", "Ausscheidungsverhalten beobachten", "Veränderungen im Verlauf dokumentieren"] },
  { id: "sleep", label: "Ruhe & Schlaf", status: "attention", statusLabel: "Beobachten", summary: "Unterbrochener Nachtschlaf mit zwei bis drei Wachphasen und nächtlichem Bewegungsdrang.", goal: "Erholsame Ruhephasen fördern und nächtliche Sturzgefährdung reduzieren.", measures: ["Abendritual und Ruhezeiten einhalten", "Nachtlicht und Rufanlage kontrollieren", "Schlafverhalten im Nachtbericht festhalten"] },
];

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
  const [documentationFlags, setDocumentationFlags] = useState<DocumentationFlag[]>([]);
  const [masterDataEditing, setMasterDataEditing] = useState(false);
  const [activeCareDomainId, setActiveCareDomainId] = useState("mobility");
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null;
  const activeCareDomain = careDomains.find((domain) => domain.id === activeCareDomainId) ?? careDomains[0];
  const [firstName, ...lastNameParts] = resident.name.split(" ");
  const lastName = lastNameParts.join(" ");
  const gender = ["Hans", "Peter"].includes(firstName) ? "Männlich" : "Weiblich";

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
    setDocumentationFlags(entry?.id === "observation" ? ["important", "observation"] : entry?.id === "vitals" ? ["visit"] : entry?.id === "handover" ? ["handover"] : []);
    setActiveView("documentation");
  }

  function toggleDocumentationFlag(flag: DocumentationFlag) {
    setDocumentationFlags((current) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]);
  }

  function selectTab(tab: string) {
    if (tab === "Übersicht") setActiveView("overview");
    else if (tab === "Stammdaten") setActiveView("master-data");
    else if (tab === "Dokumentation") openDocumentation();
    else if (tab === "Pflegeakte") setActiveView("care-record");
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
            const active = (tab === "Übersicht" && activeView === "overview") || (tab === "Stammdaten" && activeView === "master-data") || (tab === "Dokumentation" && activeView === "documentation") || (tab === "Pflegeakte" && activeView === "care-record");
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

            <section className="record-card record-quick-access" aria-labelledby="quick-access-title">
              <div className="record-card-heading"><div><span className="record-section-label">Direktzugriff</span><h3 id="quick-access-title">Schnellaktionen</h3></div><span>8 Aktionen</span></div>
              <div className="record-horizontal-actions">
                <button type="button" onClick={() => openDocumentation()}><NotePencil aria-hidden="true"/><span><strong>Dokumentieren</strong><small>Pflegeeintrag</small></span></button>
                <button type="button" onClick={() => onAction("Vitalwerterfassung vorbereitet")}><Heartbeat aria-hidden="true"/><span><strong>Vitalwert</strong><small>Messung erfassen</small></span></button>
                <button type="button" onClick={() => onAction("Medikationsgabe vorbereitet")}><Pill aria-hidden="true"/><span><strong>Medikation</strong><small>Gabe erfassen</small></span></button>
                <button type="button" onClick={() => onAction("Aufgabe vorbereitet")}><ListChecks aria-hidden="true"/><span><strong>Aufgabe</strong><small>Intervention planen</small></span></button>
                <button type="button" onClick={() => setActiveView("care-record")}><ClipboardText aria-hidden="true"/><span><strong>Pflegeplanung</strong><small>Ziele öffnen</small></span></button>
                <button type="button" onClick={() => onAction("Wunddokumentation vorbereitet")}><Pulse aria-hidden="true"/><span><strong>Wunde</strong><small>Status erfassen</small></span></button>
                <button type="button" onClick={() => onAction("Trinkmenge vorbereitet")}><User aria-hidden="true"/><span><strong>Trinkmenge</strong><small>Flüssigkeit erfassen</small></span></button>
                <button type="button" onClick={() => onAction("Neue Einschätzung vorbereitet")}><Stethoscope aria-hidden="true"/><span><strong>Einschätzung</strong><small>Assessment starten</small></span></button>
              </div>
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
                  <div className="record-card-heading"><div><span className="record-section-label">Bewohner</span><h3>Stammdaten</h3></div><button type="button" onClick={() => setActiveView("master-data")}>Alle Stammdaten</button></div>
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
        ) : activeView === "master-data" ? (
          <main className="resident-record-content record-master-data-view" ref={contentRef} key="master-data">
            <div className="master-data-page-heading">
              <div><span className="record-section-label">Bewohnerakte</span><h3>Stammdaten</h3><p>Persönliche, organisatorische und administrative Angaben zu {resident.name}.</p></div>
              <div className="master-data-heading-actions">{masterDataEditing && <button className="secondary-button" type="button" onClick={() => setMasterDataEditing(false)}>Abbrechen</button>}<button className="primary-button" type="button" onClick={() => { if (masterDataEditing) onAction("Stammdaten gespeichert"); setMasterDataEditing((current) => !current); }}>{masterDataEditing ? <><Check aria-hidden="true"/> Änderungen speichern</> : "Stammdaten bearbeiten"}</button></div>
            </div>

            <section className="master-data-status" aria-label="Status der Stammdaten">
              <div><span><Check aria-hidden="true"/></span><p><small>Aktenstatus</small><strong>Vollständig</strong></p></div>
              <div><span><User aria-hidden="true"/></span><p><small>Bewohnernummer</small><strong>CC-2024-0207</strong></p></div>
              <div><span><CalendarDots aria-hidden="true"/></span><p><small>Eintritt</small><strong>12. Februar 2024</strong></p></div>
              <div><span><ClipboardText aria-hidden="true"/></span><p><small>Letzte Prüfung</small><strong>Heute, 08:05</strong></p></div>
            </section>

            <div className="master-data-layout">
              <div className="master-data-primary">
                <section className="record-card master-data-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Person</span><h3>Persönliche Angaben</h3></div></div>
                  <div className="master-data-form-grid">
                    <label><span>Vorname</span><input defaultValue={firstName} readOnly={!masterDataEditing}/></label>
                    <label><span>Nachname</span><input defaultValue={lastName} readOnly={!masterDataEditing}/></label>
                    <label><span>Geburtsdatum</span><input type="date" defaultValue="1940-06-14" readOnly={!masterDataEditing}/></label>
                    <label><span>Geschlecht</span><select defaultValue={gender} disabled={!masterDataEditing}><option>Weiblich</option><option>Männlich</option><option>Divers</option></select></label>
                    <label><span>Zivilstand</span><select defaultValue="Verwitwet" disabled={!masterDataEditing}><option>Ledig</option><option>Verheiratet</option><option>Verwitwet</option><option>Geschieden</option></select></label>
                    <label><span>Bevorzugte Sprache</span><select defaultValue="Deutsch" disabled={!masterDataEditing}><option>Deutsch</option><option>Französisch</option><option>Italienisch</option><option>Englisch</option></select></label>
                    <label><span>AHV-Nummer</span><input defaultValue="756.1234.5678.97" readOnly={!masterDataEditing}/></label>
                    <label><span>Konfession</span><input defaultValue="Reformiert" readOnly={!masterDataEditing}/></label>
                  </div>
                </section>

                <section className="record-card master-data-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Aufenthalt</span><h3>Organisation und Wohnen</h3></div></div>
                  <div className="master-data-form-grid">
                    <label><span>Wohnbereich</span><input defaultValue={resident.unit} readOnly={!masterDataEditing}/></label>
                    <label><span>Zimmer</span><input defaultValue={resident.room} readOnly={!masterDataEditing}/></label>
                    <label><span>Pflegebedarf</span><input defaultValue={resident.careLevel} readOnly={!masterDataEditing}/></label>
                    <label><span>Bezugspflege</span><input defaultValue="Anna Meier" readOnly={!masterDataEditing}/></label>
                    <label><span>Eintrittsdatum</span><input type="date" defaultValue="2024-02-12" readOnly={!masterDataEditing}/></label>
                    <label><span>Eintrittsgrund</span><input defaultValue="Langzeitpflege" readOnly={!masterDataEditing}/></label>
                  </div>
                </section>
              </div>

              <aside className="master-data-secondary">
                <section className="record-card master-data-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Medizin</span><h3>Medizinische Kontakte</h3></div></div>
                  <div className="master-data-form-grid single-column">
                    <label><span>Hausarzt</span><input defaultValue="Dr. med. Martin Weber" readOnly={!masterDataEditing}/></label>
                    <label><span>Hausarztpraxis</span><input defaultValue="Praxis am Stadtpark, Zürich" readOnly={!masterDataEditing}/></label>
                    <label><span>Stammapotheke</span><input defaultValue="Apotheke Sonnengarten" readOnly={!masterDataEditing}/></label>
                  </div>
                </section>

                <section className="record-card master-data-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Notfall</span><h3>Kontaktperson</h3></div></div>
                  <div className="master-data-form-grid single-column">
                    <label><span>Name</span><input defaultValue="Ursula Müller" readOnly={!masterDataEditing}/></label>
                    <label><span>Beziehung</span><input defaultValue="Tochter" readOnly={!masterDataEditing}/></label>
                    <label><span>Telefon</span><input type="tel" defaultValue="+41 79 555 28 14" readOnly={!masterDataEditing}/></label>
                    <label><span>E-Mail</span><input type="email" defaultValue="ursula.mueller@beispiel.ch" readOnly={!masterDataEditing}/></label>
                  </div>
                </section>

                <section className="record-card master-data-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Administration</span><h3>Versicherung</h3></div></div>
                  <div className="master-data-form-grid single-column">
                    <label><span>Krankenversicherung</span><input defaultValue="CSS Versicherung" readOnly={!masterDataEditing}/></label>
                    <label><span>Versichertennummer</span><input defaultValue="80756012345678901234" readOnly={!masterDataEditing}/></label>
                  </div>
                </section>
              </aside>
            </div>
          </main>
        ) : activeView === "care-record" ? (
          <main className="resident-record-content record-care-view" ref={contentRef} key="care-record">
            <div className="care-record-page-heading">
              <div><span className="record-section-label">Pflegeakte</span><h3>Pflegeprofil</h3><p>Pflegerelevante Ressourcen, Risiken, Ziele und Maßnahmen für {resident.name}.</p></div>
              <div className="care-record-heading-actions"><button className="secondary-button" type="button" onClick={() => onAction("Neue Einschätzung vorbereitet")}>Neue Einschätzung</button><button className="primary-button" type="button" onClick={() => onAction("Pflegeplanung geöffnet")}><ClipboardText aria-hidden="true"/> Pflegeplanung öffnen</button></div>
            </div>

            <section className="care-record-status" aria-label="Status der Pflegeakte">
              <div><span><Check aria-hidden="true"/></span><p><small>Pflegeplanung</small><strong>Aktuell und bestätigt</strong></p></div>
              <div><span><Warning aria-hidden="true"/></span><p><small>Offene Risiken</small><strong>2 in Beobachtung</strong></p></div>
              <div><span><ClipboardText aria-hidden="true"/></span><p><small>Aktive Maßnahmen</small><strong>14 geplant</strong></p></div>
              <div><span><CalendarDots aria-hidden="true"/></span><p><small>Nächste Evaluation</small><strong>16. September 2026</strong></p></div>
            </section>

            <div className="care-record-layout">
              <div className="care-record-primary">
                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Pflegeprofil</span><h3>Pflegebereiche</h3></div><span>6 Bereiche</span></div>
                  <div className="care-domain-list">
                    {careDomains.map((domain) => <button className={activeCareDomain.id === domain.id ? "active" : ""} type="button" key={domain.id} aria-pressed={activeCareDomain.id === domain.id} onClick={() => setActiveCareDomainId(domain.id)}><span className="care-domain-icon">{domain.id === "mobility" || domain.id === "sleep" ? <Pulse aria-hidden="true"/> : domain.id === "nutrition" ? <Heartbeat aria-hidden="true"/> : domain.id === "cognition" ? <User aria-hidden="true"/> : <ClipboardText aria-hidden="true"/>}</span><span><strong>{domain.label}</strong><small>{domain.summary}</small></span><span className={`status-badge ${domain.status}`}>{domain.statusLabel}</span></button>)}
                  </div>
                </section>

                <section className="record-card care-domain-detail" aria-live="polite">
                  <div className="record-card-heading"><div><span className="record-section-label">Ausgewählter Pflegebereich</span><h3>{activeCareDomain.label}</h3></div><button type="button" onClick={() => onAction(`${activeCareDomain.label} wird bearbeitet`)}>Bearbeiten</button></div>
                  <div className="care-domain-summary"><span className={`status-badge ${activeCareDomain.status}`}>{activeCareDomain.statusLabel}</span><p>{activeCareDomain.summary}</p></div>
                  <div className="care-goal-grid">
                    <section><span className="care-detail-icon"><Check aria-hidden="true"/></span><div><small>Pflegeziel</small><strong>{activeCareDomain.goal}</strong><p>Evaluation am 16. September 2026</p></div></section>
                    <section><span className="care-detail-icon"><ListChecks aria-hidden="true"/></span><div><small>Geplante Maßnahmen</small><ul>{activeCareDomain.measures.map((measure) => <li key={measure}>{measure}</li>)}</ul></div></section>
                  </div>
                </section>
              </div>

              <aside className="care-record-secondary">
                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Prioritäten</span><h3>Aktuell beachten</h3></div></div>
                  <div className="care-priority-list"><div className="critical"><Warning aria-hidden="true"/><span><strong>Sturzrisiko erhöht</strong><small>Nach Sturzereignis neurologische Kontrollen bis 14:00 Uhr.</small></span></div><div className="attention"><Pulse aria-hidden="true"/><span><strong>Schlaf beobachten</strong><small>Nächtliche Wachphasen und Bewegungsdrang dokumentieren.</small></span></div></div>
                </section>

                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Assessments</span><h3>Aktuelle Einschätzungen</h3></div><button type="button" onClick={() => onAction("Alle Assessments geöffnet")}>Alle anzeigen</button></div>
                  <div className="care-assessment-list"><div><span>Sturzrisiko</span><strong className="critical">Hoch</strong><small>Heute</small></div><div><span>Dekubitusrisiko</span><strong className="stable">Niedrig</strong><small>Gestern</small></div><div><span>Schmerz</span><strong className="attention">NRS 3</strong><small>07:45 Uhr</small></div><div><span>Mangelernährung</span><strong className="stable">Kein Risiko</strong><small>02.09.2026</small></div></div>
                </section>

                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Pflegenetzwerk</span><h3>Beteiligte Fachpersonen</h3></div></div>
                  <div className="care-team-list"><div><span className="avatar">AM</span><p><strong>Anna Meier</strong><small>Bezugspflege · Pflegefachfrau HF</small></p></div><div><span className="avatar">MW</span><p><strong>Dr. Martin Weber</strong><small>Hausarzt</small></p></div><div><span className="avatar">LF</span><p><strong>Lea Frei</strong><small>Fachfrau Gesundheit</small></p></div></div>
                </section>
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

                <fieldset className="documentation-flags"><legend>Kennzeichnung &amp; Weitergabe</legend><p>Markierungen machen den Eintrag in Übergabe, Visite und Schichtübersicht sichtbar.</p><div>
                  <button className={documentationFlags.includes("important") ? "active important" : ""} type="button" role="checkbox" aria-checked={documentationFlags.includes("important")} onClick={() => toggleDocumentationFlag("important")}><Warning aria-hidden="true"/><span><strong>Wichtig</strong><small>Mit erhöhter Priorität anzeigen</small></span><i aria-hidden="true"><Check/></i></button>
                  <button className={documentationFlags.includes("visit") ? "active visit" : ""} type="button" role="checkbox" aria-checked={documentationFlags.includes("visit")} onClick={() => toggleDocumentationFlag("visit")}><Stethoscope aria-hidden="true"/><span><strong>Wichtig für Visite</strong><small>Für die nächste Visite vormerken</small></span><i aria-hidden="true"><Check/></i></button>
                  <button className={documentationFlags.includes("observation") ? "active observation" : ""} type="button" role="checkbox" aria-checked={documentationFlags.includes("observation")} onClick={() => toggleDocumentationFlag("observation")}><Pulse aria-hidden="true"/><span><strong>Beobachtungsphase</strong><small>Verlauf engmaschig weiterführen</small></span><i aria-hidden="true"><Check/></i></button>
                  <button className={documentationFlags.includes("handover") ? "active handover" : ""} type="button" role="checkbox" aria-checked={documentationFlags.includes("handover")} onClick={() => toggleDocumentationFlag("handover")}><ArrowsLeftRight aria-hidden="true"/><span><strong>Übergaberelevant</strong><small>In die nächste Übergabe aufnehmen</small></span><i aria-hidden="true"><Check/></i></button>
                </div></fieldset>

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

"use client";

import { useMemo, useState } from "react";
import ModulePageShell, { ModuleIcon } from "@/app/components/module-page-shell";

type DocumentationStatus = "Alle" | "Entwurf" | "Freigabe" | "Abgeschlossen";
type WoundDocumentation = {
  id: string;
  initials: string;
  resident: string;
  room: string;
  location: string;
  diagnosis: string;
  entry: string;
  created: string;
  owner: string;
  size: string;
  finding: string;
  measure: string;
  status: Exclude<DocumentationStatus, "Alle">;
  tone: "critical" | "attention" | "info" | "stable";
};

const documentationEntries: WoundDocumentation[] = [
  { id: "d1", initials: "HM", resident: "Hans Müller", room: "Zimmer 207", location: "Linker Unterarm", diagnosis: "Hautläsion", entry: "Verbandwechsel & Verlauf", created: "Heute, 07:55", owner: "Lea Frei", size: "2,1 × 0,8 cm", finding: "Wundgrund rosig, Wundrand leicht gerötet. Geringe seröse Exsudation, kein auffälliger Geruch.", measure: "Mit NaCl 0,9 % gereinigt, atraumatische Wundauflage erneuert und Verlauf fotografiert.", status: "Freigabe", tone: "critical" },
  { id: "d2", initials: "MK", resident: "Maria Keller", room: "Zimmer 204", location: "Sakralbereich", diagnosis: "Dekubitus Grad 2", entry: "Zwischenkontrolle", created: "Heute, 06:50", owner: "Anna Meier", size: "3,4 × 2,6 cm", finding: "Wundfläche vital, mässige Exsudation. Umgebungshaut trocken, Druckentlastung wirksam.", measure: "Wundauflage kontrolliert, Lagewechselplan bestätigt. Fotodokumentation für 14:00 terminiert.", status: "Entwurf", tone: "attention" },
  { id: "d3", initials: "EM", resident: "Erika Meier", room: "Zimmer 211", location: "Rechter Unterschenkel", diagnosis: "Ulcus cruris venosum", entry: "Wochenkontrolle", created: "Gestern, 17:20", owner: "Nora Baumann", size: "4,8 × 3,1 cm", finding: "Granulation zunehmend. Wundfläche gegenüber Vorwoche um 8 % reduziert.", measure: "Hydrofaser aufgelegt und Kompressionsverband nach ärztlicher Verordnung erneuert.", status: "Abgeschlossen", tone: "stable" },
  { id: "d4", initials: "RB", resident: "Ruth Baumann", room: "Zimmer 214", location: "Linke Ferse", diagnosis: "Druckstelle Grad 1", entry: "Hautkontrolle", created: "Gestern, 15:40", owner: "Lea Frei", size: "1,2 × 1,0 cm", finding: "Umschriebene Rötung rückläufig, Haut intakt und trocken.", measure: "Ferse konsequent freigelagert, Hautschutz appliziert und Information ans Team übergeben.", status: "Abgeschlossen", tone: "stable" },
  { id: "d5", initials: "PA", resident: "Peter Aebischer", room: "Zimmer 115", location: "Rechter Handrücken", diagnosis: "Skin Tear Kategorie 1", entry: "Erstbeurteilung", created: "8. Sept., 11:15", owner: "Anna Meier", size: "1,7 × 0,9 cm", finding: "Hautlappen vital, geringe Blutung, Umgebung reizlos.", measure: "Hautlappen adaptiert und mit silikonbeschichteter Wundauflage versorgt.", status: "Freigabe", tone: "info" },
];

const statuses: DocumentationStatus[] = ["Alle", "Entwurf", "Freigabe", "Abgeschlossen"];

export default function WoundDocumentationPage() {
  const [status, setStatus] = useState<DocumentationStatus>("Alle");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("d1");

  const filteredEntries = useMemo(() => documentationEntries.filter((entry) => {
    const matchesStatus = status === "Alle" || entry.status === status;
    const searchable = `${entry.resident} ${entry.room} ${entry.location} ${entry.diagnosis} ${entry.entry}`.toLocaleLowerCase("de-CH");
    return matchesStatus && searchable.includes(query.trim().toLocaleLowerCase("de-CH"));
  }), [query, status]);
  const selectedEntry = documentationEntries.find((entry) => entry.id === selectedId) ?? documentationEntries[0];

  return <ModulePageShell activeModule="wounds" activeChild="Dokumentation" pageClass="wound-documentation-page">
    {(showToast) => <main className="workspace module-workspace wounds-workspace">
      <section className="page-heading wounds-heading" aria-labelledby="wound-doc-title"><div className="heading-copy"><p className="eyebrow">CareCore Wounds</p><h1 id="wound-doc-title">Wunddokumentation</h1><p>Befunde, Versorgungen und Fotodokumentationen zentral erfassen und freigeben.</p></div><button className="primary-button" type="button" onClick={() => showToast("Neue Wunddokumentation vorbereitet")}><ModuleIcon name="plus" className="button-icon"/>Neue Dokumentation</button></section>

      <section className="wound-summary" aria-label="Dokumentationsstatus">
        <div><span className="summary-icon"><ModuleIcon name="note"/></span><span><strong>14</strong><small>Einträge diese Woche</small></span></div>
        <div><span className="summary-icon attention"><ModuleIcon name="calendar"/></span><span><strong>3</strong><small>heute fällig</small></span></div>
        <div><span className="summary-icon info"><ModuleIcon name="docs"/></span><span><strong>2</strong><small>Fotodokumentationen</small></span></div>
        <div><span className="summary-icon critical"><ModuleIcon name="alert"/></span><span><strong>1</strong><small>Freigabe ausstehend</small></span></div>
      </section>

      <section className="critical-alert wound-alert" aria-label="Ausstehende Fotodokumentation"><span className="critical-symbol"><ModuleIcon name="alert"/></span><div><strong>Heute abschliessen · Maria Keller</strong><p>Die Fotodokumentation des Dekubitus im Sakralbereich ist bis 14:00 Uhr fällig.</p></div><button className="secondary-button" type="button" onClick={() => { setSelectedId("d2"); showToast("Dokumentation von Maria Keller ausgewählt"); }}>Dokumentation öffnen <ModuleIcon name="chevron" className="button-icon"/></button></section>

      <div className="wound-doc-layout">
        <section className="card wound-doc-directory" aria-labelledby="wound-doc-list-title">
          <div className="wound-doc-toolbar"><div><h2 className="card-title" id="wound-doc-list-title">Dokumentationen</h2><p className="card-subtitle">{filteredEntries.length} von {documentationEntries.length} Einträgen</p></div><label className="resident-search"><ModuleIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner oder Wunde suchen" aria-label="Wunddokumentationen durchsuchen"/></label><div className="wound-status-filter" aria-label="Dokumentationsstatus filtern">{statuses.map((filter) => <button className={status === filter ? "active" : ""} type="button" key={filter} aria-pressed={status === filter} onClick={() => setStatus(filter)}>{filter}</button>)}</div><button className="secondary-button" type="button" onClick={() => showToast("Weitere Dokumentationsfilter geöffnet")}><ModuleIcon name="filter"/>Filter</button></div>
          <div className="wound-doc-table-head" aria-hidden="true"><span>Bewohner &amp; Wunde</span><span>Dokumentation</span><span>Erstellt</span><span>Status</span><span/></div>
          <div className="wound-doc-list">{filteredEntries.map((entry) => <button className={`wound-doc-row ${selectedEntry.id === entry.id ? "selected" : ""}`} type="button" key={entry.id} onClick={() => setSelectedId(entry.id)}>
            <span className={`resident-avatar ${entry.tone === "critical" ? "critical" : ""}`}>{entry.initials}</span><span className="wound-doc-resident"><strong>{entry.resident}</strong><small>{entry.room} · {entry.location}</small><span>{entry.diagnosis} · {entry.size}</span></span><span className="wound-doc-kind"><strong>{entry.entry}</strong><small>{entry.owner}</small></span><span className="wound-doc-date"><strong>{entry.created}</strong><small>Letzte Bearbeitung</small></span><span className={`status-badge ${entry.tone}`}>{entry.status}</span><ModuleIcon name="chevron" className="chevron"/>
          </button>)}{filteredEntries.length === 0 && <div className="resident-empty"><ModuleIcon name="search"/><strong>Keine Dokumentationen gefunden</strong><p>Suchbegriff oder Statusfilter anpassen.</p></div>}</div>
        </section>

        <aside className="wound-doc-sidebar">
          <section className="card wound-doc-detail" aria-live="polite"><div className="card-header"><div><p className="eyebrow">Ausgewählte Dokumentation</p><h2 className="card-title">{selectedEntry.resident}</h2><p className="card-subtitle">{selectedEntry.room} · {selectedEntry.location}</p></div><span className={`status-badge ${selectedEntry.tone}`}>{selectedEntry.status}</span></div><div className="wound-doc-detail-body"><span className={`wound-focus-icon ${selectedEntry.tone}`}><ModuleIcon name="wounds"/></span><h3>{selectedEntry.entry}</h3><p>{selectedEntry.diagnosis} · {selectedEntry.size}</p><section><span>Befund</span><p>{selectedEntry.finding}</p></section><section><span>Massnahmen</span><p>{selectedEntry.measure}</p></section><dl><div><dt>Erstellt</dt><dd>{selectedEntry.created}</dd></div><div><dt>Verantwortlich</dt><dd>{selectedEntry.owner}</dd></div></dl><div className="wound-focus-actions"><button className="primary-button" type="button" onClick={() => showToast(`Dokumentation von ${selectedEntry.resident} geöffnet`)}>Eintrag öffnen</button><button className="secondary-button" type="button" onClick={() => showToast("Wundverlauf zum Ergänzen geöffnet")}>Verlauf ergänzen</button></div></div></section>

          <section className="card wound-doc-tasks"><div className="card-header"><div><h2 className="card-title">Heute dokumentieren</h2><p className="card-subtitle">3 geplante Einträge</p></div></div><div><button type="button" onClick={() => setSelectedId("d2")}><span className="task-check"><ModuleIcon name="check"/></span><span><strong>Fotodokumentation</strong><small>Maria Keller · 14:00</small></span><time>Offen</time></button><button type="button" onClick={() => setSelectedId("d3")}><span className="task-check"><ModuleIcon name="check"/></span><span><strong>Kompressionsverband</strong><small>Erika Meier · 10:30</small></span><time>Geplant</time></button><button type="button" onClick={() => setSelectedId("d5")}><span className="task-check"><ModuleIcon name="check"/></span><span><strong>Wundkontrolle</strong><small>Peter Aebischer · 11:15</small></span><time>Geplant</time></button></div></section>
        </aside>
      </div>
    </main>}
  </ModulePageShell>;
}

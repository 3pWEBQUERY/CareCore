"use client";

import { useMemo, useState } from "react";
import ModulePageShell, { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";

type RecordFilter = "Alle" | "Aktuell" | "Evaluation fällig" | "Entwurf";
type RecordTone = "stable" | "attention" | "info";
type CareResident = {
  id: string;
  initials: string;
  name: string;
  room: string;
  unit: string;
  careLevel: string;
  status: Exclude<RecordFilter, "Alle">;
  tone: RecordTone;
  completeness: number;
  measures: number;
  risks: number;
  evaluation: string;
  focus: string;
  owner: string;
};
type CareDomain = {
  id: string;
  label: string;
  icon: ModuleIconName;
  tone: RecordTone;
  status: string;
  summary: string;
  goal: string;
  measures: string[];
};

const careResidents: CareResident[] = [
  { id: "hm", initials: "HM", name: "Hans Müller", room: "Zimmer 207", unit: "Wohnbereich 2", careLevel: "Pflegestufe 4", status: "Evaluation fällig", tone: "attention", completeness: 96, measures: 14, risks: 2, evaluation: "16. September 2026", focus: "Sturzrisiko und nächtliche Orientierung", owner: "Anna Meier" },
  { id: "mk", initials: "MK", name: "Maria Keller", room: "Zimmer 204", unit: "Wohnbereich 2", careLevel: "Pflegestufe 3", status: "Aktuell", tone: "stable", completeness: 100, measures: 11, risks: 1, evaluation: "28. September 2026", focus: "Diabetesmanagement und Schmerzbeobachtung", owner: "Anna Meier" },
  { id: "em", initials: "EM", name: "Erika Meier", room: "Zimmer 211", unit: "Wohnbereich 2", careLevel: "Pflegestufe 3", status: "Aktuell", tone: "stable", completeness: 98, measures: 12, risks: 1, evaluation: "2. Oktober 2026", focus: "Medikationsanpassung und Wundversorgung", owner: "Nora Baumann" },
  { id: "rb", initials: "RB", name: "Ruth Baumann", room: "Zimmer 214", unit: "Wohnbereich 2", careLevel: "Pflegestufe 2", status: "Aktuell", tone: "stable", completeness: 100, measures: 8, risks: 1, evaluation: "7. Oktober 2026", focus: "Mobilität und Druckstellenprophylaxe", owner: "Lea Frei" },
  { id: "pa", initials: "PA", name: "Peter Aebischer", room: "Zimmer 115", unit: "Wohnbereich 1", careLevel: "Pflegestufe 2", status: "Evaluation fällig", tone: "attention", completeness: 91, measures: 9, risks: 2, evaluation: "Heute", focus: "Flüssigkeitsmanagement und Hautschutz", owner: "Lea Frei" },
  { id: "as", initials: "AS", name: "Anna Schmid", room: "Zimmer 118", unit: "Wohnbereich 1", careLevel: "Pflegestufe 1", status: "Aktuell", tone: "stable", completeness: 100, measures: 6, risks: 0, evaluation: "18. Oktober 2026", focus: "Selbstständigkeit und sichere Mobilität", owner: "Nora Baumann" },
  { id: "wb", initials: "WB", name: "Walter Brunner", room: "Zimmer 306", unit: "Wohnbereich 3", careLevel: "Pflegestufe 3", status: "Entwurf", tone: "info", completeness: 72, measures: 7, risks: 2, evaluation: "Nach Eintritt abschließen", focus: "Eintrittsassessment und Pflegeplanung", owner: "Nora Baumann" },
  { id: "bk", initials: "BK", name: "Bernhard Koch", room: "Zimmer 012", unit: "Pflegewohngruppe", careLevel: "Pflegestufe 4", status: "Evaluation fällig", tone: "attention", completeness: 94, measures: 16, risks: 3, evaluation: "13. September 2026", focus: "Kognition, Unruhe und Tagesstruktur", owner: "Sven Keller" },
];

const careDomains: CareDomain[] = [
  { id: "mobility", label: "Mobilität & Bewegung", icon: "pulse", tone: "attention", status: "Beobachten", summary: "Mobilisation mit Rollator und Begleitung. Erhöhtes Sturzrisiko bei Lagewechseln und in der Nacht.", goal: "Sichere Mobilität im Wohnbereich erhalten und weitere Sturzereignisse vermeiden.", measures: ["Transfers mit verbaler Anleitung begleiten", "Rollator vor jedem Aufstehen bereitstellen", "Sturzprophylaxe konsequent fortführen"] },
  { id: "nutrition", label: "Ernährung & Flüssigkeit", icon: "nutrition", tone: "stable", status: "Stabil", summary: "Normalkost, selbstständige Nahrungsaufnahme. Trinkmenge im vereinbarten Zielbereich.", goal: "Tägliche Flüssigkeitszufuhr von mindestens 1,5 Litern sicherstellen.", measures: ["Getränke sichtbar bereitstellen", "Trinkmenge pro Schicht dokumentieren", "Gewicht wöchentlich kontrollieren"] },
  { id: "cognition", label: "Kognition & Orientierung", icon: "assess", tone: "info", status: "Unterstützung", summary: "Zeitlich teilweise desorientiert, örtliche und persönliche Orientierung erhalten.", goal: "Orientierung und Selbstbestimmung im Tagesablauf bestmöglich unterstützen.", measures: ["Tagesstruktur sichtbar kommunizieren", "Kurze und eindeutige Informationen geben", "Biografiebezogene Aktivierung anbieten"] },
  { id: "skin", label: "Haut & Wunden", icon: "wounds", tone: "attention", status: "Beobachten", summary: "Hautläsion am linken Unterarm in Behandlung. Trockene Haut an beiden Unterschenkeln.", goal: "Wundheilung fördern und weitere Hautschädigungen vermeiden.", measures: ["Wundversorgung nach aktuellem Standard", "Hautbeobachtung bei jeder Körperpflege", "Druckstellen unmittelbar dokumentieren"] },
  { id: "elimination", label: "Ausscheidung", icon: "note", tone: "stable", status: "Stabil", summary: "Kontinente Ausscheidung mit selbstständiger Toilettennutzung am Tag.", goal: "Selbstständige Toilettennutzung und regelmäßige Ausscheidung erhalten.", measures: ["Toilettengänge nach Bedarf begleiten", "Ausscheidungsverhalten beobachten", "Veränderungen im Verlauf dokumentieren"] },
  { id: "sleep", label: "Ruhe & Schlaf", icon: "vitals", tone: "attention", status: "Beobachten", summary: "Unterbrochener Nachtschlaf mit zwei bis drei Wachphasen und nächtlichem Bewegungsdrang.", goal: "Erholsame Ruhephasen fördern und nächtliche Sturzgefährdung reduzieren.", measures: ["Abendritual und Ruhezeiten einhalten", "Nachtlicht und Rufanlage kontrollieren", "Schlafverhalten im Nachtbericht festhalten"] },
];

const recordFilters: RecordFilter[] = ["Alle", "Aktuell", "Evaluation fällig", "Entwurf"];

export default function CareRecordsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RecordFilter>("Alle");
  const [selectedResidentId, setSelectedResidentId] = useState("hm");
  const [selectedDomainId, setSelectedDomainId] = useState("mobility");

  const filteredResidents = useMemo(() => careResidents.filter((resident) => {
    const matchesFilter = filter === "Alle" || resident.status === filter;
    const searchable = `${resident.name} ${resident.room} ${resident.unit} ${resident.careLevel} ${resident.focus}`.toLocaleLowerCase("de-CH");
    return matchesFilter && searchable.includes(query.trim().toLocaleLowerCase("de-CH"));
  }), [filter, query]);
  const selectedResident = careResidents.find((resident) => resident.id === selectedResidentId) ?? careResidents[0];
  const selectedDomain = careDomains.find((domain) => domain.id === selectedDomainId) ?? careDomains[0];

  return <ModulePageShell activeModule="residents" activeChild="Pflegeakte" pageClass="care-records-page" locationSecondary="Gesamtes Haus · alle Wohnbereiche">
    {(showToast) => <main className="workspace module-workspace">
      <section className="page-heading care-page-heading" aria-labelledby="care-records-title"><div className="heading-copy"><p className="eyebrow">CareCore Bewohner</p><h1 id="care-records-title">Pflegeakten</h1><p>Pflegeprofile, Ziele, Maßnahmen und Evaluationen aller aktiven Bewohner.</p></div><button className="primary-button" type="button" onClick={() => showToast("Neue Pflegeakte wird vorbereitet")}><ModuleIcon name="plus" className="button-icon"/>Pflegeakte erstellen</button></section>

      <section className="wound-summary" aria-label="Status der Pflegeakten">
        <div><span className="summary-icon"><ModuleIcon name="residents"/></span><span><strong>48</strong><small>aktive Pflegeakten</small></span></div>
        <div><span className="summary-icon"><ModuleIcon name="check"/></span><span><strong>42</strong><small>vollständig &amp; aktuell</small></span></div>
        <div><span className="summary-icon attention"><ModuleIcon name="calendar"/></span><span><strong>4</strong><small>Evaluationen fällig</small></span></div>
        <div><span className="summary-icon info"><ModuleIcon name="note"/></span><span><strong>2</strong><small>Planungen im Entwurf</small></span></div>
      </section>

      <section className="critical-alert care-evaluation-alert" aria-label="Fällige Pflegeevaluation"><span className="critical-symbol"><ModuleIcon name="alert"/></span><div><strong>Heute evaluieren · Peter Aebischer</strong><p>Die Pflegeziele für Flüssigkeitsmanagement und Hautschutz sind heute zur Evaluation fällig.</p></div><button className="secondary-button" type="button" onClick={() => { setSelectedResidentId("pa"); showToast("Pflegeakte von Peter Aebischer ausgewählt"); }}>Pflegeakte auswählen <ModuleIcon name="chevron" className="button-icon"/></button></section>

      <div className="care-page-layout">
        <section className="card care-resident-browser" aria-labelledby="care-resident-list-title">
          <div className="care-resident-toolbar"><div><h2 className="card-title" id="care-resident-list-title">Bewohner</h2><p className="card-subtitle">{filteredResidents.length} von {careResidents.length} Demo-Akten</p></div><label className="resident-search"><ModuleIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner oder Pflegefokus" aria-label="Pflegeakten durchsuchen"/></label><div className="care-record-filters" aria-label="Pflegeaktenstatus filtern">{recordFilters.map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
          <div className="care-resident-list">{filteredResidents.map((resident) => <button className={`care-resident-row ${selectedResident.id === resident.id ? "selected" : ""}`} type="button" key={resident.id} onClick={() => setSelectedResidentId(resident.id)}><span className="resident-avatar">{resident.initials}</span><span><strong>{resident.name}</strong><small>{resident.room} · {resident.unit}</small><em>{resident.focus}</em></span><span className={`status-badge ${resident.tone}`}>{resident.status}</span><ModuleIcon name="chevron"/></button>)}{filteredResidents.length === 0 && <div className="resident-empty"><ModuleIcon name="search"/><strong>Keine Pflegeakten gefunden</strong><p>Suchbegriff oder Statusfilter anpassen.</p></div>}</div>
        </section>

        <section className="care-profile-workspace" aria-live="polite">
          <section className="card care-profile-header"><div className="care-profile-identity"><span className="resident-avatar">{selectedResident.initials}</span><div><p className="eyebrow">Ausgewählte Pflegeakte</p><h2>{selectedResident.name}</h2><span>{selectedResident.room} · {selectedResident.unit} · {selectedResident.careLevel}</span></div></div><div className="care-profile-actions"><span className={`status-badge ${selectedResident.tone}`}>{selectedResident.status}</span><button className="secondary-button" type="button" onClick={() => showToast("Neue Einschätzung vorbereitet")}>Neue Einschätzung</button><button className="primary-button" type="button" onClick={() => showToast(`Pflegeplanung von ${selectedResident.name} geöffnet`)}>Pflegeplanung öffnen</button></div></section>

          <section className="care-record-status" aria-label={`Status der Pflegeakte von ${selectedResident.name}`}><div><span><ModuleIcon name="check"/></span><p><small>Vollständigkeit</small><strong>{selectedResident.completeness}% dokumentiert</strong></p></div><div><span><ModuleIcon name="alert"/></span><p><small>Offene Risiken</small><strong>{selectedResident.risks} in Beobachtung</strong></p></div><div><span><ModuleIcon name="tasks"/></span><p><small>Aktive Maßnahmen</small><strong>{selectedResident.measures} geplant</strong></p></div><div><span><ModuleIcon name="calendar"/></span><p><small>Nächste Evaluation</small><strong>{selectedResident.evaluation}</strong></p></div></section>

          <div className="care-profile-grid">
            <div className="care-record-primary">
              <section className="card"><div className="card-header"><div><p className="eyebrow">Pflegeprofil</p><h2 className="card-title">Pflegebereiche</h2><p className="card-subtitle">6 Bereiche der aktuellen Pflegeplanung</p></div></div><div className="care-domain-list">{careDomains.map((domain) => <button className={selectedDomain.id === domain.id ? "active" : ""} type="button" key={domain.id} aria-pressed={selectedDomain.id === domain.id} onClick={() => setSelectedDomainId(domain.id)}><span className="care-domain-icon"><ModuleIcon name={domain.icon}/></span><span><strong>{domain.label}</strong><small>{domain.summary}</small></span><span className={`status-badge ${domain.tone}`}>{domain.status}</span></button>)}</div></section>

              <section className="card care-domain-detail"><div className="card-header"><div><p className="eyebrow">Ausgewählter Pflegebereich</p><h2 className="card-title">{selectedDomain.label}</h2></div><button className="quiet-button" type="button" onClick={() => showToast(`${selectedDomain.label} wird bearbeitet`)}>Bearbeiten</button></div><div className="care-domain-summary"><span className={`status-badge ${selectedDomain.tone}`}>{selectedDomain.status}</span><p>{selectedDomain.summary}</p></div><div className="care-goal-grid"><section><span className="care-detail-icon"><ModuleIcon name="check"/></span><div><small>Pflegeziel</small><strong>{selectedDomain.goal}</strong><p>Evaluation: {selectedResident.evaluation}</p></div></section><section><span className="care-detail-icon"><ModuleIcon name="tasks"/></span><div><small>Geplante Maßnahmen</small><ul>{selectedDomain.measures.map((measure) => <li key={measure}>{measure}</li>)}</ul></div></section></div></section>
            </div>

            <aside className="care-record-secondary"><section className="card"><div className="card-header"><div><p className="eyebrow">Prioritäten</p><h2 className="card-title">Aktuell beachten</h2></div></div><div className="care-priority-list"><div className="critical"><ModuleIcon name="alert"/><span><strong>{selectedResident.focus}</strong><small>Im laufenden Dienst beobachten und Veränderungen zeitnah dokumentieren.</small></span></div><div className="attention"><ModuleIcon name="pulse"/><span><strong>Evaluation im Blick</strong><small>Nächster Termin: {selectedResident.evaluation}</small></span></div></div></section><section className="card"><div className="card-header"><div><p className="eyebrow">Pflegenetzwerk</p><h2 className="card-title">Verantwortliche Personen</h2></div></div><div className="care-team-list"><div><span className="avatar">{selectedResident.owner.split(" ").map((part) => part[0]).join("")}</span><p><strong>{selectedResident.owner}</strong><small>Bezugspflege · Pflegefachperson</small></p></div><div><span className="avatar">MW</span><p><strong>Dr. Martin Weber</strong><small>Hausarzt</small></p></div><div><span className="avatar">LF</span><p><strong>Lea Frei</strong><small>Fachfrau Gesundheit</small></p></div></div></section></aside>
          </div>
        </section>
      </div>
    </main>}
  </ModulePageShell>;
}

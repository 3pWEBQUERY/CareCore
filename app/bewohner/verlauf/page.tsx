"use client";

import { useMemo, useState } from "react";
import ModulePageShell, { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";

type ResidentStatus = "Alle" | "Aktiv" | "Verlegt" | "Ausgetreten" | "Verstorben";
type ResidentTone = "critical" | "attention" | "info" | "stable" | "archived";
type HouseResident = {
  id: string;
  initials: string;
  name: string;
  room: string;
  unit: string;
  status: Exclude<ResidentStatus, "Alle">;
  tone: ResidentTone;
  period: string;
  lastEntry: string;
  lastEntryAt: string;
  author: string;
  note: string;
  icon: ModuleIconName;
};

const residents: HouseResident[] = [
  { id: "r01", initials: "HM", name: "Hans Müller", room: "Zimmer 207", unit: "Wohnbereich 2", status: "Aktiv", tone: "critical", period: "Eintritt 12.03.2024", lastEntry: "Neurologische Kontrolle nach Sturz", lastEntryAt: "Heute, 08:12", author: "Anna Meier", note: "Engmaschige Beobachtung bis 14:00 Uhr weiterführen.", icon: "alert" },
  { id: "r02", initials: "MK", name: "Maria Keller", room: "Zimmer 204", unit: "Wohnbereich 2", status: "Aktiv", tone: "attention", period: "Eintritt 06.11.2023", lastEntry: "Blutzucker vor Frühstück erfasst", lastEntryAt: "Heute, 07:42", author: "Anna Meier", note: "Korrekturschema gemäss Verordnung angewendet.", icon: "vitals" },
  { id: "r03", initials: "EM", name: "Erika Meier", room: "Zimmer 211", unit: "Wohnbereich 2", status: "Aktiv", tone: "attention", period: "Eintritt 19.08.2022", lastEntry: "Morgenmedikation angepasst", lastEntryAt: "Heute, 07:30", author: "Nora Baumann", note: "Verträglichkeit der neuen Metoprolol-Dosierung beobachten.", icon: "med" },
  { id: "r04", initials: "RB", name: "Ruth Baumann", room: "Zimmer 214", unit: "Wohnbereich 2", status: "Aktiv", tone: "stable", period: "Eintritt 24.01.2025", lastEntry: "Morgenpflege abgeschlossen", lastEntryAt: "Heute, 06:50", author: "Nora Baumann", note: "Mobilisation mit Rollator sicher, Hautzustand unverändert.", icon: "note" },
  { id: "r05", initials: "PA", name: "Peter Aebischer", room: "Zimmer 115", unit: "Wohnbereich 1", status: "Aktiv", tone: "stable", period: "Eintritt 02.05.2025", lastEntry: "Trinkprotokoll ergänzt", lastEntryAt: "Heute, 07:10", author: "Lea Frei", note: "180 ml zum Frühstück getrunken, weiter motivieren.", icon: "nutrition" },
  { id: "r06", initials: "AS", name: "Anna Schmid", room: "Zimmer 118", unit: "Wohnbereich 1", status: "Aktiv", tone: "stable", period: "Eintritt 17.02.2026", lastEntry: "Mobilisation dokumentiert", lastEntryAt: "Gestern, 19:40", author: "Lea Frei", note: "Selbstständig mit Gehstock auf dem Wohnbereich.", icon: "tasks" },
  { id: "r07", initials: "WB", name: "Walter Brunner", room: "Zimmer 306", unit: "Wohnbereich 3", status: "Aktiv", tone: "info", period: "Eintritt 09.09.2026", lastEntry: "Eintrittsassessment abgeschlossen", lastEntryAt: "Gestern, 16:25", author: "Nora Baumann", note: "Pflegeplanung zur interprofessionellen Freigabe vorbereitet.", icon: "assess" },
  { id: "r08", initials: "LF", name: "Lydia Frei", room: "Zimmer 309", unit: "Wohnbereich 3", status: "Aktiv", tone: "stable", period: "Eintritt 14.06.2021", lastEntry: "Schmerzassessment ohne Auffälligkeit", lastEntryAt: "Gestern, 14:10", author: "Anna Meier", note: "NRS 0 in Ruhe und bei Mobilisation.", icon: "assess" },
  { id: "r09", initials: "BK", name: "Bernhard Koch", room: "Zimmer 012", unit: "Pflegewohngruppe", status: "Aktiv", tone: "attention", period: "Eintritt 30.10.2024", lastEntry: "Unruhe am Nachmittag beobachtet", lastEntryAt: "Gestern, 17:45", author: "Sven Keller", note: "Biografieorientierte Begleitung wirksam, keine Bedarfsmedikation.", icon: "note" },
  { id: "r10", initials: "ZG", name: "Zora Graf", room: "Zimmer 015", unit: "Pflegewohngruppe", status: "Aktiv", tone: "stable", period: "Eintritt 11.04.2023", lastEntry: "Essbegleitung dokumentiert", lastEntryAt: "Gestern, 12:35", author: "Sven Keller", note: "Dreiviertel der Mahlzeit selbstständig eingenommen.", icon: "nutrition" },
  { id: "r11", initials: "ES", name: "Elisabeth Sommer", room: "Neu: Zimmer 312", unit: "Wohnbereich 3", status: "Verlegt", tone: "info", period: "Verlegt am 08.09.2026", lastEntry: "Interne Verlegung abgeschlossen", lastEntryAt: "8. Sept., 10:15", author: "Lea Frei", note: "Von Wohnbereich 1 nach Wohnbereich 3 verlegt; Übergabe vollständig.", icon: "handover" },
  { id: "r12", initials: "KH", name: "Kurt Hofer", room: "Ehem. Zimmer 108", unit: "Wohnbereich 1", status: "Ausgetreten", tone: "archived", period: "Austritt 31.08.2026", lastEntry: "Austrittsbericht freigegeben", lastEntryAt: "31. Aug., 15:20", author: "Anna Meier", note: "Rückkehr nach Hause mit Spitex-Anschluss; Akte vollständig archiviert.", icon: "docs" },
  { id: "r13", initials: "MG", name: "Marlies Gasser", room: "Ehem. Zimmer 303", unit: "Wohnbereich 3", status: "Ausgetreten", tone: "archived", period: "Austritt 14.08.2026", lastEntry: "Übertrittsdokumentation versendet", lastEntryAt: "14. Aug., 11:05", author: "Nora Baumann", note: "Übertritt in Rehabilitationsklinik, Unterlagen vollständig übermittelt.", icon: "docs" },
  { id: "r14", initials: "HF", name: "Heidi Furrer", room: "Ehem. Zimmer 009", unit: "Pflegewohngruppe", status: "Ausgetreten", tone: "archived", period: "Austritt 02.07.2026", lastEntry: "Austrittsmedikation abgeglichen", lastEntryAt: "2. Juli, 09:30", author: "Lea Frei", note: "Übertritt in betreutes Wohnen; Abschlusskontrolle erfolgt.", icon: "med" },
  { id: "r15", initials: "AR", name: "Alfred Roth", room: "Ehem. Zimmer 202", unit: "Wohnbereich 2", status: "Verstorben", tone: "archived", period: "Verstorben 22.08.2026", lastEntry: "Pflegeabschluss dokumentiert", lastEntryAt: "22. Aug., 06:40", author: "Anna Meier", note: "Abschied und administrative Nachbearbeitung abgeschlossen; Akte geschützt archiviert.", icon: "docs" },
  { id: "r16", initials: "JS", name: "Johanna Suter", room: "Ehem. Zimmer 305", unit: "Wohnbereich 3", status: "Verstorben", tone: "archived", period: "Verstorben 18.06.2026", lastEntry: "Abschlussgespräch dokumentiert", lastEntryAt: "19. Juni, 14:00", author: "Nora Baumann", note: "Abschlussgespräch mit Angehörigen erfolgt; Akte geschützt archiviert.", icon: "docs" },
];

const statuses: ResidentStatus[] = ["Alle", "Aktiv", "Verlegt", "Ausgetreten", "Verstorben"];
const units = ["Gesamtes Haus", "Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Pflegewohngruppe"];

export default function ResidentHistoryPage() {
  const [status, setStatus] = useState<ResidentStatus>("Alle");
  const [unit, setUnit] = useState("Gesamtes Haus");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("r01");

  const filteredResidents = useMemo(() => residents.filter((resident) => {
    const matchesStatus = status === "Alle" || resident.status === status;
    const matchesUnit = unit === "Gesamtes Haus" || resident.unit === unit;
    const searchable = `${resident.name} ${resident.room} ${resident.unit} ${resident.status} ${resident.lastEntry} ${resident.note}`.toLocaleLowerCase("de-CH");
    return matchesStatus && matchesUnit && searchable.includes(query.trim().toLocaleLowerCase("de-CH"));
  }), [query, status, unit]);
  const selectedResident = residents.find((resident) => resident.id === selectedId) ?? residents[0];
  const activeCount = residents.filter((resident) => resident.status === "Aktiv").length;
  const departedCount = residents.filter((resident) => resident.status === "Ausgetreten").length;
  const deceasedCount = residents.filter((resident) => resident.status === "Verstorben").length;
  const isArchived = selectedResident.status === "Ausgetreten" || selectedResident.status === "Verstorben";

  function resetFilters() {
    setStatus("Alle");
    setUnit("Gesamtes Haus");
    setQuery("");
  }

  return <ModulePageShell activeModule="residents" activeChild="Verlauf" pageClass="resident-history-page" locationSecondary="Gesamtes Haus · alle Wohnbereiche">
    {(showToast) => <main className="workspace module-workspace">
      <section className="page-heading residents-heading" aria-labelledby="resident-history-title"><div className="heading-copy"><p className="eyebrow">CareCore Bewohner</p><h1 id="resident-history-title">Bewohnerverlauf &amp; Archiv</h1><p>Alle aktiven und ehemaligen Bewohnerakten des gesamten Hauses an einem Ort.</p></div><button className="primary-button" type="button" onClick={() => showToast("Hausweiter Bericht wird vorbereitet")}><ModuleIcon name="docs" className="button-icon"/>Hausbericht erstellen</button></section>

      <section className="wound-summary" aria-label="Hausweite Bewohnerübersicht">
        <div><span className="summary-icon"><ModuleIcon name="residents"/></span><span><strong>{residents.length}</strong><small>Bewohnerakten gesamt</small></span></div>
        <div><span className="summary-icon"><ModuleIcon name="check"/></span><span><strong>{activeCount}</strong><small>aktuell im Haus</small></span></div>
        <div><span className="summary-icon info"><ModuleIcon name="handover"/></span><span><strong>{departedCount}</strong><small>ausgetreten</small></span></div>
        <div><span className="summary-icon archived"><ModuleIcon name="docs"/></span><span><strong>{deceasedCount}</strong><small>verstorben · archiviert</small></span></div>
      </section>

      <section className="house-scope-note" aria-label="Umfang der Ansicht"><span><ModuleIcon name="building"/></span><div><strong>Gesamtes Haus</strong><p>Die Ansicht umfasst alle Wohnbereiche sowie aktive, verlegte, ausgetretene und verstorbene Bewohner.</p></div><button className="quiet-button" type="button" onClick={resetFilters}>Alle Filter zurücksetzen</button></section>

      <div className="house-history-layout">
        <section className="card house-resident-directory" aria-labelledby="house-residents-title">
          <div className="house-history-toolbar"><div><h2 className="card-title" id="house-residents-title">Bewohnerakten</h2><p className="card-subtitle">{filteredResidents.length} von {residents.length} Akten angezeigt</p></div><label className="resident-search"><ModuleIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Zimmer oder Eintrag suchen" aria-label="Alle Bewohnerakten durchsuchen"/></label><label className="house-unit-filter"><span>Wohnbereich</span><select value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Wohnbereich filtern">{units.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><div className="house-status-filters" aria-label="Aktenstatus filtern">{statuses.map((item) => <button className={status === item ? "active" : ""} type="button" key={item} aria-pressed={status === item} onClick={() => setStatus(item)}>{item}</button>)}</div></div>
          <div className="house-resident-table-head" aria-hidden="true"><span>Bewohner</span><span>Wohnbereich</span><span>Aufenthalt</span><span>Letzter Eintrag</span><span>Status</span><span/></div>
          <div className="house-resident-list">{filteredResidents.map((resident) => <button className={`house-resident-row ${selectedResident.id === resident.id ? "selected" : ""}`} type="button" key={resident.id} onClick={() => setSelectedId(resident.id)}>
            <span className={`resident-avatar ${resident.tone === "critical" ? "critical" : resident.tone === "archived" ? "archived" : ""}`}>{resident.initials}</span><span className="house-resident-person"><strong>{resident.name}</strong><small>{resident.room}</small></span><span className="house-resident-unit"><strong>{resident.unit}</strong><small>{resident.status === "Aktiv" ? "Aktueller Aufenthalt" : "Letzter Wohnbereich"}</small></span><span className="house-resident-period"><strong>{resident.period}</strong><small>{resident.status === "Aktiv" ? "Laufende Akte" : "Historische Akte"}</small></span><span className="house-resident-last"><strong>{resident.lastEntry}</strong><small>{resident.lastEntryAt} · {resident.author}</small></span><span className={`resident-state ${resident.status.toLocaleLowerCase("de-CH")}`}>{resident.status}</span><ModuleIcon name="chevron" className="chevron"/>
          </button>)}{filteredResidents.length === 0 && <div className="resident-empty"><ModuleIcon name="search"/><strong>Keine Bewohnerakten gefunden</strong><p>Suchbegriff, Wohnbereich oder Statusfilter anpassen.</p><button className="secondary-button" type="button" onClick={resetFilters}>Filter zurücksetzen</button></div>}</div>
        </section>

        <aside className="house-history-sidebar">
          <section className={`card house-resident-focus ${isArchived ? "archived" : ""}`} aria-live="polite"><div className="card-header"><div><p className="eyebrow">Ausgewählte Bewohnerakte</p><h2 className="card-title">{selectedResident.name}</h2><p className="card-subtitle">{selectedResident.room} · {selectedResident.unit}</p></div><span className={`resident-state ${selectedResident.status.toLocaleLowerCase("de-CH")}`}>{selectedResident.status}</span></div><div className="house-resident-focus-body"><span className={`resident-avatar ${selectedResident.tone === "critical" ? "critical" : selectedResident.tone === "archived" ? "archived" : ""}`}>{selectedResident.initials}</span><h3>{selectedResident.lastEntry}</h3><p>{selectedResident.note}</p><dl><div><dt>Aktenstatus</dt><dd>{selectedResident.status}</dd></div><div><dt>Zeitraum</dt><dd>{selectedResident.period}</dd></div><div><dt>Letzter Eintrag</dt><dd>{selectedResident.lastEntryAt}</dd></div><div><dt>Erfasst von</dt><dd>{selectedResident.author}</dd></div></dl>{isArchived && <div className="archive-privacy-note"><ModuleIcon name="quality"/><span><strong>Geschützte Archivakte</strong><small>Nur für berechtigte Mitarbeitende sichtbar.</small></span></div>}<div className="course-focus-actions"><button className="primary-button" type="button" onClick={() => showToast(`${isArchived ? "Archivakte" : "Bewohnerakte"} von ${selectedResident.name} geöffnet`)}>{isArchived ? "Archivakte öffnen" : "Bewohnerakte öffnen"}</button><button className="secondary-button" type="button" onClick={() => showToast(isArchived ? "Archivierte Dokumente geöffnet" : "Verlauf zum Ergänzen geöffnet")}>{isArchived ? "Dokumente anzeigen" : "Verlauf ergänzen"}</button></div></div></section>

          <section className="card house-status-overview"><div className="card-header"><div><h2 className="card-title">Akten nach Status</h2><p className="card-subtitle">Gesamtes Haus</p></div></div><div>{statuses.slice(1).map((item) => { const count = residents.filter((resident) => resident.status === item).length; return <button type="button" key={item} onClick={() => setStatus(item)}><span className={`priority-dot ${item === "Aktiv" ? "stable" : item === "Verlegt" ? "info" : "archived"}`}/><span><strong>{item}</strong><small>{count} {count === 1 ? "Akte" : "Akten"}</small></span><ModuleIcon name="chevron"/></button>; })}</div></section>
        </aside>
      </div>
    </main>}
  </ModulePageShell>;
}

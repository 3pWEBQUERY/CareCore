"use client";

import { useMemo, useState } from "react";
import ModulePageShell, { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";

type CourseFilter = "Alle" | "Pflege" | "Vitalwerte" | "Medikation" | "Ereignisse";
type CourseEntry = {
  id: string;
  time: string;
  resident: string;
  initials: string;
  room: string;
  category: Exclude<CourseFilter, "Alle">;
  icon: ModuleIconName;
  title: string;
  detail: string;
  author: string;
  status: string;
  tone: "critical" | "attention" | "info" | "stable";
};

const entries: CourseEntry[] = [
  { id: "c1", time: "08:12", resident: "Hans Müller", initials: "HM", room: "Zimmer 207", category: "Ereignisse", icon: "alert", title: "Neurologische Kontrolle durchgeführt", detail: "Bewohner wach und orientiert. Pupillen isokor, keine neuen Schmerzen nach nächtlichem Sturz.", author: "Anna Meier", status: "Wichtig", tone: "critical" },
  { id: "c2", time: "07:55", resident: "Hans Müller", initials: "HM", room: "Zimmer 207", category: "Pflege", icon: "wounds", title: "Wundversorgung linker Unterarm", detail: "Wunde gereinigt und atraumatischer Verband erneuert. Wundrand leicht gerötet.", author: "Lea Frei", status: "Für Visite", tone: "attention" },
  { id: "c3", time: "07:42", resident: "Maria Keller", initials: "MK", room: "Zimmer 204", category: "Vitalwerte", icon: "vitals", title: "Blutzucker vor Frühstück", detail: "Messwert 8,7 mmol/l. Korrekturschema gemäss Verordnung angewendet.", author: "Anna Meier", status: "Dokumentiert", tone: "info" },
  { id: "c4", time: "07:30", resident: "Erika Meier", initials: "EM", room: "Zimmer 211", category: "Medikation", icon: "med", title: "Morgenmedikation verabreicht", detail: "Metoprolol erstmals in angepasster Dosierung von 50 mg abgegeben. Verträglichkeit beobachten.", author: "Nora Baumann", status: "Beobachtung", tone: "attention" },
  { id: "c5", time: "07:10", resident: "Peter Aebischer", initials: "PA", room: "Zimmer 115", category: "Pflege", icon: "note", title: "Trinkprotokoll ergänzt", detail: "250 ml Tee zum Frühstück angeboten, davon 180 ml getrunken. Motivation weiterhin erforderlich.", author: "Lea Frei", status: "Dokumentiert", tone: "stable" },
  { id: "c6", time: "06:50", resident: "Ruth Baumann", initials: "RB", room: "Zimmer 214", category: "Pflege", icon: "tasks", title: "Morgenpflege abgeschlossen", detail: "Mobilisation mit Rollator sicher. Hautzustand unverändert, Druckstelle an linker Ferse entlastet.", author: "Nora Baumann", status: "Erledigt", tone: "stable" },
];

const filters: CourseFilter[] = ["Alle", "Pflege", "Vitalwerte", "Medikation", "Ereignisse"];

export default function ResidentHistoryPage() {
  const [filter, setFilter] = useState<CourseFilter>("Alle");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("c1");

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const matchesFilter = filter === "Alle" || entry.category === filter;
    const searchable = `${entry.resident} ${entry.room} ${entry.title} ${entry.detail}`.toLocaleLowerCase("de-CH");
    return matchesFilter && searchable.includes(query.trim().toLocaleLowerCase("de-CH"));
  }), [filter, query]);
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  return <ModulePageShell activeModule="residents" activeChild="Verlauf" pageClass="resident-history-page">
    {(showToast) => <main className="workspace module-workspace">
      <section className="page-heading residents-heading" aria-labelledby="resident-history-title"><div className="heading-copy"><p className="eyebrow">CareCore Bewohner</p><h1 id="resident-history-title">Bewohnerverlauf</h1><p>Pflegeereignisse und Veränderungen im gesamten Wohnbereich chronologisch gebündelt.</p></div><button className="primary-button" type="button" onClick={() => showToast("Neuer Pflegeeintrag vorbereitet")}><ModuleIcon name="plus" className="button-icon"/>Pflegeeintrag erstellen</button></section>

      <section className="wound-summary" aria-label="Verlaufsübersicht">
        <div><span className="summary-icon"><ModuleIcon name="note"/></span><span><strong>18</strong><small>Ereignisse heute</small></span></div>
        <div><span className="summary-icon attention"><ModuleIcon name="alert"/></span><span><strong>5</strong><small>in Beobachtung</small></span></div>
        <div><span className="summary-icon info"><ModuleIcon name="vitals"/></span><span><strong>3</strong><small>Vitalwertänderungen</small></span></div>
        <div><span className="summary-icon"><ModuleIcon name="handover"/></span><span><strong>1</strong><small>Übergabe offen</small></span></div>
      </section>

      <section className="critical-alert wound-alert" aria-label="Wichtiger Verlaufshinweis"><span className="critical-symbol"><ModuleIcon name="alert"/></span><div><strong>Kontrolle weiterführen · Hans Müller</strong><p>Nach dem nächtlichen Sturz ist die nächste neurologische Kontrolle um 10:00 Uhr fällig.</p></div><button className="secondary-button" type="button" onClick={() => { setSelectedId("c1"); showToast("Verlauf von Hans Müller ausgewählt"); }}>Im Verlauf anzeigen <ModuleIcon name="chevron" className="button-icon"/></button></section>

      <div className="course-layout">
        <section className="card course-card" aria-labelledby="course-title">
          <div className="course-toolbar"><div><h2 className="card-title" id="course-title">Heute im Wohnbereich</h2><p className="card-subtitle">{filteredEntries.length} von {entries.length} Einträgen</p></div><label className="resident-search"><ModuleIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner oder Eintrag suchen" aria-label="Bewohnerverlauf durchsuchen"/></label><div className="course-filters" aria-label="Verlauf filtern">{filters.map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
          <div className="course-day-label"><span>Heute · 10. September 2026</span><small>Frühdienst</small></div>
          <div className="course-list">{filteredEntries.map((entry) => <button className={`course-row ${selectedEntry.id === entry.id ? "selected" : ""}`} type="button" key={entry.id} onClick={() => setSelectedId(entry.id)}>
            <time>{entry.time}</time><span className={`course-icon ${entry.tone}`}><ModuleIcon name={entry.icon}/></span><span className="course-main"><span><strong>{entry.title}</strong><span className={`status-badge ${entry.tone}`}>{entry.status}</span></span><small>{entry.resident} · {entry.room} · {entry.category}</small><p>{entry.detail}</p><em>Erfasst von {entry.author}</em></span><ModuleIcon name="chevron" className="chevron"/>
          </button>)}{filteredEntries.length === 0 && <div className="resident-empty"><ModuleIcon name="search"/><strong>Keine Einträge gefunden</strong><p>Suchbegriff oder Verlaufsfilter anpassen.</p></div>}</div>
        </section>

        <aside className="course-sidebar">
          <section className="card course-focus-card" aria-live="polite"><div className="card-header"><div><p className="eyebrow">Ausgewählter Eintrag</p><h2 className="card-title">{selectedEntry.resident}</h2><p className="card-subtitle">{selectedEntry.room} · heute um {selectedEntry.time}</p></div><span className={`status-badge ${selectedEntry.tone}`}>{selectedEntry.status}</span></div><div className="course-focus-body"><span className={`course-detail-icon ${selectedEntry.tone}`}><ModuleIcon name={selectedEntry.icon}/></span><h3>{selectedEntry.title}</h3><p>{selectedEntry.detail}</p><dl><div><dt>Bereich</dt><dd>{selectedEntry.category}</dd></div><div><dt>Erfasst von</dt><dd>{selectedEntry.author}</dd></div><div><dt>Zeitpunkt</dt><dd>Heute, {selectedEntry.time}</dd></div></dl><div className="course-focus-actions"><button className="primary-button" type="button" onClick={() => showToast(`Bewohnerakte von ${selectedEntry.resident} geöffnet`)}>Bewohnerakte öffnen</button><button className="secondary-button" type="button" onClick={() => showToast("Ergänzung zum Verlauf vorbereitet")}>Eintrag ergänzen</button></div></div></section>

          <section className="card course-priority-card"><div className="card-header"><div><h2 className="card-title">Im Fokus</h2><p className="card-subtitle">Offene Beobachtungen</p></div></div><div className="course-priority-list"><button type="button" onClick={() => setSelectedId("c1")}><span className="priority-dot critical"/><span><strong>Hans Müller</strong><small>Sturz-Nachkontrolle · 10:00</small></span><ModuleIcon name="chevron"/></button><button type="button" onClick={() => setSelectedId("c4")}><span className="priority-dot attention"/><span><strong>Erika Meier</strong><small>Neue Dosierung beobachten</small></span><ModuleIcon name="chevron"/></button><button type="button" onClick={() => setSelectedId("c3")}><span className="priority-dot info"/><span><strong>Maria Keller</strong><small>Blutzucker-Kontrolle · 11:30</small></span><ModuleIcon name="chevron"/></button></div></section>
        </aside>
      </div>
    </main>}
  </ModulePageShell>;
}

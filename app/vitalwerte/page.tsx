"use client";

import { useMemo, useState } from "react";
import ModulePageShell, { ModuleIcon } from "@/app/components/module-page-shell";

type VitalStatus = "Alle" | "Auffällig" | "Beobachten" | "Stabil";
type ResidentStatus = Exclude<VitalStatus, "Alle">;
type VitalMetric = "Blutdruck" | "Puls" | "Temperatur" | "Sauerstoff" | "Blutzucker";

type ResidentVitals = {
  id: string;
  initials: string;
  name: string;
  room: string;
  unit: string;
  measuredAt: string;
  status: ResidentStatus;
  tone: "critical" | "attention" | "stable";
  bloodPressure: string;
  pulse: string;
  temperature: string;
  oxygen: string;
  glucose: string;
  weight: string;
  alert: string;
};

const residents: ResidentVitals[] = [
  { id: "hm", initials: "HM", name: "Hans Müller", room: "Zimmer 207", unit: "Wohnbereich 2", measuredAt: "Heute, 07:42", status: "Beobachten", tone: "attention", bloodPressure: "142/86", pulse: "76", temperature: "36,8", oxygen: "95", glucose: "6,9", weight: "78,4", alert: "Systolischer Blutdruck leicht über dem persönlichen Zielbereich." },
  { id: "mk", initials: "MK", name: "Maria Keller", room: "Zimmer 204", unit: "Wohnbereich 2", measuredAt: "Heute, 07:35", status: "Auffällig", tone: "critical", bloodPressure: "138/82", pulse: "84", temperature: "37,1", oxygen: "96", glucose: "8,7", weight: "71,2", alert: "Blutzucker über dem Zielbereich. Kontrollmessung um 09:30 Uhr geplant." },
  { id: "em", initials: "EM", name: "Erika Meier", room: "Zimmer 211", unit: "Wohnbereich 2", measuredAt: "Heute, 07:18", status: "Stabil", tone: "stable", bloodPressure: "128/74", pulse: "68", temperature: "36,6", oxygen: "97", glucose: "5,8", weight: "65,7", alert: "Alle erfassten Werte liegen im persönlichen Zielbereich." },
  { id: "rb", initials: "RB", name: "Ruth Baumann", room: "Zimmer 214", unit: "Wohnbereich 2", measuredAt: "Heute, 06:58", status: "Stabil", tone: "stable", bloodPressure: "118/70", pulse: "72", temperature: "36,5", oxygen: "97", glucose: "6,1", weight: "59,8", alert: "Alle erfassten Werte liegen im persönlichen Zielbereich." },
  { id: "pa", initials: "PA", name: "Peter Aebischer", room: "Zimmer 115", unit: "Wohnbereich 1", measuredAt: "Heute, 07:51", status: "Beobachten", tone: "attention", bloodPressure: "105/66", pulse: "88", temperature: "37,3", oxygen: "94", glucose: "7,2", weight: "73,0", alert: "Sauerstoffsättigung beobachten und nach Mobilisation erneut messen." },
  { id: "as", initials: "AS", name: "Anna Schmid", room: "Zimmer 118", unit: "Wohnbereich 1", measuredAt: "Heute, 07:09", status: "Stabil", tone: "stable", bloodPressure: "122/76", pulse: "64", temperature: "36,4", oxygen: "98", glucose: "5,4", weight: "62,1", alert: "Alle erfassten Werte liegen im persönlichen Zielbereich." },
  { id: "wb", initials: "WB", name: "Walter Brunner", room: "Zimmer 306", unit: "Wohnbereich 3", measuredAt: "Heute, 08:04", status: "Auffällig", tone: "critical", bloodPressure: "150/92", pulse: "91", temperature: "37,7", oxygen: "93", glucose: "7,8", weight: "81,4", alert: "Blutdruck und Sauerstoffsättigung auffällig. Pflegefachperson wurde informiert." },
  { id: "bk", initials: "BK", name: "Bernhard Koch", room: "Zimmer 012", unit: "Pflegewohngruppe", measuredAt: "Heute, 06:46", status: "Beobachten", tone: "attention", bloodPressure: "134/80", pulse: "78", temperature: "36,9", oxygen: "95", glucose: "6,5", weight: "69,6", alert: "Werte stabil, Flüssigkeitszufuhr im Frühdienst weiter beobachten." },
];

const statusFilters: VitalStatus[] = ["Alle", "Auffällig", "Beobachten", "Stabil"];
const metrics: VitalMetric[] = ["Blutdruck", "Puls", "Temperatur", "Sauerstoff", "Blutzucker"];

function trendFor(resident: ResidentVitals, metric: VitalMetric) {
  const base = metric === "Blutdruck" ? Number(resident.bloodPressure.split("/")[0]) : metric === "Puls" ? Number(resident.pulse) : metric === "Temperatur" ? Number(resident.temperature.replace(",", ".")) : metric === "Sauerstoff" ? Number(resident.oxygen) : Number(resident.glucose.replace(",", "."));
  const offsets = metric === "Temperatur" ? [-0.3, -0.1, -0.2, 0] : metric === "Sauerstoff" ? [2, 1, 1, 0] : [-5, -2, -3, 0];
  return offsets.map((offset, index) => ({
    label: ["Gestern 18:00", "Gestern 22:00", "Heute 06:00", "Heute 08:00"][index],
    value: Math.round((base + offset) * 10) / 10,
  }));
}

export default function VitalsOverviewPage() {
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("Gesamtes Haus");
  const [status, setStatus] = useState<VitalStatus>("Alle");
  const [selectedId, setSelectedId] = useState("mk");
  const [metric, setMetric] = useState<VitalMetric>("Blutdruck");

  const filteredResidents = useMemo(() => residents.filter((resident) => {
    const matchesUnit = unit === "Gesamtes Haus" || resident.unit === unit;
    const matchesStatus = status === "Alle" || resident.status === status;
    const searchable = `${resident.name} ${resident.room} ${resident.unit}`.toLocaleLowerCase("de-CH");
    return matchesUnit && matchesStatus && searchable.includes(query.trim().toLocaleLowerCase("de-CH"));
  }), [query, status, unit]);
  const selectedResident = residents.find((resident) => resident.id === selectedId) ?? residents[0];
  const trend = trendFor(selectedResident, metric);
  const minimum = Math.min(...trend.map((point) => point.value));
  const maximum = Math.max(...trend.map((point) => point.value));

  return <ModulePageShell activeModule="vitals" activeChild="Übersicht" pageClass="vitals-page" locationSecondary="Gesamtes Haus · alle Wohnbereiche">
    {(showToast) => <main className="workspace module-workspace">
      <section className="page-heading care-page-heading" aria-labelledby="vitals-title"><div className="heading-copy"><p className="eyebrow">CareCore Vitalwerte</p><h1 id="vitals-title">Vitalwerte im Überblick</h1><p>Aktuelle Messungen aller Bewohner, Auffälligkeiten und fällige Kontrollen an einem Ort.</p></div><button className="primary-button" type="button" onClick={() => showToast("Neue Vitalwerterfassung vorbereitet")}><ModuleIcon name="plus" className="button-icon"/>Vitalwerte erfassen</button></section>

      <section className="wound-summary" aria-label="Vitalwertstatus im Haus">
        <div><span className="summary-icon"><ModuleIcon name="residents"/></span><span><strong>48</strong><small>Bewohner überwacht</small></span></div>
        <div><span className="summary-icon"><ModuleIcon name="vitals"/></span><span><strong>126</strong><small>Messungen heute</small></span></div>
        <div><span className="summary-icon attention"><ModuleIcon name="alert"/></span><span><strong>5</strong><small>auffällige Werte</small></span></div>
        <div><span className="summary-icon info"><ModuleIcon name="calendar"/></span><span><strong>3</strong><small>Kontrollen fällig</small></span></div>
      </section>

      <section className="critical-alert vitals-alert" aria-label="Klinischer Hinweis"><span className="critical-symbol"><ModuleIcon name="alert"/></span><div><strong>Kontrollmessung erforderlich · Maria Keller</strong><p>Blutzucker 8,7 mmol/l. Nächste Messung ist um 09:30 Uhr vorgesehen.</p></div><button className="secondary-button" type="button" onClick={() => { setSelectedId("mk"); setMetric("Blutzucker"); showToast("Maria Keller ausgewählt"); }}>Messverlauf ansehen <ModuleIcon name="chevron" className="button-icon"/></button></section>

      <div className="vitals-layout">
        <section className="card vitals-browser" aria-labelledby="vitals-list-title">
          <div className="vitals-toolbar"><div><h2 className="card-title" id="vitals-list-title">Aktuelle Vitalwerte</h2><p className="card-subtitle">{filteredResidents.length} von {residents.length} Bewohnern in dieser Demo</p></div><label className="resident-search"><ModuleIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bewohner, Zimmer oder Bereich" aria-label="Vitalwerte durchsuchen"/></label><label className="vitals-unit-filter"><span>Wohnbereich</span><select value={unit} onChange={(event) => setUnit(event.target.value)}><option>Gesamtes Haus</option><option>Wohnbereich 1</option><option>Wohnbereich 2</option><option>Wohnbereich 3</option><option>Pflegewohngruppe</option></select></label><div className="care-record-filters vitals-status-filters" aria-label="Vitalwertstatus filtern">{statusFilters.map((item) => <button className={status === item ? "active" : ""} type="button" key={item} aria-pressed={status === item} onClick={() => setStatus(item)}>{item}</button>)}</div></div>

          <div className="vitals-list">{filteredResidents.map((resident) => <button className={`vitals-row ${selectedResident.id === resident.id ? "selected" : ""}`} type="button" key={resident.id} onClick={() => setSelectedId(resident.id)}><span className="resident-avatar">{resident.initials}</span><span className="vitals-person"><strong>{resident.name}</strong><small>{resident.room} · {resident.unit}</small><em>{resident.measuredAt}</em></span><span className="vitals-values"><span><small>BD</small><strong>{resident.bloodPressure}</strong><em>mmHg</em></span><span><small>Puls</small><strong>{resident.pulse}</strong><em>/min</em></span><span><small>Temp.</small><strong>{resident.temperature}</strong><em>°C</em></span><span><small>SpO₂</small><strong>{resident.oxygen}</strong><em>%</em></span><span><small>BZ</small><strong>{resident.glucose}</strong><em>mmol/l</em></span><span><small>Gewicht</small><strong>{resident.weight}</strong><em>kg</em></span></span><span className={`status-badge ${resident.tone}`}>{resident.status}</span><ModuleIcon name="chevron"/></button>)}{filteredResidents.length === 0 && <div className="resident-empty"><ModuleIcon name="search"/><strong>Keine Vitalwerte gefunden</strong><p>Suchbegriff, Wohnbereich oder Statusfilter anpassen.</p></div>}</div>
        </section>

        <aside className="vitals-detail" aria-live="polite">
          <section className="card vitals-detail-card"><div className="vitals-detail-head"><div className="care-profile-identity"><span className="resident-avatar">{selectedResident.initials}</span><div><p className="eyebrow">Ausgewählter Bewohner</p><h2>{selectedResident.name}</h2><span>{selectedResident.room} · {selectedResident.unit}</span></div></div><span className={`status-badge ${selectedResident.tone}`}>{selectedResident.status}</span></div><div className={`vitals-clinical-note ${selectedResident.tone}`}><ModuleIcon name={selectedResident.tone === "stable" ? "check" : "alert"}/><p><strong>Klinische Einordnung</strong><span>{selectedResident.alert}</span></p></div><div className="vitals-detail-actions"><button className="primary-button" type="button" onClick={() => showToast(`Vitalwerterfassung für ${selectedResident.name} vorbereitet`)}>Neue Messung</button><button className="secondary-button" type="button" onClick={() => showToast(`Bewohnerakte von ${selectedResident.name} geöffnet`)}>Bewohnerakte</button></div></section>

          <section className="card vitals-trend-card"><div className="card-header"><div><p className="eyebrow">Messverlauf</p><h2 className="card-title">Letzte 24 Stunden</h2></div></div><div className="vitals-metric-tabs" aria-label="Messwert auswählen">{metrics.map((item) => <button className={metric === item ? "active" : ""} type="button" key={item} aria-pressed={metric === item} onClick={() => setMetric(item)}>{item}</button>)}</div><div className="vitals-chart" aria-label={`${metric}-Verlauf von ${selectedResident.name}`}>{trend.map((point) => { const height = 38 + ((point.value - minimum) / Math.max(maximum - minimum, 1)) * 48; return <div className="vitals-chart-point" key={point.label}><strong>{String(point.value).replace(".", ",")}</strong><span><i style={{ height: `${height}%` }}/></span><small>{point.label.replace("Gestern ", "G · ").replace("Heute ", "H · ")}</small></div>; })}</div><p className="vitals-chart-note"><ModuleIcon name="vitals"/>Persönliche Grenzwerte werden bei jeder Messung automatisch geprüft.</p></section>

          <section className="card vitals-due-card"><div className="card-header"><div><p className="eyebrow">Heute fällig</p><h2 className="card-title">Nächste Kontrollen</h2></div></div><div><button type="button" onClick={() => setSelectedId("mk")}><time>09:30</time><span><strong>Maria Keller</strong><small>Blutzucker-Kontrolle</small></span><ModuleIcon name="chevron"/></button><button type="button" onClick={() => setSelectedId("pa")}><time>10:00</time><span><strong>Peter Aebischer</strong><small>SpO₂ nach Mobilisation</small></span><ModuleIcon name="chevron"/></button><button type="button" onClick={() => setSelectedId("wb")}><time>10:15</time><span><strong>Walter Brunner</strong><small>Blutdruck &amp; SpO₂</small></span><ModuleIcon name="chevron"/></button></div></section>
        </aside>
      </div>
    </main>}
  </ModulePageShell>;
}

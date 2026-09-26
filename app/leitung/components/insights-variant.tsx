"use client";

import { ModuleIcon } from "@/app/components/module-icon";
import { Props, RowButton, SearchField } from "./leadership-variant-parts";

export function InsightsVariant({ view, visibleRows, selected, query, setQuery, setSelectedId, showToast }: Props) {
  if (view === "workforceInsights")
    return (
      <div className="insights-workforce-layout">
        <section className="card workforce-matrix">
          <div className="card-header">
            <div>
              <p className="eyebrow">Dienstbesetzung</p>
              <h2 className="card-title">Kompetenz- und Schichtmatrix</h2>
              <p className="card-subtitle">Kommende Woche · 92 % besetzt</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => showToast("Dienstplan geöffnet")}>
              Dienstplan <ModuleIcon name="chevron" />
            </button>
          </div>
          <div className="workforce-table">
            <div className="workforce-table-head">
              <span>Bereich</span>
              <span>Mo</span>
              <span>Di</span>
              <span>Mi</span>
              <span>Do</span>
              <span>Fr</span>
            </div>
            {["Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Nachtwache"].map((area, index) => (
              <div className="workforce-table-row" key={area}>
                <strong>{area}</strong>
                {[0, 1, 2, 3, 4].map((day) => (
                  <span className={day === 2 && index === 2 ? "warning" : "ok"} key={day}>
                    {day === 2 && index === 2 ? "1 offen" : index === 3 ? "2/2" : "✓"}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
        <aside className="card workforce-availability">
          <div className="card-header">
            <div>
              <p className="eyebrow">Verfügbarkeit</p>
              <h2 className="card-title">Abwesenheiten</h2>
            </div>
            <span className="status-badge attention">4 offen</span>
          </div>
          <div className="workforce-person">
            <span className="avatar">NB</span>
            <span>
              <strong>Nora Baumann</strong>
              <small>18.–20. September</small>
            </span>
            <span className="status-badge critical">Ersatz fehlt</span>
          </div>
          <div className="workforce-person">
            <span className="avatar">LF</span>
            <span>
              <strong>Lea Frei</strong>
              <small>21. September</small>
            </span>
            <span className="status-badge stable">Vertreten</span>
          </div>
          <button className="primary-button" type="button" onClick={() => showToast("Abwesenheitsplanung geöffnet")}>
            Vertretung planen
          </button>
        </aside>
      </div>
    );
  if (view === "leadershipInsights")
    return (
      <div className="insights-executive-layout">
        <section className="card executive-scorecard">
          <div className="card-header">
            <div>
              <p className="eyebrow">Geschäftsführung</p>
              <h2 className="card-title">Haus-Cockpit</h2>
              <p className="card-subtitle">Aktueller Stand gegenüber den Jahreszielen</p>
            </div>
            <SearchField title="Kennzahlen" query={query} setQuery={setQuery} />
          </div>
          <div className="executive-score-grid">
            <div>
              <span>Belegung</span>
              <strong>88 %</strong>
              <small>+3 % zum Vorjahr</small>
            </div>
            <div>
              <span>Pflegequalität</span>
              <strong>91 %</strong>
              <small>im Zielkorridor</small>
            </div>
            <div>
              <span>Teamstabilität</span>
              <strong>94 %</strong>
              <small>keine Eskalation</small>
            </div>
          </div>
          <div className="executive-trend">
            <span style={{ width: "82%" }} />
            <b>Gesamtfortschritt 82 %</b>
          </div>
        </section>
        <aside className="card executive-decisions">
          <div className="card-header">
            <div>
              <p className="eyebrow">Führungskreis</p>
              <h2 className="card-title">Entscheidungen</h2>
            </div>
          </div>
          {visibleRows.map((row) => (
            <RowButton row={row} selected={selected} setSelectedId={setSelectedId} key={row.id} />
          ))}
        </aside>
      </div>
    );
  return (
    <div className="insights-care-layout">
      <section className="card care-indicator-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Pflegequalität</p>
            <h2 className="card-title">Indikatoren</h2>
            <p className="card-subtitle">Wöchentliche Entwicklung</p>
          </div>
          <SearchField title="Pflegekennzahlen" query={query} setQuery={setQuery} />
        </div>
        <div className="care-indicator-list">
          {visibleRows.map((row) => (
            <button
              className={selected.id === row.id ? "selected" : ""}
              type="button"
              key={row.id}
              onClick={() => setSelectedId(row.id)}
            >
              <span className={`governance-icon ${row.tone}`}>
                <ModuleIcon name={row.icon} />
              </span>
              <span>
                <strong>{row.title}</strong>
                <small>{row.detail}</small>
              </span>
              <b>{row.metric}</b>
              <span className={`status-badge ${row.tone}`}>{row.status}</span>
            </button>
          ))}
        </div>
      </section>
      <aside className="card care-target-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Zielerreichung</p>
            <h2 className="card-title">Versorgungsqualität</h2>
          </div>
          <ModuleIcon name="chart" className="care-target-icon" />
        </div>
        <div className="care-target-ring">
          <strong>78%</strong>
          <span>Dokumentation</span>
        </div>
        <p>2 Indikatoren liegen unter dem Zielwert. Die nächste Evaluation ist für Freitag geplant.</p>
        <button className="primary-button" type="button" onClick={() => showToast("Pflegebericht wird vorbereitet")}>
          Pflegebericht erstellen
        </button>
      </aside>
    </div>
  );
}

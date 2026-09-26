"use client";

import { ModuleIcon } from "@/app/components/module-icon";
import { Props } from "./leadership-variant-parts";

export function QualityVariant({
  view,
  rows,
  visibleRows,
  selected,
  setSelectedId,
  completed,
  setCompleted,
  showToast,
}: Props) {
  if (view === "qualityActions") {
    const columns = [
      { label: "Offen", tone: "attention", ids: ["qa1"] },
      { label: "Geplant", tone: "info", ids: ["qa2"] },
      { label: "Erledigt", tone: "stable", ids: ["qa3"] },
    ];
    const owner = selected.owner ?? "Leitung Pflege";
    return (
      <div className="quality-actions-layout">
        <section className="card quality-kanban">
          <div className="card-header">
            <div>
              <p className="eyebrow">Verbesserungsboard</p>
              <h2 className="card-title">Massnahmen steuern</h2>
              <p className="card-subtitle">Prioritäten und Zuständigkeiten im Überblick</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => showToast("Neue Massnahme vorbereitet")}>
              <ModuleIcon name="plus" /> Neue Massnahme
            </button>
          </div>
          <div className="quality-kanban-grid">
            {columns.map((column) => (
              <div className="quality-kanban-column" key={column.label}>
                <div>
                  <strong>{column.label}</strong>
                  <span className={`status-badge ${column.tone}`}>{column.ids.length}</span>
                </div>
                {column.ids.map((id) => {
                  const row = rows.find((item) => item.id === id);
                  if (!row) return null;
                  return (
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
                        <em>{row.metric}</em>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
        <aside className="card quality-action-detail">
          <div className="card-header">
            <div>
              <p className="eyebrow">Massnahmendetail</p>
              <h2 className="card-title">{selected.title}</h2>
            </div>
            <span className={`status-badge ${completed.includes(selected.id) ? "stable" : selected.tone}`}>
              {completed.includes(selected.id) ? "Erledigt" : selected.status}
            </span>
          </div>
          <div className="quality-action-owner">
            <span className="avatar">
              {owner
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <span>
              <strong>{owner}</strong>
              <small>Verantwortlich</small>
            </span>
          </div>
          <p>{selected.detail}</p>
          <dl>
            <div>
              <dt>Termin</dt>
              <dd>{selected.metric}</dd>
            </div>
            <div>
              <dt>Nachweis</dt>
              <dd>Dokumentation erforderlich</dd>
            </div>
          </dl>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setCompleted((current) =>
                current.includes(selected.id) ? current.filter((id) => id !== selected.id) : [...current, selected.id],
              );
              showToast("Massnahmenstatus aktualisiert");
            }}
          >
            {completed.includes(selected.id) ? "Wieder öffnen" : "Als erledigt markieren"}
          </button>
        </aside>
      </div>
    );
  }
  return (
    <div className="quality-events-layout">
      <section className="card quality-events-timeline">
        <div className="card-header">
          <div>
            <p className="eyebrow">Sicherheitsmonitor</p>
            <h2 className="card-title">Ereignisverlauf</h2>
            <p className="card-subtitle">Chronologische Prüfung aller Meldungen</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => showToast("Ereignisformular geöffnet")}>
            <ModuleIcon name="plus" /> Ereignis melden
          </button>
        </div>
        <div className="quality-timeline-list">
          {visibleRows.map((row) => (
            <article key={row.id}>
              <div className={`quality-timeline-marker ${row.tone}`}>
                <ModuleIcon name={row.icon} />
              </div>
              <div>
                <p className="eyebrow">{row.metric}</p>
                <h3>{row.title}</h3>
                <p>{row.detail}</p>
                <small>{row.owner ?? "Qualitätsmanagement"}</small>
              </div>
              <span className={`status-badge ${row.tone}`}>{row.status}</span>
              <button
                className="quiet-button"
                type="button"
                onClick={() => {
                  setSelectedId(row.id);
                  showToast(`${row.title} geöffnet`);
                }}
              >
                Prüfen
              </button>
            </article>
          ))}
        </div>
      </section>
      <aside className="card quality-risk-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Risikobild</p>
            <h2 className="card-title">Sicherheitslage</h2>
          </div>
          <span className="quality-risk-score">B</span>
        </div>
        <div className="quality-risk-meter">
          <span style={{ width: "72%" }} />
        </div>
        <p>72 % der Meldungen sind abgeschlossen oder in laufender Massnahme.</p>
        <div className="quality-risk-stats">
          <span>
            <strong>2</strong>
            <small>Kritisch</small>
          </span>
          <span>
            <strong>5</strong>
            <small>In Prüfung</small>
          </span>
          <span>
            <strong>7</strong>
            <small>Abgeschlossen</small>
          </span>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => showToast("Qualitätsbericht wird vorbereitet")}
        >
          Bericht öffnen <ModuleIcon name="chevron" />
        </button>
      </aside>
    </div>
  );
}

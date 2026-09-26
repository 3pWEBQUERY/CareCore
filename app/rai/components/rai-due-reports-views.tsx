"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { residents } from "./rai-data";

export function DueView({ showToast }: { showToast: (message: string) => void }) {
  const [filter, setFilter] = useState("Alle");
  const items = [
    { ...residents[2], due: "Heute · 16:00", reason: "Jährliche Folgeerfassung" },
    { ...residents[4], due: "Morgen · 09:30", reason: "Nach Eintritt ergänzen" },
    { ...residents[0], due: "18.09.2026", reason: "Offene Bereiche abschliessen" },
  ];
  const visible = items.filter(
    (item) =>
      filter === "Alle" ||
      (filter === "Heute"
        ? item.due.startsWith("Heute")
        : filter === "Diese Woche"
          ? !item.due.startsWith("Heute")
          : item.reason.includes("Eintritt")),
  );
  return (
    <section className="card rai-due-card">
      <div className="rai-card-header">
        <div>
          <p className="eyebrow">Arbeitskorb</p>
          <h2 className="card-title">RAI-Fälligkeiten</h2>
          <p className="card-subtitle">
            {visible.length} von {items.length} Erfassungen benötigen Aufmerksamkeit
          </p>
        </div>
        <div className="rai-filter-row">
          {["Alle", "Heute", "Diese Woche", "Nach Eintritt"].map((item) => (
            <button
              className={filter === item ? "active" : ""}
              type="button"
              key={item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="rai-due-table-head">
        <span>Bewohner</span>
        <span>Grund</span>
        <span>Fällig</span>
        <span>Zuständig</span>
        <span />
      </div>
      <div className="rai-due-list">
        {visible.map((item) => (
          <article key={item.id}>
            <span className="resident-person">
              <span className="resident-avatar">{item.initials}</span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.room} · {item.unit}
                </small>
              </span>
            </span>
            <span>{item.reason}</span>
            <span className={`status-badge ${item.tone}`}>{item.due}</span>
            <span>{item.assessor}</span>
            <button
              className="quiet-button"
              type="button"
              onClick={() => showToast(`Fälligkeit für ${item.name} geöffnet`)}
            >
              Öffnen <ModuleIcon name="chevron" />
            </button>
          </article>
        ))}
        {visible.length === 0 && (
          <div className="resident-empty">
            <ModuleIcon name="calendar" />
            <strong>Keine Fälligkeiten</strong>
            <p>Der Filter zeigt aktuell keine Einträge.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function ReportsView({ showToast }: { showToast: (message: string) => void }) {
  const reports = [
    {
      title: "RAI-Vollständigkeit Haus",
      detail: "Aktive Akten und offene Bereiche nach Wohnbereich",
      value: "86%",
      tone: "stable",
    },
    {
      title: "Unterstützungsbedarf",
      detail: "Verteilung der interRAI-Scores im aktuellen Quartal",
      value: "48",
      tone: "info",
    },
    {
      title: "Fälligkeiten September",
      detail: "Erfassungen mit Termin und verantwortlicher Person",
      value: "7",
      tone: "attention",
    },
  ];
  return (
    <div className="rai-reports-layout">
      <section className="card rai-report-grid">
        <div className="rai-card-header">
          <div>
            <p className="eyebrow">Auswertung</p>
            <h2 className="card-title">RAI-Berichte</h2>
            <p className="card-subtitle">Transparente Kennzahlen für Pflege und Leitung.</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => showToast("RAI-Bericht wird exportiert")}>
            Exportieren <ModuleIcon name="docs" />
          </button>
        </div>
        <div className="rai-report-cards">
          {reports.map((report) => (
            <button
              type="button"
              className="rai-report-card"
              key={report.title}
              onClick={() => showToast(`${report.title} geöffnet`)}
            >
              <span className={`rai-report-value ${report.tone}`}>{report.value}</span>
              <strong>{report.title}</strong>
              <small>{report.detail}</small>
              <ModuleIcon name="chevron" />
            </button>
          ))}
        </div>
      </section>
      <aside className="card rai-report-note">
        <div className="card-header">
          <div>
            <p className="eyebrow">Datenqualität</p>
            <h2 className="card-title">Freigaben</h2>
          </div>
        </div>
        <div className="rai-report-meter">
          <span style={{ width: "86%" }} />
        </div>
        <strong>86% vollständig freigegeben</strong>
        <p>4 Entwürfe warten auf die Prüfung durch eine RAI Verantwortliche.</p>
        <button className="primary-button" type="button" onClick={() => showToast("Freigabewarteschlange geöffnet")}>
          Freigaben prüfen
        </button>
      </aside>
    </div>
  );
}

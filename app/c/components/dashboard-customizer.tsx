"use client";

import { dashboardWidgets } from "./dashboard-shared";
import type { DashboardState } from "./use-dashboard";

export function DashboardCustomizer({ r }: { r: DashboardState }) {
  const { hiddenWidgets, toggleWidget, resetDashboardLayout } = r;
  return (
    <section className="dashboard-customizer" aria-label="Arbeitsplatz bearbeiten">
      <div>
        <p className="eyebrow">Weitere Bausteine</p>
        <h2>Arbeitsplatz anpassen</h2>
        <p>Ordne die Zusatzbereiche unterhalb der Bewohner-Neuigkeiten an oder blende sie aus.</p>
      </div>
      <div className="dashboard-customizer-list">
        {dashboardWidgets.map((widget) => (
          <button
            className={!hiddenWidgets.includes(widget.id) ? "active" : ""}
            type="button"
            key={widget.id}
            onClick={() => toggleWidget(widget.id)}
          >
            <span>{!hiddenWidgets.includes(widget.id) ? "✓" : "+"}</span>
            <div>
              <strong>{widget.label}</strong>
              <small>{widget.description}</small>
            </div>
          </button>
        ))}
      </div>
      <button className="quiet-button" type="button" onClick={resetDashboardLayout}>
        Standard wiederherstellen
      </button>
    </section>
  );
}

"use client";

import { useState } from "react";
import { countryHolidays, formatDate } from "@/lib/roster/time";
import { COUNTRIES } from "@/lib/country";
import { rosterRequest } from "./roster-api";
import { act, type TabProps } from "./settings-tab-shared";

// --- Feiertage -----------------------------------------------------------------------------------

export function HolidaysTab({ data, reload, showToast }: TabProps) {
  const year = new Date().getFullYear();
  const holidays = COUNTRIES[data.country].holidays;
  const [form, setForm] = useState({ date: "", name: "" });
  return (
    <section className="card roster-card">
      <div className="roster-section-head">
        <div>
          <h2>Feiertage</h2>
          <p>Feiertage senken das Monatssoll und werden für Feiertagsstunden ausgewertet. {holidays.note}</p>
        </div>
        <div className="roster-row-actions">
          {[year, year + 1].map((y) => (
            <button
              key={y}
              className="secondary-button"
              type="button"
              onClick={() =>
                void act(
                  () =>
                    rosterRequest("/api/dienstplan/settings/holidays", {
                      method: "POST",
                      body: { action: "importHolidays", year: y },
                    }),
                  `${countryHolidays(data.country, y).length} Feiertage ${y} (${holidays.label}) übernommen`,
                  reload,
                  showToast,
                )
              }
            >
              {holidays.label === "bundesweit" ? "Bundesweite Feiertage" : holidays.label} {y} übernehmen
            </button>
          ))}
        </div>
      </div>
      <div className="roster-form-grid">
        <label>
          Datum
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label>
          Bezeichnung
          <input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
      </div>
      <div className="roster-form-actions">
        <button
          className="primary-button"
          type="button"
          disabled={!form.date || !form.name.trim()}
          onClick={() =>
            void act(
              () => rosterRequest("/api/dienstplan/settings/holidays", { method: "POST", body: form }),
              "Feiertag gespeichert",
              reload,
              showToast,
            ).then(() => setForm({ date: "", name: "" }))
          }
        >
          Feiertag hinzufügen
        </button>
      </div>
      <div className="roster-table-wrap">
        <table className="roster-table">
          <tbody>
            {data.holidays.map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.date, true)}</td>
                <td>{h.name}</td>
                <td>
                  <button
                    className="appointment-danger-button"
                    type="button"
                    onClick={() =>
                      void act(
                        () => rosterRequest(`/api/dienstplan/settings/holidays/${h.id}`, { method: "DELETE" }),
                        "Feiertag gelöscht",
                        reload,
                        showToast,
                      )
                    }
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
            {!data.holidays.length && (
              <tr>
                <td className="roster-muted">Noch keine Feiertage gepflegt.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

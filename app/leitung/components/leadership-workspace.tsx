"use client";

import { useEffect, useMemo, useState } from "react";
import ModulePageShell from "@/app/components/module-page-shell";
import { ModuleIcon } from "@/app/components/module-icon";
import { LeadershipVariant } from "./leadership-variants";
import { LocationEditor } from "./location-editor";
import type { AdminUserStats } from "@/lib/admin-users";
import { meta, boardItems } from "./leadership-data";
import { LeadershipView, Tone } from "./leadership-data";

export default function LeadershipWorkspace({ view }: { view: LeadershipView }) {
  const page = meta[view];
  const rows = boardItems[view];
  const [selectedId, setSelectedId] = useState(rows[0].id);
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [employeeCreatorOpen, setEmployeeCreatorOpen] = useState(false);
  const [employeeStats, setEmployeeStats] = useState<AdminUserStats | null>(null);
  useEffect(() => {
    if (view !== "users") return;
    let active = true;
    void fetch("/api/admin/users")
      .then((response) => (response.ok ? (response.json() as Promise<{ stats: AdminUserStats }>) : null))
      .then((payload) => {
        if (active && payload?.stats) setEmployeeStats(payload.stats);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [view]);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const visibleRows = useMemo(
    () =>
      rows.filter((row) =>
        `${row.title} ${row.detail} ${row.metric} ${row.status}`
          .toLocaleLowerCase("de-CH")
          .includes(query.trim().toLocaleLowerCase("de-CH")),
      ),
    [query, rows],
  );

  const kpis =
    view === "users" && employeeStats
      ? [
          [
            String(employeeStats.activeEmployees),
            "Mitarbeiter aktiv",
            `${employeeStats.archivedEmployees} archiviert`,
            "stable" as Tone,
          ],
          [
            String(employeeStats.roleCount),
            "Rollen",
            `${employeeStats.customRoleCount} eigene Rolle${employeeStats.customRoleCount === 1 ? "" : "n"}`,
            "info" as Tone,
          ],
          [
            String(employeeStats.unassignedActiveEmployees),
            "Ohne Arbeitsbereich",
            employeeStats.unassignedActiveEmployees === 0 ? "alle Profile zugeteilt" : "aktive Profile zuweisen",
            employeeStats.unassignedActiveEmployees === 0 ? ("stable" as Tone) : ("attention" as Tone),
          ],
          [
            employeeStats.auditEntriesLast30Days > 0 ? "Aktiv" : "Offen",
            "Auditstatus",
            employeeStats.lastAuditAt
              ? `letzte Änderung ${new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(employeeStats.lastAuditAt))}`
              : "noch keine Änderung",
            employeeStats.auditEntriesLast30Days > 0 ? ("stable" as Tone) : ("attention" as Tone),
          ],
        ]
      : page.kpis;
  return (
    <ModulePageShell
      activeModule={page.module}
      activeChild={page.child}
      pageClass={`leadership-page leadership-${view}`}
      locationSecondary="Gesamtes Haus · alle Wohnbereiche"
    >
      {(showToast) => (
        <main className="workspace leadership-workspace">
          <section className="leadership-heading page-heading">
            <div className="heading-copy">
              <p className="eyebrow">{page.eyebrow}</p>
              <h1>{page.title}</h1>
              <p>{page.description}</p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                view === "organization"
                  ? setLocationEditorOpen(true)
                  : view === "users"
                    ? setEmployeeCreatorOpen(true)
                    : showToast(`${page.action} vorbereitet`)
              }
            >
              <ModuleIcon name="plus" className="button-icon" />
              {page.action}
            </button>
          </section>
          <section className="leadership-kpis" aria-label="Leitungskennzahlen">
            {kpis.map(([value, label, note, tone]) => (
              <article key={label} className={tone ? `leadership-kpi ${tone}` : "leadership-kpi"}>
                <span className="leadership-kpi-value">{value}</span>
                <strong>{label}</strong>
                <small>{note}</small>
              </article>
            ))}
          </section>
          <LeadershipVariant
            view={view}
            rows={rows}
            visibleRows={visibleRows}
            selected={selected}
            query={query}
            setQuery={setQuery}
            setSelectedId={setSelectedId}
            completed={completed}
            setCompleted={setCompleted}
            showToast={showToast}
            employeeCreatorOpen={employeeCreatorOpen}
            onCloseEmployeeCreator={() => setEmployeeCreatorOpen(false)}
          />
          <LocationEditor
            open={locationEditorOpen}
            onClose={() => setLocationEditorOpen(false)}
            showToast={showToast}
          />
          <div className="leadership-board legacy-leadership-board" aria-hidden="true">
            <section className="card leadership-radar">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Management Cockpit</p>
                  <h2 className="card-title">Entwicklung im Zeitraum</h2>
                  <p className="card-subtitle">Vergleich der letzten sechs Wochen</p>
                </div>
                <button className="filter-pill" type="button" onClick={() => showToast("Zeitraum ausgewählt")}>
                  6 Wochen
                </button>
              </div>
              <div className="leadership-bars" aria-label="Kennzahlenverlauf">
                <div>
                  <span style={{ height: "48%" }} />
                  <span style={{ height: "64%" }} />
                  <span style={{ height: "58%" }} />
                  <span style={{ height: "76%" }} />
                  <span style={{ height: "71%" }} />
                  <span style={{ height: "84%" }} />
                  <small>Qualität</small>
                </div>
                <div>
                  <span style={{ height: "62%" }} />
                  <span style={{ height: "56%" }} />
                  <span style={{ height: "67%" }} />
                  <span style={{ height: "74%" }} />
                  <span style={{ height: "81%" }} />
                  <span style={{ height: "88%" }} />
                  <small>Plan</small>
                </div>
                <div>
                  <span style={{ height: "73%" }} />
                  <span style={{ height: "70%" }} />
                  <span style={{ height: "77%" }} />
                  <span style={{ height: "68%" }} />
                  <span style={{ height: "79%" }} />
                  <span style={{ height: "92%" }} />
                  <small>Aktuell</small>
                </div>
              </div>
              <div className="leadership-chart-legend">
                <span>
                  <i className="quality" />
                  Qualität
                </span>
                <span>
                  <i className="plan" />
                  Plan
                </span>
                <span>
                  <i className="actual" />
                  Aktuell
                </span>
              </div>
            </section>
            <section className="card leadership-priority">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Führungskreis</p>
                  <h2 className="card-title">Prioritäten heute</h2>
                </div>
                <span className="status-badge attention">3 offen</span>
              </div>
              <div className="leadership-priority-list">
                <button type="button" onClick={() => showToast("Sturzereignis geöffnet")}>
                  <span className="governance-icon critical">
                    <ModuleIcon name="alert" />
                  </span>
                  <span>
                    <strong>Sturzereignis prüfen</strong>
                    <small>Wohnbereich 2 · bis 10:00</small>
                  </span>
                  <ModuleIcon name="chevron" className="chevron" />
                </button>
                <button type="button" onClick={() => showToast("Besetzung geöffnet")}>
                  <span className="governance-icon attention">
                    <ModuleIcon name="team" />
                  </span>
                  <span>
                    <strong>Spätdienst besetzen</strong>
                    <small>Wohnbereich 3 · heute</small>
                  </span>
                  <ModuleIcon name="chevron" className="chevron" />
                </button>
                <button type="button" onClick={() => showToast("Qualitätsziel geöffnet")}>
                  <span className="governance-icon">
                    <ModuleIcon name="chart" />
                  </span>
                  <span>
                    <strong>Dokumentationsziel</strong>
                    <small>Massnahme bis Freitag</small>
                  </span>
                  <ModuleIcon name="chevron" className="chevron" />
                </button>
              </div>
            </section>
            <section className="card leadership-register">
              <div className="operations-toolbar">
                <div>
                  <p className="eyebrow">Arbeitsliste</p>
                  <h2 className="card-title">{page.title}</h2>
                  <p className="card-subtitle">
                    {visibleRows.length} von {rows.length} Einträgen
                  </p>
                </div>
                <label className="resident-search">
                  <ModuleIcon name="search" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Suchen…"
                    aria-label={`${page.title} durchsuchen`}
                  />
                </label>
              </div>
              <div className="leadership-register-list">
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
                    <span>
                      <strong>{row.metric}</strong>
                      <small>{row.status}</small>
                    </span>
                    <ModuleIcon name="chevron" className="chevron" />
                  </button>
                ))}
                {visibleRows.length === 0 && (
                  <div className="resident-empty">
                    <ModuleIcon name="search" />
                    <strong>Keine Einträge gefunden</strong>
                    <p>Suchbegriff anpassen.</p>
                  </div>
                )}
              </div>
            </section>
            <section className="card leadership-decision">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Entscheidung</p>
                  <h2 className="card-title">{selected.title}</h2>
                </div>
                <span className={`status-badge ${selected.tone}`}>
                  {completed.includes(selected.id) ? "Erledigt" : selected.status}
                </span>
              </div>
              <div className="leadership-decision-body">
                <p>{selected.detail}</p>
                <div>
                  <span>Messwert</span>
                  <strong>{selected.metric}</strong>
                </div>
                <div>
                  <span>Verantwortung</span>
                  <strong>Leitung Pflege</strong>
                </div>
              </div>
              <div className="leadership-decision-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setCompleted((current) =>
                      current.includes(selected.id)
                        ? current.filter((id) => id !== selected.id)
                        : [...current, selected.id],
                    );
                    showToast(`${selected.title} aktualisiert`);
                  }}
                >
                  {completed.includes(selected.id) ? "Wieder öffnen" : "Als geprüft markieren"}
                </button>
                <button className="secondary-button" type="button" onClick={() => showToast("Detailansicht geöffnet")}>
                  Details
                </button>
              </div>
            </section>
          </div>
        </main>
      )}
    </ModulePageShell>
  );
}

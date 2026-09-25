"use client";

import { useEffect, useMemo, useState } from "react";
import ModulePageShell, { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";
import { LeadershipVariant, LocationEditor } from "./leadership-variants";
import type { AdminUserStats } from "@/lib/admin-users";

export type LeadershipView =
  | "qualityEvents"
  | "qualityActions"
  | "careInsights"
  | "leadershipInsights"
  | "workforceInsights"
  | "organization"
  | "users"
  | "configuration";
type Tone = "stable" | "attention" | "critical" | "info";
export type BoardItem = {
  id: string;
  title: string;
  detail: string;
  metric: string;
  status: string;
  tone: Tone;
  icon: ModuleIconName;
  owner?: string;
};

const meta: Record<
  LeadershipView,
  {
    module: string;
    child: string;
    eyebrow: string;
    title: string;
    description: string;
    action: string;
    kpis: Array<[string, string, string, Tone?]>;
  }
> = {
  qualityEvents: {
    module: "quality",
    child: "Ereignisse",
    eyebrow: "CareCore Quality",
    title: "Ereignisse",
    description: "Sicherheitslage, Meldungen und Ursachen im gesamten Haus.",
    action: "Ereignis melden",
    kpis: [
      ["14", "Ereignisse 2026", "−18 % zum Vorjahr", "stable"],
      ["2", "kritische Fälle", "sofortige Prüfung", "critical"],
      ["5", "in Prüfung", "3 seit heute", "attention"],
      ["87 %", "abgeschlossen", "Ziel 90 %", "info"],
    ],
  },
  qualityActions: {
    module: "quality",
    child: "Massnahmen",
    eyebrow: "CareCore Quality",
    title: "Massnahmen",
    description: "Verbesserungen priorisieren, Verantwortlichkeiten klären und Wirkung messen.",
    action: "Massnahme planen",
    kpis: [
      ["18", "Massnahmen aktiv", "4 fällig", "attention"],
      ["91 %", "wirksam", "aus Evaluationen", "stable"],
      ["6", "Verantwortliche", "im Team", "info"],
      ["26", "abgeschlossen", "dieses Jahr", "stable"],
    ],
  },
  careInsights: {
    module: "insights",
    child: "Pflege",
    eyebrow: "CareCore Insights",
    title: "Pflegekennzahlen",
    description: "Versorgungsqualität und Pflegeindikatoren als Entscheidungsgrundlage.",
    action: "Bericht erstellen",
    kpis: [
      ["78 %", "Dokumentation", "Ziel 90 %", "attention"],
      ["3", "Sturzereignisse", "−1 zum Vormonat", "stable"],
      ["5", "aktive Wunden", "3 planmässig", "info"],
      ["94 %", "Assessments aktuell", "+4 %", "stable"],
    ],
  },
  leadershipInsights: {
    module: "insights",
    child: "Leitung",
    eyebrow: "CareCore Insights",
    title: "Leitungskennzahlen",
    description: "Belegung, Qualität und Risiken für den täglichen Führungsentscheid.",
    action: "Zeitraum wählen",
    kpis: [
      ["88 %", "Belegung", "46 von 52 Plätzen", "stable"],
      ["7", "Hinweise offen", "2 kritisch", "attention"],
      ["80 %", "Jahresziele", "Q3 Fortschritt", "info"],
      ["0", "P1 Eskalationen", "aktuell", "stable"],
    ],
  },
  workforceInsights: {
    module: "insights",
    child: "Personal",
    eyebrow: "CareCore Insights",
    title: "Personalkennzahlen",
    description: "Besetzung, Verfügbarkeit und Kompetenzmix im Überblick.",
    action: "Auswertung exportieren",
    kpis: [
      ["92 %", "Besetzung", "kommende Woche", "stable"],
      ["4", "Abwesenheiten", "noch offen", "attention"],
      ["100 %", "Kompetenzmix", "Mindestbesetzung", "info"],
      ["6", "offene Dienste", "zu planen", "critical"],
    ],
  },
  organization: {
    module: "admin",
    child: "Organisation",
    eyebrow: "CareCore Admin",
    title: "Organisation",
    description: "Standorte, Wohnbereiche und Verantwortlichkeiten zentral steuern.",
    action: "Bereich hinzufügen",
    kpis: [
      ["4", "Wohnbereiche", "46 Plätze belegt", "info"],
      ["62", "Mitarbeitende", "in 8 Rollen", "stable"],
      ["12", "Teams", "hausweit", "info"],
      ["1", "Änderung offen", "Wohnbereich 3", "attention"],
    ],
  },
  users: {
    module: "admin",
    child: "Mitarbeiter",
    eyebrow: "CareCore Admin",
    title: "Mitarbeiter",
    description: "Mitarbeiterprofile, Rollen und Zugriffe sicher verwalten.",
    action: "Mitarbeiter erstellen",
    kpis: [
      ["—", "Mitarbeiter aktiv", "Daten werden geladen", "info"],
      ["—", "Rollen", "Daten werden geladen", "info"],
      ["—", "Ohne Arbeitsbereich", "Daten werden geladen", "info"],
      ["—", "Auditstatus", "Daten werden geladen", "info"],
    ],
  },
  configuration: {
    module: "admin",
    child: "Konfiguration",
    eyebrow: "CareCore Admin",
    title: "Konfiguration",
    description: "Systemweite Einstellungen, Integrationen und Aufbewahrung sicher pflegen.",
    action: "Einstellung ändern",
    kpis: [
      ["18", "Einstellungen aktiv", "keine Fehler", "stable"],
      ["2", "Schnittstellen", "verbunden", "info"],
      ["1", "Prüfung empfohlen", "Archivierung", "attention"],
      ["100 %", "Auditstatus", "konform", "stable"],
    ],
  },
};

const boardItems: Record<LeadershipView, BoardItem[]> = {
  qualityEvents: [
    {
      id: "qe1",
      title: "Beinahe-Sturz · Zimmer 207",
      detail: "Umfeld angepasst, Angehörige informiert",
      metric: "Heute, 07:55",
      status: "In Prüfung",
      tone: "attention",
      icon: "alert",
    },
    {
      id: "qe2",
      title: "Medikationsabweichung",
      detail: "Rücksprache mit Arzt dokumentiert",
      metric: "11.09.2026",
      status: "Massnahme läuft",
      tone: "critical",
      icon: "med",
    },
    {
      id: "qe3",
      title: "Lob von Angehörigen",
      detail: "Positives Feedback zum Einzug",
      metric: "10.09.2026",
      status: "Abgeschlossen",
      tone: "stable",
      icon: "check",
    },
  ],
  qualityActions: [
    {
      id: "qa1",
      title: "Kontrollrunde Medikationswagen",
      detail: "Temperatur und Verfallsdaten prüfen",
      metric: "Fällig 15.09.",
      status: "Offen",
      tone: "attention",
      icon: "med",
    },
    {
      id: "qa2",
      title: "Schulung Sturzprävention",
      detail: "Teambriefing im Frühdienst",
      metric: "Termin 18.09.",
      status: "Geplant",
      tone: "info",
      icon: "learn",
    },
    {
      id: "qa3",
      title: "Beleuchtung Flur Nord",
      detail: "Installation geprüft und freigegeben",
      metric: "09.09.2026",
      status: "Erledigt",
      tone: "stable",
      icon: "check",
    },
  ],
  careInsights: [
    {
      id: "ci1",
      title: "Dokumentationsquote",
      detail: "28 von 36 Pflegeberichten abgeschlossen",
      metric: "78 %",
      status: "Unter Ziel",
      tone: "attention",
      icon: "chart",
    },
    {
      id: "ci2",
      title: "Sturzereignisse",
      detail: "Drei Ereignisse im laufenden Monat",
      metric: "3",
      status: "Verbessert",
      tone: "stable",
      icon: "quality",
    },
    {
      id: "ci3",
      title: "Wundheilung",
      detail: "Drei Verläufe planmässig",
      metric: "60 %",
      status: "Beobachten",
      tone: "info",
      icon: "wounds",
    },
  ],
  leadershipInsights: [
    {
      id: "li1",
      title: "Belegung",
      detail: "46 von 52 Plätzen sind belegt",
      metric: "88 %",
      status: "Im Ziel",
      tone: "stable",
      icon: "building",
    },
    {
      id: "li2",
      title: "Offene Hinweise",
      detail: "Zwei Hinweise benötigen Leitungssicht",
      metric: "7",
      status: "Prüfen",
      tone: "attention",
      icon: "alert",
    },
    {
      id: "li3",
      title: "Qualitätsziele",
      detail: "Acht von zehn Jahreszielen im Plan",
      metric: "80 %",
      status: "Q3",
      tone: "info",
      icon: "chart",
    },
  ],
  workforceInsights: [
    {
      id: "wi1",
      title: "Dienstbesetzung",
      detail: "Geplante Dienste kommende Woche",
      metric: "92 %",
      status: "Stabil",
      tone: "stable",
      icon: "calendar",
    },
    {
      id: "wi2",
      title: "Abwesenheiten",
      detail: "Noch nicht vollständig vertreten",
      metric: "4",
      status: "Handeln",
      tone: "attention",
      icon: "team",
    },
    {
      id: "wi3",
      title: "Kompetenzmix",
      detail: "Alle Schichten erfüllen Mindestbesetzung",
      metric: "100 %",
      status: "Erfüllt",
      tone: "info",
      icon: "learn",
    },
  ],
  organization: [
    {
      id: "o1",
      title: "Wohnbereich 2 · 1. OG",
      detail: "12 Plätze · 10 belegt · Team Anna Meier",
      metric: "Aktiv",
      status: "Stabil",
      tone: "stable",
      icon: "building",
    },
    {
      id: "o2",
      title: "Pflegewohngruppe",
      detail: "8 Plätze · 7 belegt · eigener Dienstplan",
      metric: "Aktiv",
      status: "Stabil",
      tone: "info",
      icon: "building",
    },
    {
      id: "o3",
      title: "Wohnbereich 3",
      detail: "Neue Teamleitung ab 01.10. hinterlegt",
      metric: "Prüfung",
      status: "Offen",
      tone: "attention",
      icon: "team",
    },
  ],
  users: [
    {
      id: "u1",
      title: "Anna Meier",
      detail: "Pflegefachfrau HF · Vollzugriff Pflege",
      metric: "Heute, 08:02",
      status: "Aktiv",
      tone: "stable",
      icon: "team",
    },
    {
      id: "u2",
      title: "Lea Frei",
      detail: "Fachfrau Gesundheit · eingeschränkter Zugriff",
      metric: "Gestern",
      status: "Aktiv",
      tone: "info",
      icon: "team",
    },
    {
      id: "u3",
      title: "Dr. Martin Weber",
      detail: "Belegarzt · Arbeitsbereich noch zuweisen",
      metric: "Prüfen",
      status: "Zuweisung",
      tone: "attention",
      icon: "team",
    },
  ],
  configuration: [
    {
      id: "cf1",
      title: "Benachrichtigungen",
      detail: "Eskalationen und fällige Aufgaben",
      metric: "12.09.2026",
      status: "Aktiv",
      tone: "stable",
      icon: "bell",
    },
    {
      id: "cf2",
      title: "Schnittstellen",
      detail: "KIS-Export und Verzeichnisdienst",
      metric: "08:05",
      status: "Verbunden",
      tone: "info",
      icon: "pulse",
    },
    {
      id: "cf3",
      title: "Archivierung",
      detail: "Aufbewahrungsfristen der Bewohnerakten",
      metric: "Prüfen",
      status: "Hinweis",
      tone: "attention",
      icon: "docs",
    },
  ],
};

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

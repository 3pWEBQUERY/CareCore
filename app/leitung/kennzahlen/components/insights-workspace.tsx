"use client";

import Link from "next/link";
import ModulePageShell from "@/app/components/module-page-shell";
import { ModuleIcon } from "@/app/components/module-icon";
import { LoadError, useApiData } from "@/app/components/workspace-ui";
import {
  formatPercent,
  percent,
  type CareInsights,
  type Indicator,
  type LeadershipInsights,
  type WorkforceInsights,
} from "@/lib/insights-shared";
import { LeadershipHeading, LeadershipKpis, initialsOf, type Kpi } from "../../components/leadership-page-parts";

export type InsightsView = "care" | "leadership" | "workforce";

const pages: Record<InsightsView, { child: string; title: string; description: string; pageClass: string }> = {
  care: {
    child: "Pflege",
    title: "Pflegekennzahlen",
    description: "Versorgungsqualität und Pflegeindikatoren als Entscheidungsgrundlage – live aus der Dokumentation.",
    pageClass: "careInsights",
  },
  leadership: {
    child: "Leitung",
    title: "Leitungskennzahlen",
    description: "Belegung, Qualität und offene Themen für den täglichen Führungsentscheid.",
    pageClass: "leadershipInsights",
  },
  workforce: {
    child: "Personal",
    title: "Personalkennzahlen",
    description: "Besetzung, Verfügbarkeit und Pflichtschulungen im Überblick.",
    pageClass: "workforceInsights",
  },
};

const LOADING: Kpi[] = ["Kennzahl 1", "Kennzahl 2", "Kennzahl 3", "Kennzahl 4"].map((label) => ({
  value: "–",
  label,
  note: "wird geladen",
  tone: "info",
}));

// Opens the module behind an indicator.
function IndicatorLink({ item }: { item: Indicator }) {
  return (
    <Link href={item.href}>
      <span className={`governance-icon ${item.tone}`}>
        <ModuleIcon name={item.icon} />
      </span>
      <span>
        <strong>{item.title}</strong>
        <small>{item.detail}</small>
      </span>
      <b>{item.metric}</b>
      <span className={`status-badge ${item.tone}`}>{item.status}</span>
    </Link>
  );
}

function CareView({ data }: { data: CareInsights }) {
  return (
    <div className="insights-care-layout">
      <section className="card care-indicator-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Pflegequalität</p>
            <h2 className="card-title">Indikatoren</h2>
            <p className="card-subtitle">Aktueller Stand aller aktiven Bewohner</p>
          </div>
        </div>
        <div className="care-indicator-list">
          {data.indicators.map((item) => (
            <IndicatorLink item={item} key={item.id} />
          ))}
        </div>
      </section>
      <aside className="card care-target-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Zielerreichung</p>
            <h2 className="card-title">Dokumentation</h2>
          </div>
          <ModuleIcon name="chart" className="care-target-icon" />
        </div>
        <div className="care-target-ring gauge" style={{ ["--value" as string]: data.documentation ?? 0 }}>
          <strong>{formatPercent(data.documentation)}</strong>
          <span>letzte 24 h</span>
        </div>
        <p>
          {data.belowTarget
            ? `${data.belowTarget} Indikator${data.belowTarget === 1 ? " liegt" : "en liegen"} unter dem Zielwert oder benötigen Aufmerksamkeit.`
            : "Alle Indikatoren liegen im Zielbereich."}
        </p>
        <Link className="primary-button" href="/pflegedokumentation">
          Zur Pflegedokumentation
        </Link>
      </aside>
    </div>
  );
}

function LeadershipView({ data }: { data: LeadershipInsights }) {
  return (
    <div className="insights-executive-layout">
      <section className="card executive-scorecard">
        <div className="card-header">
          <div>
            <p className="eyebrow">Geschäftsführung</p>
            <h2 className="card-title">Haus-Cockpit</h2>
            <p className="card-subtitle">Aktueller Stand im gesamten Haus</p>
          </div>
        </div>
        <div className="executive-score-grid">
          {data.scores.map((score) => (
            <div key={score.label}>
              <span>{score.label}</span>
              <strong>{score.value}</strong>
              <small>{score.note}</small>
            </div>
          ))}
        </div>
        <div className="executive-trend">
          <span style={{ width: `${data.progress.value ?? 0}%` }} />
          <b>{data.progress.label}</b>
        </div>
        <div className="executive-units">
          {data.units.map((unit) => {
            const share = percent(unit.residents, unit.beds);
            return (
              <div key={unit.name}>
                <strong>{unit.name}</strong>
                <span className="executive-unit-bar">
                  <span style={{ width: `${Math.min(share ?? 0, 100)}%` }} />
                </span>
                <small>
                  {unit.residents} / {unit.beds || "–"} · {formatPercent(share)}
                </small>
              </div>
            );
          })}
        </div>
      </section>
      <aside className="card executive-decisions">
        <div className="card-header">
          <div>
            <p className="eyebrow">Führungskreis</p>
            <h2 className="card-title">Entscheidungen</h2>
          </div>
          <span className={`status-badge ${data.decisions.length ? "attention" : "stable"}`}>
            {data.decisions.length ? `${data.decisions.length} offen` : "Alles im Plan"}
          </span>
        </div>
        {data.decisions.map((item) => (
          <Link href={item.href} key={item.id}>
            <span className={`governance-icon ${item.tone}`}>
              <ModuleIcon name={item.icon} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
            <span>
              <strong>{item.metric}</strong>
              <small>{item.status}</small>
            </span>
            <ModuleIcon name="chevron" className="chevron" />
          </Link>
        ))}
        {!data.decisions.length && <p className="list-hint">Keine offenen Themen für die Leitung.</p>}
      </aside>
    </div>
  );
}

function WorkforceView({ data }: { data: WorkforceInsights }) {
  const c = data.compliance;
  return (
    <div className="insights-workforce-layout">
      <section className="card workforce-matrix">
        <div className="card-header">
          <div>
            <p className="eyebrow">Dienstbesetzung</p>
            <h2 className="card-title">Besetzung nach Wohnbereich</h2>
            <p className="card-subtitle">Nächste 7 Tage · {formatPercent(data.coverage)} besetzt</p>
          </div>
          <Link className="secondary-button" href="/betrieb/dienstplanung/team">
            Dienstplan <ModuleIcon name="chevron" />
          </Link>
        </div>
        <div className="workforce-table week">
          <div className="workforce-table-head">
            <span>Bereich</span>
            {data.days.map((day) => (
              <span key={day.day}>{day.label}</span>
            ))}
          </div>
          {data.matrix.map((row) => (
            <div className="workforce-table-row" key={row.unit}>
              <strong>{row.unit}</strong>
              {row.cells.map((cell, index) => (
                <span
                  className={!cell.required ? "empty" : cell.assigned < cell.required ? "warning" : "ok"}
                  key={data.days[index].day}
                  title={`${cell.assigned} von ${cell.required} Personen eingeplant`}
                >
                  {!cell.required
                    ? "–"
                    : cell.assigned < cell.required
                      ? `${cell.required - cell.assigned} offen`
                      : `${cell.assigned}/${cell.required}`}
                </span>
              ))}
            </div>
          ))}
          {!data.matrix.length && <p className="list-hint">Noch keine Wohnbereiche eingerichtet.</p>}
        </div>
      </section>
      <aside className="house-history-sidebar">
        <section className="card workforce-availability">
          <div className="card-header">
            <div>
              <p className="eyebrow">Verfügbarkeit</p>
              <h2 className="card-title">Abwesenheiten</h2>
              <p className="card-subtitle">Nächste 14 Tage</p>
            </div>
            <span
              className={`status-badge ${data.absences.some((a) => a.tone === "attention") ? "attention" : "stable"}`}
            >
              {data.absences.length}
            </span>
          </div>
          {data.absences.map((absence) => (
            <div className="workforce-person" key={absence.id}>
              <span className="avatar">{initialsOf(absence.name)}</span>
              <span>
                <strong>{absence.name}</strong>
                <small>{absence.period}</small>
              </span>
              <span className={`status-badge ${absence.tone}`}>{absence.status}</span>
            </div>
          ))}
          {!data.absences.length && <p className="list-hint workforce-hint">Keine Abwesenheiten geplant.</p>}
          <Link className="primary-button" href="/betrieb/dienstplanung/team">
            Vertretung planen
          </Link>
        </section>
        {c && (
          <section className="card quality-risk-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Kompetenz</p>
                <h2 className="card-title">Pflichtschulungen</h2>
              </div>
            </div>
            <div className="quality-risk-meter">
              <span
                style={{
                  width: `${percent(c.valid + c.dueSoon, c.valid + c.dueSoon + c.expired + c.missing + c.pending) ?? 0}%`,
                }}
              />
            </div>
            <p>
              {c.dueSoon} Nachweis{c.dueSoon === 1 ? " läuft" : "e laufen"} bald ab, {c.pending} warte
              {c.pending === 1 ? "t" : "n"} auf Prüfung.
            </p>
            <div className="quality-risk-stats">
              <span>
                <strong>{c.valid + c.dueSoon}</strong>
                <small>Gültig</small>
              </span>
              <span>
                <strong>{c.expired}</strong>
                <small>Abgelaufen</small>
              </span>
              <span>
                <strong>{c.missing}</strong>
                <small>Fehlend</small>
              </span>
            </div>
            <Link className="secondary-button" href="/personal/schulungen/pflichtnachweise">
              Pflichtnachweise <ModuleIcon name="chevron" />
            </Link>
          </section>
        )}
      </aside>
    </div>
  );
}

export default function InsightsWorkspace({ view }: { view: InsightsView }) {
  const page = pages[view];
  const data = useApiData<CareInsights | LeadershipInsights | WorkforceInsights>(`/api/insights?view=${view}`);
  return (
    <ModulePageShell
      activeModule="insights"
      activeChild={page.child}
      pageClass={`leadership-page leadership-${page.pageClass}`}
      locationSecondary="Gesamtes Haus · alle Wohnbereiche"
    >
      {(showToast) => (
        <main className="workspace leadership-workspace">
          <LeadershipHeading
            eyebrow="CareCore Insights"
            title={page.title}
            description={page.description}
            action={{
              label: "Aktualisieren",
              icon: "docs",
              onClick: () => {
                data.reload();
                showToast("Kennzahlen werden neu berechnet");
              },
            }}
          />
          <LeadershipKpis kpis={data.data?.kpis ?? LOADING} />
          {data.error && <LoadError message={data.error} onRetry={data.reload} />}
          {data.data && view === "care" && <CareView data={data.data as CareInsights} />}
          {data.data && view === "leadership" && <LeadershipView data={data.data as LeadershipInsights} />}
          {data.data && view === "workforce" && <WorkforceView data={data.data as WorkforceInsights} />}
        </main>
      )}
    </ModulePageShell>
  );
}

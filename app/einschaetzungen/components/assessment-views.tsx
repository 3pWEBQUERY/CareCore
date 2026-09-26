"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { CareSelect } from "@/app/components/care-form-controls";
import { ModuleIcon } from "@/app/components/module-icon";
import {
  EmptyState,
  LoadError,
  PageHeading,
  SummaryTiles,
  formatDate,
  formatDateTime,
  todayInZurich,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import { instrumentByCode, type Instrument } from "@/lib/assessment-instruments";
import type { AssessmentResult, DueItem } from "@/lib/assessments";
import { initials } from "@/lib/medication-shared";
import AssessmentDialog from "./assessment-dialog";

type Overview = {
  instruments: Instrument[];
  residents: Array<{ id: string; name: string; initials: string; room: string; careUnit: string }>;
  latest: AssessmentResult[];
  canWrite: boolean;
};

const ALL = "Alle Instrumente";
const RISK_FILTERS = ["Alle", "Hohes Risiko", "Mittleres Risiko", "Kein erhöhtes Risiko"] as const;
const toneFor = (filter: (typeof RISK_FILTERS)[number]) =>
  filter === "Hohes Risiko" ? "critical" : filter === "Mittleres Risiko" ? "attention" : "stable";

export function OverviewView({ showToast }: { showToast: ShowToast }) {
  const data = useApiData<Overview>("/api/assessments");
  const [instrument, setInstrument] = useState(ALL);
  const [risk, setRisk] = useState<(typeof RISK_FILTERS)[number]>("Alle");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<AssessmentResult | null>(null);
  const residents = data.data?.residents ?? [];
  const latest = data.data?.latest ?? [];
  const nameOf = (id: string) => residents.find((r) => r.id === id);
  const today = todayInZurich();
  const needle = query.trim().toLocaleLowerCase("de-CH");
  const filtered = latest.filter(
    (r) =>
      (instrument === ALL || r.name === instrument) &&
      (risk === "Alle" || r.tone === toneFor(risk)) &&
      `${nameOf(r.residentId)?.name ?? ""} ${r.name}`.toLocaleLowerCase("de-CH").includes(needle),
  );

  return (
    <>
      <PageHeading
        eyebrow="CareCore Einschätzungen"
        title="Einschätzungen"
        description="Standardisierte Assessments mit automatisch berechnetem Ergebnis – jeweils die letzte gültige Einschätzung."
        action={data.data?.canWrite ? { label: "Einschätzung erfassen", onClick: () => setCreating(true) } : undefined}
      />
      <SummaryTiles
        label="Einschätzungen im Haus"
        tiles={[
          { icon: "assess", value: latest.length, caption: "aktuelle Ergebnisse" },
          {
            icon: "alert",
            value: latest.filter((r) => r.tone === "critical").length,
            caption: "mit hohem Risiko",
            tone: "critical",
          },
          {
            icon: "calendar",
            value: latest.filter((r) => r.nextDueOn && r.nextDueOn < today).length,
            caption: "Neueinschätzung überfällig",
            tone: "attention",
          },
          {
            icon: "residents",
            value: `${new Set(latest.map((r) => r.residentId)).size}/${residents.length}`,
            caption: "Bewohner eingeschätzt",
            tone: "info",
          },
        ]}
      />
      {data.error && <LoadError message={data.error} onRetry={data.reload} />}
      <section className="card assessments-card">
        <div className="operations-toolbar">
          <div>
            <h2 className="card-title">Aktuelle Ergebnisse</h2>
            <p className="card-subtitle">
              {filtered.length} von {latest.length} Ergebnissen
            </p>
          </div>
          <label className="resident-search">
            <ModuleIcon name="search" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bewohner oder Instrument"
              aria-label="Einschätzungen durchsuchen"
            />
          </label>
          <CareSelect
            label="Instrument"
            value={instrument}
            options={[ALL, ...new Set(latest.map((r) => r.name))]}
            onChange={setInstrument}
          />
          <div className="operations-filter-buttons">
            {RISK_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={risk === item ? "active" : ""}
                aria-pressed={risk === item}
                onClick={() => setRisk(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="assessment-table-head">
          <span>Bewohner</span>
          <span>Instrument</span>
          <span>Ergebnis</span>
          <span>Eingeschätzt</span>
          <span />
        </div>
        <div className="assessment-list">
          {filtered.map((result) => {
            const resident = nameOf(result.residentId);
            return (
              <article key={result.id}>
                <span className="resident-avatar">{resident?.initials ?? "?"}</span>
                <span>
                  <strong>{resident?.name ?? "Unbekannt"}</strong>
                  <small>{resident?.room}</small>
                </span>
                <span>
                  <strong>{result.name}</strong>
                  <small>{result.score === null ? "–" : `${result.score} Punkte`}</small>
                </span>
                <span className={`status-badge ${result.tone}`}>{result.riskLabel ?? "Erfasst"}</span>
                <span>
                  <strong>{formatDateTime(result.completedAt)}</strong>
                  <small className={result.nextDueOn && result.nextDueOn < today ? "status-text critical" : ""}>
                    {result.nextDueOn ? `Nächste: ${formatDate(result.nextDueOn)}` : (result.assessor ?? "")}
                  </small>
                </span>
                <button className="quiet-button" type="button" onClick={() => setViewing(result)}>
                  Verlauf
                </button>
              </article>
            );
          })}
          {!data.loading && !filtered.length && (
            <EmptyState
              icon="assess"
              title={latest.length ? "Keine Ergebnisse gefunden" : "Noch keine Einschätzungen"}
              text={latest.length ? "Filter anpassen." : "Über „Einschätzung erfassen“ starten."}
            />
          )}
          {data.loading && !data.data && <p className="list-hint">Einschätzungen werden geladen …</p>}
        </div>
      </section>
      {creating && data.data && (
        <AssessmentDialog
          residents={residents}
          onClose={() => setCreating(false)}
          onSaved={(message) => {
            setCreating(false);
            showToast(message);
            data.reload();
          }}
        />
      )}
      {viewing && (
        <HistoryPanel
          result={viewing}
          residentName={nameOf(viewing.residentId)?.name ?? ""}
          canWrite={data.data?.canWrite ?? false}
          residents={residents}
          showToast={showToast}
          onChanged={data.reload}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

function HistoryPanel({
  result,
  residentName,
  canWrite,
  residents,
  showToast,
  onChanged,
  onClose,
}: {
  result: AssessmentResult;
  residentName: string;
  canWrite: boolean;
  residents: Overview["residents"];
  showToast: ShowToast;
  onChanged: () => void;
  onClose: () => void;
}) {
  const history = useApiData<{ results: AssessmentResult[] }>(
    `/api/assessments/residents/${result.residentId}?instrument=${result.code}`,
  );
  const [repeat, setRepeat] = useState(false);
  const instrument = instrumentByCode(result.code);
  const labelOf = (key: string, value: unknown) =>
    instrument?.items.find((i) => i.key === key)?.options.find((o) => o.value === value)?.label ?? String(value);
  if (repeat)
    return (
      <AssessmentDialog
        residents={residents}
        residentId={result.residentId}
        instrument={result.code}
        onClose={() => setRepeat(false)}
        onSaved={(message) => {
          showToast(message);
          onChanged();
          onClose();
        }}
      />
    );
  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="area-editor-panel editor-dialog assessment-history"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-history-title"
      >
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Einschätzungen · {residentName}</p>
            <h2 id="assessment-history-title">{result.name}</h2>
            <p>{instrument?.description ?? "Einschätzung aus einer früheren Version ohne hinterlegte Fragen."}</p>
          </div>
          <button className="area-editor-close" type="button" aria-label="Schliessen" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="assessment-history-body">
          {canWrite && instrument && (
            <button className="primary-button" type="button" onClick={() => setRepeat(true)}>
              <ModuleIcon name="plus" /> Neu einschätzen
            </button>
          )}
          {(history.data?.results ?? []).map((entry) => (
            <article key={entry.id}>
              <header>
                <strong>
                  {entry.score === null ? "–" : `${entry.score} Punkte`} ·{" "}
                  <span className={`status-text ${entry.tone}`}>{entry.riskLabel ?? "Erfasst"}</span>
                </strong>
                <small>
                  {formatDateTime(entry.completedAt)} · {entry.assessor ?? "unbekannt"}
                </small>
              </header>
              {instrument ? (
                <dl>
                  {Object.entries(entry.answers).map(([key, value]) => (
                    <div key={key}>
                      <dt>{instrument.items.find((i) => i.key === key)?.label ?? key}</dt>
                      <dd>
                        {labelOf(key, value)} ({String(value)})
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {entry.summary && <p>{entry.summary}</p>}
            </article>
          ))}
          {history.loading && !history.data && <p className="list-hint">Verlauf wird geladen …</p>}
        </div>
      </section>
    </div>
  );
}

const kindLabel: Record<DueItem["kind"], string> = {
  overdue: "Überfällig",
  open: "Offen",
  due: "Fällig",
  missing: "Nie erfasst",
};
const kindTone: Record<DueItem["kind"], string> = {
  overdue: "critical",
  open: "attention",
  due: "attention",
  missing: "info",
};
const DUE_FILTERS = ["Alle", "Überfällig", "Fällig", "Nie erfasst", "Offen"] as const;

export function DueView({ showToast }: { showToast: ShowToast }) {
  const due = useApiData<{ items: DueItem[]; canWrite: boolean }>("/api/assessments/due");
  const overview = useApiData<Overview>("/api/assessments");
  const [filter, setFilter] = useState<(typeof DUE_FILTERS)[number]>("Alle");
  const [starting, setStarting] = useState<DueItem | null>(null);
  const items = due.data?.items ?? [];
  const filtered = items.filter((item) => filter === "Alle" || kindLabel[item.kind] === filter);
  const count = (kind: DueItem["kind"]) => items.filter((i) => i.kind === kind).length;

  return (
    <>
      <PageHeading
        eyebrow="CareCore Einschätzungen"
        title="Fälligkeiten"
        description="Überfällige und in den nächsten 7 Tagen fällige Neueinschätzungen sowie fehlende Basis-Assessments."
      />
      <SummaryTiles
        label="Fälligkeiten"
        tiles={[
          { icon: "alert", value: count("overdue"), caption: "überfällig", tone: "critical" },
          { icon: "calendar", value: count("due"), caption: "in den nächsten 7 Tagen", tone: "attention" },
          { icon: "assess", value: count("missing"), caption: "Basis-Assessments fehlen", tone: "info" },
          { icon: "note", value: count("open"), caption: "offene Entwürfe" },
        ]}
      />
      {due.error && <LoadError message={due.error} onRetry={due.reload} />}
      <section className="card assessments-card">
        <div className="operations-toolbar">
          <div>
            <h2 className="card-title">Anstehende Einschätzungen</h2>
            <p className="card-subtitle">
              {filtered.length} von {items.length} Einträgen
            </p>
          </div>
          <div className="operations-filter-buttons">
            {DUE_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={filter === item ? "active" : ""}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="assessment-table-head">
          <span>Bewohner</span>
          <span>Instrument</span>
          <span>Status</span>
          <span>Fällig</span>
          <span />
        </div>
        <div className="assessment-list">
          {filtered.map((item) => (
            <article key={`${item.residentId}-${item.code}-${item.kind}`}>
              <span className="resident-avatar">{initials(item.residentName)}</span>
              <span>
                <strong>{item.residentName}</strong>
                <small>{item.room}</small>
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.lastCompletedAt ? `Zuletzt ${formatDate(item.lastCompletedAt)}` : "Noch keine Einschätzung"}
                </small>
              </span>
              <span className={`status-badge ${kindTone[item.kind]}`}>{kindLabel[item.kind]}</span>
              <span>
                <strong>{item.dueOn ? formatDate(item.dueOn) : "–"}</strong>
              </span>
              {due.data?.canWrite && instrumentByCode(item.code) ? (
                <button className="quiet-button" type="button" onClick={() => setStarting(item)}>
                  Erfassen
                </button>
              ) : (
                <span />
              )}
            </article>
          ))}
          {!due.loading && !filtered.length && (
            <EmptyState icon="check" title="Nichts fällig" text="Alle Einschätzungen sind aktuell." />
          )}
          {due.loading && !due.data && <p className="list-hint">Fälligkeiten werden geladen …</p>}
        </div>
      </section>
      {starting && overview.data && (
        <AssessmentDialog
          residents={overview.data.residents}
          residentId={starting.residentId}
          instrument={starting.code}
          onClose={() => setStarting(null)}
          onSaved={(message) => {
            setStarting(null);
            showToast(message);
            due.reload();
            overview.reload();
          }}
        />
      )}
    </>
  );
}

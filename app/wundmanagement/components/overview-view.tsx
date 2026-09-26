"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import {
  EmptyState,
  LoadError,
  PageHeading,
  ReasonDialog,
  SummaryTiles,
  formatDate,
  formatDateTime,
  requestJson,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import { ORIGIN_LABELS, formatCm, healingProgress, sizeLabel, woundTone, type WoundEntry } from "@/lib/wounds-shared";
import { EntryDialog, WoundDialog, type WoundsPayload } from "./wound-dialogs";
import WoundPhotos from "./wound-photos";
import { FILTERS, Dialog, statusText, nextCareLabel } from "./overview-utils";
import { WoundTimeline } from "./wound-timeline";

export default function OverviewView({ showToast }: { showToast: ShowToast }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Alle");
  const [query, setQuery] = useState("");
  // Links from the resident record: ?wound=<id> selects a wound, ?resident=&observation= opens
  // the dialog for a new wound linked to that body map marker.
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get("wound"));
  const [dialog, setDialog] = useState<Dialog>(() => {
    const residentId = params.get("resident");
    return residentId
      ? { kind: "wound", wound: null, residentId, observationId: params.get("observation") ?? undefined }
      : null;
  });
  // The link parameters are consumed once; drop them so a reload does not reopen the dialog.
  const hasParams = params.size > 0;
  useEffect(() => {
    if (hasParams) router.replace(pathname, { scroll: false });
  }, [hasParams, router, pathname]);
  const data = useApiData<WoundsPayload>(`/api/wounds${filter === "Abgeschlossen" ? "?closed=1" : ""}`);
  const wounds = data.data?.wounds ?? [];
  const open = wounds.filter((w) => w.status !== "closed");
  const needle = query.trim().toLocaleLowerCase("de-CH");
  const filtered = wounds.filter(
    (w) =>
      (filter === "Alle" ||
        (filter === "Überfällig" && w.overdue) ||
        (filter === "In Behandlung" && w.status === "active") ||
        (filter === "Heilend" && w.status === "healing") ||
        (filter === "Abgeschlossen" && w.status === "closed")) &&
      `${w.residentName} ${w.room} ${w.title} ${w.bodyLocation}`.toLocaleLowerCase("de-CH").includes(needle),
  );
  const selected = wounds.find((w) => w.id === selectedId) ?? filtered[0] ?? null;
  const history = useApiData<{ entries: WoundEntry[] }>(selected ? `/api/wounds/${selected.id}/entries` : null);
  const overdue = open.filter((w) => w.overdue);
  const dueToday = open.filter((w) => w.dueToday);
  const progresses = open.map(healingProgress).filter((p): p is number => p !== null);
  const canWrite = data.data?.canWrite ?? false;
  const done = (message: string) => {
    setDialog(null);
    showToast(message);
    data.reload();
    history.reload();
  };

  return (
    <>
      <PageHeading
        eyebrow="CareCore Wunden"
        title="Wundübersicht"
        description="Aktive Wunden, fällige Versorgungen und Heilungsverläufe im Blick."
        action={
          canWrite
            ? { label: "Neue Wunde erfassen", onClick: () => setDialog({ kind: "wound", wound: null }) }
            : undefined
        }
      />
      <SummaryTiles
        label="Wundstatus"
        tiles={[
          { icon: "wounds", value: open.length, caption: "offene Wunden" },
          { icon: "calendar", value: dueToday.length, caption: "Versorgungen heute fällig", tone: "attention" },
          { icon: "alert", value: overdue.length, caption: "überfällig", tone: "critical" },
          {
            icon: "chart",
            value: progresses.length
              ? `${Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length)} %`
              : "–",
            caption: "mittlere Flächenabnahme",
          },
        ]}
      />
      {overdue.length > 0 && (
        <section className="critical-alert wound-alert" aria-label="Überfällige Wundversorgung">
          <span className="critical-symbol">
            <ModuleIcon name="alert" />
          </span>
          <div>
            <strong>
              {overdue.length} Versorgung{overdue.length === 1 ? "" : "en"} überfällig
            </strong>
            <p>{overdue.map((w) => `${w.residentName} · ${w.bodyLocation}`).join(" · ")}</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => setSelectedId(overdue[0].id)}>
            Fall auswählen <ModuleIcon name="chevron" className="button-icon" />
          </button>
        </section>
      )}
      {data.error && <LoadError message={data.error} onRetry={data.reload} />}
      <div className="wound-overview-layout">
        <section className="card wound-directory" aria-labelledby="wound-directory-title">
          <div className="wound-toolbar">
            <div>
              <h2 className="card-title" id="wound-directory-title">
                {filter === "Abgeschlossen" ? "Abgeschlossene Wunden" : "Wunden"}
              </h2>
              <p className="card-subtitle">
                {filtered.length} von {filter === "Abgeschlossen" ? wounds.length : open.length} Wundfällen
              </p>
            </div>
            <label className="resident-search">
              <ModuleIcon name="search" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Bewohner oder Wunde suchen"
                aria-label="Wunden durchsuchen"
              />
            </label>
            <div className="wound-status-filter" aria-label="Wundstatus filtern">
              {FILTERS.map((item) => (
                <button
                  className={filter === item ? "active" : ""}
                  type="button"
                  key={item}
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="wound-table-head" aria-hidden="true">
            <span>Bewohner &amp; Wunde</span>
            <span>Versorgung</span>
            <span>Heilung</span>
            <span>Status</span>
            <span />
          </div>
          <div className="wound-case-list">
            {filtered.map((wound) => {
              const tone = woundTone(wound);
              const progress = healingProgress(wound);
              return (
                <button
                  className={`wound-case-row ${selected?.id === wound.id ? "selected" : ""}`}
                  type="button"
                  key={wound.id}
                  onClick={() => setSelectedId(wound.id)}
                >
                  <span className={`resident-avatar ${tone === "critical" ? "critical" : ""}`}>{wound.initials}</span>
                  <span className="wound-case-main">
                    <strong>{wound.residentName}</strong>
                    <small>{[wound.room, wound.bodyLocation].filter(Boolean).join(" · ")}</small>
                    <span>
                      {wound.woundType ?? wound.diagnosis ?? "Wunde"}
                      {wound.category ? ` ${wound.category}` : ""} · {sizeLabel(wound.latest)}
                    </span>
                  </span>
                  <span className="wound-care-date">
                    <strong>{wound.latest ? formatDateTime(wound.latest.observedAt) : "Noch kein Eintrag"}</strong>
                    <small>{nextCareLabel(wound)}</small>
                  </span>
                  <span className="wound-progress">
                    <span>
                      <i style={{ width: `${Math.max(progress ?? 0, 0)}%` }} />
                    </span>
                    <strong>{progress === null ? "–" : `${progress} %`}</strong>
                  </span>
                  <span className={`status-badge ${tone}`}>{statusText(wound)}</span>
                  <ModuleIcon name="chevron" className="chevron" />
                </button>
              );
            })}
            {!data.loading && !filtered.length && (
              <EmptyState
                icon="wounds"
                title={wounds.length ? "Keine Wundfälle gefunden" : "Keine offenen Wunden"}
                text={
                  wounds.length
                    ? "Suchbegriff oder Statusfilter anpassen."
                    : "Neue Wunden über „Neue Wunde erfassen“ dokumentieren."
                }
              />
            )}
            {data.loading && !data.data && <p className="list-hint">Wunden werden geladen …</p>}
          </div>
        </section>

        {selected && (
          <aside className="wound-sidebar">
            <section className="card wound-focus-card" aria-live="polite">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Ausgewählter Fall</p>
                  <h2 className="card-title">{selected.residentName}</h2>
                  <p className="card-subtitle">{[selected.room, selected.careUnit].filter(Boolean).join(" · ")}</p>
                </div>
                <span className={`status-badge ${woundTone(selected)}`}>{statusText(selected)}</span>
              </div>
              <div className="wound-focus-body">
                <span className={`wound-focus-icon ${woundTone(selected)}`}>
                  <ModuleIcon name="wounds" />
                </span>
                <h3>{selected.title}</h3>
                <p>{sizeLabel(selected.latest)}</p>
                <dl>
                  <div>
                    <dt>Letzter Eintrag</dt>
                    <dd>
                      {selected.latest
                        ? `${formatDateTime(selected.latest.observedAt)} · ${selected.latest.author ?? "unbekannt"}`
                        : "–"}
                    </dd>
                  </div>
                  <div>
                    <dt>Nächste Versorgung</dt>
                    <dd>{nextCareLabel(selected)}</dd>
                  </div>
                  <div>
                    <dt>Verantwortlich</dt>
                    <dd>{selected.responsibleName ?? "Nicht festgelegt"}</dd>
                  </div>
                  <div>
                    <dt>Entstehung</dt>
                    <dd>
                      {ORIGIN_LABELS[selected.origin]} · festgestellt {formatDate(selected.discoveredAt)}
                    </dd>
                  </div>
                  <div>
                    <dt>Körperkarte</dt>
                    <dd>
                      {selected.bodyObservation
                        ? `${selected.bodyObservation.label} · ${selected.bodyObservation.location}`
                        : "Nicht verknüpft"}
                      {" · "}
                      <Link href={`/bewohner?resident=${selected.residentId}`}>Bewohnerakte</Link>
                    </dd>
                  </div>
                  {selected.treatmentPlan && (
                    <div>
                      <dt>Behandlungsplan</dt>
                      <dd>{selected.treatmentPlan}</dd>
                    </div>
                  )}
                  {selected.closedReason && (
                    <div>
                      <dt>Abschluss</dt>
                      <dd>{selected.closedReason}</dd>
                    </div>
                  )}
                </dl>
                <div className="wound-focus-progress">
                  <span>
                    <i style={{ width: `${Math.max(healingProgress(selected) ?? 0, 0)}%` }} />
                  </span>
                  <small>
                    {healingProgress(selected) === null
                      ? "Heilungsverlauf ab zwei Grössenmessungen"
                      : `Fläche ${formatCm(selected.firstArea)} → ${formatCm(selected.currentArea)} cm² (${healingProgress(selected)} % ${healingProgress(selected)! < 0 ? "Zunahme" : "Abnahme"})`}
                  </small>
                </div>
                {canWrite && (
                  <div className="wound-focus-actions">
                    {selected.status === "closed" ? (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() =>
                          void requestJson(`/api/wounds/${selected.id}`, {
                            method: "PATCH",
                            body: { status: "active" },
                          })
                            .then(() => done("Wunde wieder eröffnet"))
                            .catch((e: Error) => showToast(e.message))
                        }
                      >
                        Wieder eröffnen
                      </button>
                    ) : (
                      <>
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() => setDialog({ kind: "entry", wound: selected })}
                        >
                          Verlauf dokumentieren
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setDialog({ kind: "wound", wound: selected })}
                        >
                          Bearbeiten
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setDialog({ kind: "close", wound: selected })}
                        >
                          Abschliessen
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>
            <section className="card wound-schedule-card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Fotodokumentation</h2>
                  <p className="card-subtitle">{selected.photoCount} Fotos</p>
                </div>
              </div>
              <WoundPhotos
                key={selected.id}
                wound={selected}
                canWrite={canWrite}
                showToast={showToast}
                onChanged={data.reload}
              />
            </section>
            <section className="card wound-schedule-card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Wundverlauf</h2>
                  <p className="card-subtitle">{selected.entryCount} Einträge</p>
                </div>
              </div>
              <WoundTimeline entries={history.data?.entries ?? []} loading={history.loading && !history.data} />
            </section>
          </aside>
        )}
      </div>
      {dialog?.kind === "wound" && data.data && (
        <WoundDialog
          wound={dialog.wound}
          data={data.data}
          initialResidentId={dialog.residentId}
          initialObservationId={dialog.observationId}
          onClose={() => setDialog(null)}
          onSaved={done}
        />
      )}
      {dialog?.kind === "entry" && <EntryDialog wound={dialog.wound} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.kind === "close" && (
        <ReasonDialog
          eyebrow={`CareCore Wunden · ${dialog.wound.residentName}`}
          title="Wunde abschliessen"
          description={`${dialog.wound.title}. Abgeschlossene Wunden bleiben mit ihrem Verlauf erhalten und können wieder eröffnet werden.`}
          label="Grund des Abschlusses"
          placeholder="z. B. vollständig epithelisiert, Hautverhältnisse stabil"
          submitLabel="Abschliessen"
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            await requestJson(`/api/wounds/${dialog.wound.id}`, {
              method: "PATCH",
              body: { status: "closed", reason },
            });
            done(`${dialog.wound.residentName}: Wunde abgeschlossen`);
          }}
        />
      )}
    </>
  );
}

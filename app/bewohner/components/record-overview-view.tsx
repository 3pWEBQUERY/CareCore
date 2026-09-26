"use client";

import Link from "next/link";
import { BodyMap3D } from "./body-map-3d";
import { appointmentDateLabel, appointmentLocalParts } from "@/lib/resident-appointments";
import {
  CalendarDots,
  CaretDown,
  ClipboardText,
  FileText,
  Heartbeat,
  ListChecks,
  NotePencil,
  PencilSimple,
  Pill,
  Plus,
  Pulse,
  Stethoscope,
  Trash,
  User,
  FirstAidKit,
} from "@phosphor-icons/react";
import type { ResidentRecordState } from "./use-resident-record";

export function RecordOverviewView({ r }: { r: ResidentRecordState }) {
  const {
    resident,
    onAction,
    contentRef,
    entries,
    setActiveView,
    activeBodyObservationId,
    setActiveBodyObservationId,
    bodyObservations,
    bodyLoading,
    bodyError,
    placingBodyPoint,
    setPlacingBodyPoint,
    residentGender,
    appointmentsLoading,
    nextAppointment,
    genderLabel,
    newBodyObservation,
    editBodyObservation,
    archiveBodyObservation,
    openDocumentation,
  } = r;
  return (
    <main className="resident-record-content" ref={contentRef} key="overview">
      <section className="record-metrics" aria-label="Aktenübersicht">
        <div>
          <span className="record-metric-icon">
            <User aria-hidden="true" />
          </span>
          <span>
            <small>Bezugspflege</small>
            <strong>Anna Meier</strong>
          </span>
        </div>
        <div>
          <span className="record-metric-icon">
            <Heartbeat aria-hidden="true" />
          </span>
          <span>
            <small>Letzte Vitalwerte</small>
            <strong>Heute, 07:42</strong>
          </span>
        </div>
        <div>
          <span className="record-metric-icon">
            <Pill aria-hidden="true" />
          </span>
          <span>
            <small>Medikationen heute</small>
            <strong>4 von 6 erfolgt</strong>
          </span>
        </div>
        <div>
          <span className="record-metric-icon">
            <CalendarDots aria-hidden="true" />
          </span>
          <span>
            <small>Nächster Termin</small>
            <strong>
              {nextAppointment
                ? `${nextAppointment.title} · ${appointmentDateLabel(nextAppointment.starts_at, { day: "2-digit", month: "2-digit" })}, ${appointmentLocalParts(nextAppointment.starts_at).time}`
                : appointmentsLoading
                  ? "Wird geladen…"
                  : "Kein Termin geplant"}
            </strong>
          </span>
        </div>
      </section>

      <section className="record-card record-quick-access" aria-labelledby="quick-access-title">
        <div className="record-card-heading">
          <div>
            <span className="record-section-label">Direktzugriff</span>
            <h3 id="quick-access-title">Schnellaktionen</h3>
          </div>
          <span>8 Aktionen</span>
        </div>
        <div className="record-horizontal-actions">
          <button type="button" onClick={() => openDocumentation()}>
            <NotePencil aria-hidden="true" />
            <span>
              <strong>Dokumentieren</strong>
              <small>Pflegeeintrag</small>
            </span>
          </button>
          <button type="button" onClick={() => onAction("Vitalwerterfassung vorbereitet")}>
            <Heartbeat aria-hidden="true" />
            <span>
              <strong>Vitalwert</strong>
              <small>Messung erfassen</small>
            </span>
          </button>
          <button type="button" onClick={() => onAction("Medikationsgabe vorbereitet")}>
            <Pill aria-hidden="true" />
            <span>
              <strong>Medikation</strong>
              <small>Gabe erfassen</small>
            </span>
          </button>
          <button type="button" onClick={() => onAction("Aufgabe vorbereitet")}>
            <ListChecks aria-hidden="true" />
            <span>
              <strong>Aufgabe</strong>
              <small>Intervention planen</small>
            </span>
          </button>
          <button type="button" onClick={() => setActiveView("care-record")}>
            <ClipboardText aria-hidden="true" />
            <span>
              <strong>Pflegeplanung</strong>
              <small>Ziele öffnen</small>
            </span>
          </button>
          <button type="button" onClick={() => onAction("Wunddokumentation vorbereitet")}>
            <Pulse aria-hidden="true" />
            <span>
              <strong>Wunde</strong>
              <small>Status erfassen</small>
            </span>
          </button>
          <button type="button" onClick={() => onAction("Trinkmenge vorbereitet")}>
            <User aria-hidden="true" />
            <span>
              <strong>Trinkmenge</strong>
              <small>Flüssigkeit erfassen</small>
            </span>
          </button>
          <button type="button" onClick={() => onAction("Neue Einschätzung vorbereitet")}>
            <Stethoscope aria-hidden="true" />
            <span>
              <strong>Einschätzung</strong>
              <small>Assessment starten</small>
            </span>
          </button>
        </div>
      </section>

      <div className="resident-overview-layout">
        <section className="record-card body-map-card" aria-labelledby="body-map-title">
          <div className="record-card-heading">
            <div>
              <span className="record-section-label">Körperstatus</span>
              <h3 id="body-map-title">Körperübersicht</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setPlacingBodyPoint(true);
                setActiveBodyObservationId(null);
              }}
            >
              <Plus aria-hidden="true" /> Befund hinzufügen
            </button>
          </div>
          <div className="body-map-content">
            <div className="body-map-visual">
              <div className="body-map-legend" aria-label="Legende">
                <span className="redness">Rötung</span>
                <span className="wound">Wunde</span>
                <span className="fracture">Fraktur</span>
              </div>
              <BodyMap3D
                gender={residentGender}
                observations={bodyObservations.map((item) => ({
                  id: item.id,
                  kind: item.kind,
                  label: item.label,
                  x: Number(item.body_x),
                  y: Number(item.body_y),
                  z: Number(item.body_z),
                }))}
                selectedId={activeBodyObservationId}
                placing={placingBodyPoint}
                onSelect={(id) => {
                  setPlacingBodyPoint(false);
                  setActiveBodyObservationId(id);
                }}
                onPlace={newBodyObservation}
              />
              <span className="body-model-caption">
                {genderLabel === "Keine Angabe" || genderLabel === "Divers"
                  ? "Anatomisches Referenzmodell"
                  : `${genderLabel}es Körpermodell`}{" "}
                · 360° Ansicht
              </span>
              <a
                className="body-model-source"
                href="https://github.com/slorksmo/Human-Atlas"
                target="_blank"
                rel="noreferrer"
              >
                3D-Referenz: Human Atlas · CC BY 4.0
              </a>
            </div>

            <div className="body-observation-list" aria-label="Erfasste Körperstellen">
              {bodyLoading && <p className="body-observation-empty">Körperstatus wird geladen…</p>}
              {!bodyLoading && bodyObservations.length === 0 && (
                <div className="body-observation-empty">
                  <strong>Noch keine Körperbefunde</strong>
                  <p>Wunden, Rötungen und weitere Auffälligkeiten können direkt am Körpermodell markiert werden.</p>
                  <button className="secondary-button" type="button" onClick={() => setPlacingBodyPoint(true)}>
                    Körperstelle auswählen
                  </button>
                </div>
              )}
              {bodyError && (
                <p className="body-observation-error" role="alert">
                  {bodyError}
                </p>
              )}
              {bodyObservations.map((observation) => {
                const expanded = activeBodyObservationId === observation.id;
                return (
                  <section className={`body-observation ${expanded ? "expanded" : ""}`} key={observation.id}>
                    <button
                      className="body-observation-toggle"
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`body-observation-${observation.id}`}
                      onClick={() =>
                        setActiveBodyObservationId((current) => (current === observation.id ? null : observation.id))
                      }
                    >
                      <span className={`body-observation-icon ${observation.kind}`}>
                        <Pulse aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{observation.label}</strong>
                        <small>
                          {observation.location} · {observation.status}
                        </small>
                      </span>
                      <CaretDown aria-hidden="true" />
                    </button>
                    {expanded && (
                      <div className="body-observation-detail" id={`body-observation-${observation.id}`}>
                        <p>{observation.notes || "Keine ergänzenden Hinweise erfasst."}</p>
                        <dl>
                          <div>
                            <dt>Erfasst</dt>
                            <dd>{new Date(observation.created_at).toLocaleString("de-CH")}</dd>
                          </div>
                          <div>
                            <dt>Verantwortlich</dt>
                            <dd>{observation.author}</dd>
                          </div>
                        </dl>
                        <div className="body-observation-links">
                          {observation.wound_id ? (
                            <Link href={`/wundmanagement?wound=${observation.wound_id}`}>
                              <FirstAidKit aria-hidden="true" /> Wundakte öffnen
                            </Link>
                          ) : (
                            (observation.kind === "wound" || observation.kind === "redness") &&
                            resident.id && (
                              <Link href={`/wundmanagement?resident=${resident.id}&observation=${observation.id}`}>
                                <FirstAidKit aria-hidden="true" /> Als Wunde erfassen
                              </Link>
                            )
                          )}
                          <button type="button" onClick={() => editBodyObservation(observation)}>
                            <PencilSimple aria-hidden="true" /> Bearbeiten
                          </button>
                          <button type="button" onClick={() => archiveBodyObservation(observation)}>
                            <Trash aria-hidden="true" /> Archivieren
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="resident-overview-side">
          <section className="record-card record-alert-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Pflegehinweis</span>
                <h3>Aktuell wichtig</h3>
              </div>
              <span>{resident.lastUpdate}</span>
            </div>
            <div className={`record-clinical-alert ${resident.status}`}>
              <Pulse aria-hidden="true" />
              <div>
                <strong>{resident.note}</strong>
                <p>Bitte im laufenden Dienst beachten und Veränderungen zeitnah dokumentieren.</p>
              </div>
            </div>
          </section>

          <section className="record-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Bewohner</span>
                <h3>Stammdaten</h3>
              </div>
              <button type="button" onClick={() => setActiveView("master-data")}>
                Alle Stammdaten
              </button>
            </div>
            <dl className="record-details">
              <div>
                <dt>Zimmer</dt>
                <dd>{resident.room}</dd>
              </div>
              <div>
                <dt>Wohnbereich</dt>
                <dd>{resident.unit}</dd>
              </div>
              <div>
                <dt>Pflegebedarf</dt>
                <dd>{resident.careLevel}</dd>
              </div>
              <div>
                <dt>Hausarzt</dt>
                <dd>Dr. med. Martin Weber</dd>
              </div>
              <div>
                <dt>Eintritt</dt>
                <dd>12. Februar 2024</dd>
              </div>
              <div>
                <dt>Aktenstatus</dt>
                <dd>Vollständig</dd>
              </div>
            </dl>
          </section>

          <button className="record-document-button" type="button" onClick={() => setActiveView("documents")}>
            <FileText aria-hidden="true" />
            <span>
              <strong>Dokumente und Berichte</strong>
              <small>12 hinterlegte Dokumente</small>
            </span>
          </button>
        </aside>

        <section className="record-card record-overview-history">
          <div className="record-card-heading">
            <div>
              <span className="record-section-label">Dokumentation</span>
              <h3>Letzte Einträge</h3>
            </div>
            <button type="button" onClick={() => openDocumentation()}>
              Neue Dokumentation
            </button>
          </div>
          <div className="record-history">
            {entries.map((entry) => (
              <button
                className="record-history-entry"
                type="button"
                key={entry.id}
                onClick={() => openDocumentation(entry)}
                aria-label={`${entry.title} öffnen`}
              >
                <time>{entry.time}</time>
                <i />
                <span>
                  <strong>{entry.title}</strong>
                  <p>{entry.text}</p>
                  <small>{entry.author}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { CalendarDots, Check, ClipboardText, Heartbeat, ListChecks, Pulse, User, Warning } from "@phosphor-icons/react";
import { careDomains } from "./resident-record-data";
import type { ResidentRecordState } from "./use-resident-record";

export function RecordCareView({ r }: { r: ResidentRecordState }) {
  const { resident, onAction, contentRef, setActiveCareDomainId, activeCareDomain } = r;
  return (
    <main className="resident-record-content record-care-view" ref={contentRef} key="care-record">
      <div className="care-record-page-heading">
        <div>
          <span className="record-section-label">Pflegeakte</span>
          <h3>Pflegeprofil</h3>
          <p>Pflegerelevante Ressourcen, Risiken, Ziele und Maßnahmen für {resident.name}.</p>
        </div>
        <div className="care-record-heading-actions">
          <button className="secondary-button" type="button" onClick={() => onAction("Neue Einschätzung vorbereitet")}>
            Neue Einschätzung
          </button>
          <button className="primary-button" type="button" onClick={() => onAction("Pflegeplanung geöffnet")}>
            <ClipboardText aria-hidden="true" /> Pflegeplanung öffnen
          </button>
        </div>
      </div>

      <section className="care-record-status" aria-label="Status der Pflegeakte">
        <div>
          <span>
            <Check aria-hidden="true" />
          </span>
          <p>
            <small>Pflegeplanung</small>
            <strong>Aktuell und bestätigt</strong>
          </p>
        </div>
        <div>
          <span>
            <Warning aria-hidden="true" />
          </span>
          <p>
            <small>Offene Risiken</small>
            <strong>2 in Beobachtung</strong>
          </p>
        </div>
        <div>
          <span>
            <ClipboardText aria-hidden="true" />
          </span>
          <p>
            <small>Aktive Maßnahmen</small>
            <strong>14 geplant</strong>
          </p>
        </div>
        <div>
          <span>
            <CalendarDots aria-hidden="true" />
          </span>
          <p>
            <small>Nächste Evaluation</small>
            <strong>16. September 2026</strong>
          </p>
        </div>
      </section>

      <div className="care-record-layout">
        <div className="care-record-primary">
          <section className="record-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Pflegeprofil</span>
                <h3>Pflegebereiche</h3>
              </div>
              <span>6 Bereiche</span>
            </div>
            <div className="care-domain-list">
              {careDomains.map((domain) => (
                <button
                  className={activeCareDomain.id === domain.id ? "active" : ""}
                  type="button"
                  key={domain.id}
                  aria-pressed={activeCareDomain.id === domain.id}
                  onClick={() => setActiveCareDomainId(domain.id)}
                >
                  <span className="care-domain-icon">
                    {domain.id === "mobility" || domain.id === "sleep" ? (
                      <Pulse aria-hidden="true" />
                    ) : domain.id === "nutrition" ? (
                      <Heartbeat aria-hidden="true" />
                    ) : domain.id === "cognition" ? (
                      <User aria-hidden="true" />
                    ) : (
                      <ClipboardText aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <strong>{domain.label}</strong>
                    <small>{domain.summary}</small>
                  </span>
                  <span className={`status-badge ${domain.status}`}>{domain.statusLabel}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="record-card care-domain-detail" aria-live="polite">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Ausgewählter Pflegebereich</span>
                <h3>{activeCareDomain.label}</h3>
              </div>
              <button type="button" onClick={() => onAction(`${activeCareDomain.label} wird bearbeitet`)}>
                Bearbeiten
              </button>
            </div>
            <div className="care-domain-summary">
              <span className={`status-badge ${activeCareDomain.status}`}>{activeCareDomain.statusLabel}</span>
              <p>{activeCareDomain.summary}</p>
            </div>
            <div className="care-goal-grid">
              <section>
                <span className="care-detail-icon">
                  <Check aria-hidden="true" />
                </span>
                <div>
                  <small>Pflegeziel</small>
                  <strong>{activeCareDomain.goal}</strong>
                  <p>Evaluation am 16. September 2026</p>
                </div>
              </section>
              <section>
                <span className="care-detail-icon">
                  <ListChecks aria-hidden="true" />
                </span>
                <div>
                  <small>Geplante Maßnahmen</small>
                  <ul>
                    {activeCareDomain.measures.map((measure) => (
                      <li key={measure}>{measure}</li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </section>
        </div>

        <aside className="care-record-secondary">
          <section className="record-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Prioritäten</span>
                <h3>Aktuell beachten</h3>
              </div>
            </div>
            <div className="care-priority-list">
              <div className="critical">
                <Warning aria-hidden="true" />
                <span>
                  <strong>Sturzrisiko erhöht</strong>
                  <small>Nach Sturzereignis neurologische Kontrollen bis 14:00 Uhr.</small>
                </span>
              </div>
              <div className="attention">
                <Pulse aria-hidden="true" />
                <span>
                  <strong>Schlaf beobachten</strong>
                  <small>Nächtliche Wachphasen und Bewegungsdrang dokumentieren.</small>
                </span>
              </div>
            </div>
          </section>

          <section className="record-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Assessments</span>
                <h3>Aktuelle Einschätzungen</h3>
              </div>
              <button type="button" onClick={() => onAction("Alle Assessments geöffnet")}>
                Alle anzeigen
              </button>
            </div>
            <div className="care-assessment-list">
              <div>
                <span>Sturzrisiko</span>
                <strong className="critical">Hoch</strong>
                <small>Heute</small>
              </div>
              <div>
                <span>Dekubitusrisiko</span>
                <strong className="stable">Niedrig</strong>
                <small>Gestern</small>
              </div>
              <div>
                <span>Schmerz</span>
                <strong className="attention">NRS 3</strong>
                <small>07:45 Uhr</small>
              </div>
              <div>
                <span>Mangelernährung</span>
                <strong className="stable">Kein Risiko</strong>
                <small>02.09.2026</small>
              </div>
            </div>
          </section>

          <section className="record-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Pflegenetzwerk</span>
                <h3>Beteiligte Fachpersonen</h3>
              </div>
            </div>
            <div className="care-team-list">
              <div>
                <span className="avatar">AM</span>
                <p>
                  <strong>Anna Meier</strong>
                  <small>Bezugspflege · Pflegefachfrau HF</small>
                </p>
              </div>
              <div>
                <span className="avatar">MW</span>
                <p>
                  <strong>Dr. Martin Weber</strong>
                  <small>Hausarzt</small>
                </p>
              </div>
              <div>
                <span className="avatar">LF</span>
                <p>
                  <strong>Lea Frei</strong>
                  <small>Fachfrau Gesundheit</small>
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

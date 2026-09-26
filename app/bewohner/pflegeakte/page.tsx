"use client";

import { useMemo, useState } from "react";
import ModulePageShell from "@/app/components/module-page-shell";
import { ModuleIcon } from "@/app/components/module-icon";
import { careResidents, careDomains } from "./care-records-data";
import { CareRecordEditor } from "./care-record-editor";
import { RecordFilter } from "./care-records-data";

const recordFilters: RecordFilter[] = ["Alle", "Aktuell", "Evaluation fällig", "Entwurf"];

export default function CareRecordsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RecordFilter>("Alle");
  const [selectedResidentId, setSelectedResidentId] = useState("hm");
  const [selectedDomainId, setSelectedDomainId] = useState("mobility");
  const [recordEditorOpen, setRecordEditorOpen] = useState(false);

  const filteredResidents = useMemo(
    () =>
      careResidents.filter((resident) => {
        const matchesFilter = filter === "Alle" || resident.status === filter;
        const searchable =
          `${resident.name} ${resident.room} ${resident.unit} ${resident.careLevel} ${resident.focus}`.toLocaleLowerCase(
            "de-CH",
          );
        return matchesFilter && searchable.includes(query.trim().toLocaleLowerCase("de-CH"));
      }),
    [filter, query],
  );
  const selectedResident = careResidents.find((resident) => resident.id === selectedResidentId) ?? careResidents[0];
  const selectedDomain = careDomains.find((domain) => domain.id === selectedDomainId) ?? careDomains[0];

  return (
    <ModulePageShell
      activeModule="residents"
      activeChild="Pflegeakte"
      pageClass="care-records-page"
      locationSecondary="Gesamtes Haus · alle Wohnbereiche"
    >
      {(showToast) => (
        <main className="workspace module-workspace">
          <section className="page-heading care-page-heading" aria-labelledby="care-records-title">
            <div className="heading-copy">
              <p className="eyebrow">CareCore Bewohner</p>
              <h1 id="care-records-title">Pflegeakten</h1>
              <p>Pflegeprofile, Ziele, Maßnahmen und Evaluationen aller aktiven Bewohner.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => setRecordEditorOpen(true)}>
              <ModuleIcon name="plus" className="button-icon" />
              Pflegeakte erstellen
            </button>
          </section>

          <section className="wound-summary" aria-label="Status der Pflegeakten">
            <div>
              <span className="summary-icon">
                <ModuleIcon name="residents" />
              </span>
              <span>
                <strong>48</strong>
                <small>aktive Pflegeakten</small>
              </span>
            </div>
            <div>
              <span className="summary-icon">
                <ModuleIcon name="check" />
              </span>
              <span>
                <strong>42</strong>
                <small>vollständig &amp; aktuell</small>
              </span>
            </div>
            <div>
              <span className="summary-icon attention">
                <ModuleIcon name="calendar" />
              </span>
              <span>
                <strong>4</strong>
                <small>Evaluationen fällig</small>
              </span>
            </div>
            <div>
              <span className="summary-icon info">
                <ModuleIcon name="note" />
              </span>
              <span>
                <strong>2</strong>
                <small>Planungen im Entwurf</small>
              </span>
            </div>
          </section>

          <section className="critical-alert care-evaluation-alert" aria-label="Fällige Pflegeevaluation">
            <span className="critical-symbol">
              <ModuleIcon name="alert" />
            </span>
            <div>
              <strong>Heute evaluieren · Peter Aebischer</strong>
              <p>Die Pflegeziele für Flüssigkeitsmanagement und Hautschutz sind heute zur Evaluation fällig.</p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setSelectedResidentId("pa");
                showToast("Pflegeakte von Peter Aebischer ausgewählt");
              }}
            >
              Pflegeakte auswählen <ModuleIcon name="chevron" className="button-icon" />
            </button>
          </section>

          <div className="care-page-layout">
            <section className="card care-resident-browser" aria-labelledby="care-resident-list-title">
              <div className="care-resident-toolbar">
                <div>
                  <h2 className="card-title" id="care-resident-list-title">
                    Bewohner
                  </h2>
                  <p className="card-subtitle">
                    {filteredResidents.length} von {careResidents.length} Demo-Akten
                  </p>
                </div>
                <label className="resident-search">
                  <ModuleIcon name="search" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Bewohner oder Pflegefokus"
                    aria-label="Pflegeakten durchsuchen"
                  />
                </label>
                <div className="care-record-filters" aria-label="Pflegeaktenstatus filtern">
                  {recordFilters.map((item) => (
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
              <div className="care-resident-list">
                {filteredResidents.map((resident) => (
                  <button
                    className={`care-resident-row ${selectedResident.id === resident.id ? "selected" : ""}`}
                    type="button"
                    key={resident.id}
                    onClick={() => setSelectedResidentId(resident.id)}
                  >
                    <span className="resident-avatar">{resident.initials}</span>
                    <span>
                      <strong>{resident.name}</strong>
                      <small>
                        {resident.room} · {resident.unit}
                      </small>
                      <em>{resident.focus}</em>
                    </span>
                    <span className={`status-badge ${resident.tone}`}>{resident.status}</span>
                    <ModuleIcon name="chevron" />
                  </button>
                ))}
                {filteredResidents.length === 0 && (
                  <div className="resident-empty">
                    <ModuleIcon name="search" />
                    <strong>Keine Pflegeakten gefunden</strong>
                    <p>Suchbegriff oder Statusfilter anpassen.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="care-profile-workspace" aria-live="polite">
              <section className="card care-profile-header">
                <div className="care-profile-identity">
                  <span className="resident-avatar">{selectedResident.initials}</span>
                  <div>
                    <p className="eyebrow">Ausgewählte Pflegeakte</p>
                    <h2>{selectedResident.name}</h2>
                    <span>
                      {selectedResident.room} · {selectedResident.unit} · {selectedResident.careLevel}
                    </span>
                  </div>
                </div>
                <div className="care-profile-actions">
                  <span className={`status-badge ${selectedResident.tone}`}>{selectedResident.status}</span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => showToast("Neue Einschätzung vorbereitet")}
                  >
                    Neue Einschätzung
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => showToast(`Pflegeplanung von ${selectedResident.name} geöffnet`)}
                  >
                    Pflegeplanung öffnen
                  </button>
                </div>
              </section>

              <section className="care-record-status" aria-label={`Status der Pflegeakte von ${selectedResident.name}`}>
                <div>
                  <span>
                    <ModuleIcon name="check" />
                  </span>
                  <p>
                    <small>Vollständigkeit</small>
                    <strong>{selectedResident.completeness}% dokumentiert</strong>
                  </p>
                </div>
                <div>
                  <span>
                    <ModuleIcon name="alert" />
                  </span>
                  <p>
                    <small>Offene Risiken</small>
                    <strong>{selectedResident.risks} in Beobachtung</strong>
                  </p>
                </div>
                <div>
                  <span>
                    <ModuleIcon name="tasks" />
                  </span>
                  <p>
                    <small>Aktive Maßnahmen</small>
                    <strong>{selectedResident.measures} geplant</strong>
                  </p>
                </div>
                <div>
                  <span>
                    <ModuleIcon name="calendar" />
                  </span>
                  <p>
                    <small>Nächste Evaluation</small>
                    <strong>{selectedResident.evaluation}</strong>
                  </p>
                </div>
              </section>

              <div className="care-profile-grid">
                <div className="care-record-primary">
                  <section className="card">
                    <div className="card-header">
                      <div>
                        <p className="eyebrow">Pflegeprofil</p>
                        <h2 className="card-title">Pflegebereiche</h2>
                        <p className="card-subtitle">6 Bereiche der aktuellen Pflegeplanung</p>
                      </div>
                    </div>
                    <div className="care-domain-list">
                      {careDomains.map((domain) => (
                        <button
                          className={selectedDomain.id === domain.id ? "active" : ""}
                          type="button"
                          key={domain.id}
                          aria-pressed={selectedDomain.id === domain.id}
                          onClick={() => setSelectedDomainId(domain.id)}
                        >
                          <span className="care-domain-icon">
                            <ModuleIcon name={domain.icon} />
                          </span>
                          <span>
                            <strong>{domain.label}</strong>
                            <small>{domain.summary}</small>
                          </span>
                          <span className={`status-badge ${domain.tone}`}>{domain.status}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="card care-domain-detail">
                    <div className="card-header">
                      <div>
                        <p className="eyebrow">Ausgewählter Pflegebereich</p>
                        <h2 className="card-title">{selectedDomain.label}</h2>
                      </div>
                      <button
                        className="quiet-button"
                        type="button"
                        onClick={() => showToast(`${selectedDomain.label} wird bearbeitet`)}
                      >
                        Bearbeiten
                      </button>
                    </div>
                    <div className="care-domain-summary">
                      <span className={`status-badge ${selectedDomain.tone}`}>{selectedDomain.status}</span>
                      <p>{selectedDomain.summary}</p>
                    </div>
                    <div className="care-goal-grid">
                      <section>
                        <span className="care-detail-icon">
                          <ModuleIcon name="check" />
                        </span>
                        <div>
                          <small>Pflegeziel</small>
                          <strong>{selectedDomain.goal}</strong>
                          <p>Evaluation: {selectedResident.evaluation}</p>
                        </div>
                      </section>
                      <section>
                        <span className="care-detail-icon">
                          <ModuleIcon name="tasks" />
                        </span>
                        <div>
                          <small>Geplante Maßnahmen</small>
                          <ul>
                            {selectedDomain.measures.map((measure) => (
                              <li key={measure}>{measure}</li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    </div>
                  </section>
                </div>

                <aside className="care-record-secondary">
                  <section className="card">
                    <div className="card-header">
                      <div>
                        <p className="eyebrow">Prioritäten</p>
                        <h2 className="card-title">Aktuell beachten</h2>
                      </div>
                    </div>
                    <div className="care-priority-list">
                      <div className="critical">
                        <ModuleIcon name="alert" />
                        <span>
                          <strong>{selectedResident.focus}</strong>
                          <small>Im laufenden Dienst beobachten und Veränderungen zeitnah dokumentieren.</small>
                        </span>
                      </div>
                      <div className="attention">
                        <ModuleIcon name="pulse" />
                        <span>
                          <strong>Evaluation im Blick</strong>
                          <small>Nächster Termin: {selectedResident.evaluation}</small>
                        </span>
                      </div>
                    </div>
                  </section>
                  <section className="card">
                    <div className="card-header">
                      <div>
                        <p className="eyebrow">Pflegenetzwerk</p>
                        <h2 className="card-title">Verantwortliche Personen</h2>
                      </div>
                    </div>
                    <div className="care-team-list">
                      <div>
                        <span className="avatar">
                          {selectedResident.owner
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </span>
                        <p>
                          <strong>{selectedResident.owner}</strong>
                          <small>Bezugspflege · Pflegefachperson</small>
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
            </section>
          </div>
          <CareRecordEditor open={recordEditorOpen} onClose={() => setRecordEditorOpen(false)} onSuccess={showToast} />
        </main>
      )}
    </ModulePageShell>
  );
}

"use client";

import {
  ArrowsLeftRight,
  CalendarDots,
  ClipboardText,
  Heartbeat,
  NotePencil,
  Pill,
  Pulse,
  Warning,
} from "@phosphor-icons/react";
import { HistoryFilter } from "./resident-record-data";
import type { ResidentRecordState } from "./use-resident-record";

export function RecordHistoryView({ r }: { r: ResidentRecordState }) {
  const {
    resident,
    onAction,
    contentRef,
    entries,
    setActiveView,
    historyFilter,
    setHistoryFilter,
    visibleHistoryEntries,
    openDocumentation,
  } = r;
  return (
    <main className="resident-record-content record-history-view" ref={contentRef} key="history">
      <div className="record-subpage-heading">
        <div>
          <span className="record-section-label">Bewohnerakte</span>
          <h3>Verlauf</h3>
          <p>Chronologische Übersicht aller pflege- und behandlungsrelevanten Ereignisse von {resident.name}.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => openDocumentation()}>
          <NotePencil aria-hidden="true" /> Neuer Eintrag
        </button>
      </div>

      <section className="record-view-stats" aria-label="Verlaufsübersicht">
        <div>
          <span>
            <ClipboardText aria-hidden="true" />
          </span>
          <p>
            <small>Diese Woche</small>
            <strong>28 Ereignisse</strong>
          </p>
        </div>
        <div>
          <span>
            <Heartbeat aria-hidden="true" />
          </span>
          <p>
            <small>Heute dokumentiert</small>
            <strong>4 Einträge</strong>
          </p>
        </div>
        <div>
          <span className="attention">
            <Warning aria-hidden="true" />
          </span>
          <p>
            <small>In Beobachtung</small>
            <strong>2 Entwicklungen</strong>
          </p>
        </div>
        <div>
          <span>
            <ArrowsLeftRight aria-hidden="true" />
          </span>
          <p>
            <small>Letzte Übergabe</small>
            <strong>Heute, 06:55</strong>
          </p>
        </div>
      </section>

      <div className="history-layout">
        <section className="record-card history-card" aria-labelledby="history-timeline-title">
          <div className="record-card-heading">
            <div>
              <span className="record-section-label">Chronologie</span>
              <h3 id="history-timeline-title">Aktivitäten und Ereignisse</h3>
            </div>
            <span>{visibleHistoryEntries.length} Einträge</span>
          </div>
          <div className="history-filters" aria-label="Verlauf filtern">
            {(["Alle", "Pflege", "Vitalwerte", "Medikation", "Termine"] as HistoryFilter[]).map((filter) => (
              <button
                className={historyFilter === filter ? "active" : ""}
                type="button"
                key={filter}
                aria-pressed={historyFilter === filter}
                onClick={() => setHistoryFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="resident-history-timeline">
            {[...new Set(visibleHistoryEntries.map((entry) => entry.date))].map((date) => (
              <section className="resident-history-day" key={date} aria-label={date}>
                <h4>{date}</h4>
                {visibleHistoryEntries
                  .filter((entry) => entry.date === date)
                  .map((entry) => (
                    <article className="resident-history-entry" key={entry.id}>
                      <time>{entry.time}</time>
                      <span className={`resident-history-marker ${entry.tone}`}>
                        {entry.category === "Medikation" ? (
                          <Pill aria-hidden="true" />
                        ) : entry.category === "Vitalwerte" ? (
                          <Heartbeat aria-hidden="true" />
                        ) : entry.category === "Termine" ? (
                          <CalendarDots aria-hidden="true" />
                        ) : (
                          <Pulse aria-hidden="true" />
                        )}
                      </span>
                      <div>
                        <span className="history-entry-category">{entry.category}</span>
                        <h5>{entry.title}</h5>
                        <p>{entry.description}</p>
                        <small>{entry.author}</small>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const documentationEntry = entries.find((item) => item.id === entry.documentationId);
                          if (documentationEntry) openDocumentation(documentationEntry);
                          else onAction(`${entry.title} geöffnet`);
                        }}
                      >
                        Öffnen
                      </button>
                    </article>
                  ))}
              </section>
            ))}
          </div>
        </section>

        <aside className="history-sidebar">
          <section className="record-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Im Fokus</span>
                <h3>Aktuelle Entwicklungen</h3>
              </div>
            </div>
            <div className="history-focus-list">
              <article className="critical">
                <Warning aria-hidden="true" />
                <div>
                  <strong>Wundheilung beobachten</strong>
                  <p>Verbandwechsel am linken Unterarm morgen um 08:00 Uhr.</p>
                  <button type="button" onClick={() => onAction("Wundmanagement geöffnet")}>
                    Wundmanagement öffnen
                  </button>
                </div>
              </article>
              <article className="attention">
                <Pulse aria-hidden="true" />
                <div>
                  <strong>Rötung kontrollieren</strong>
                  <p>Erneute Hautkontrolle während der Abendpflege vorgesehen.</p>
                  <button type="button" onClick={() => setActiveView("overview")}>
                    Körperübersicht öffnen
                  </button>
                </div>
              </article>
            </div>
          </section>
          <section className="record-card history-next-event">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Nächster Termin</span>
                <h3>Arztvisite</h3>
              </div>
            </div>
            <div>
              <CalendarDots aria-hidden="true" />
              <p>
                <strong>Heute, 09:30 Uhr</strong>
                <small>Visitenzimmer · Dr. Martin Weber</small>
              </p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

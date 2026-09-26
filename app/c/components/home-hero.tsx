"use client";

import { Icon } from "./dashboard-shared";
import type { DashboardState } from "./use-dashboard";

export function HomeHero({ r }: { r: DashboardState }) {
  const {
    router,
    assignedResidents,
    changes,
    notes,
    notesLoading,
    notesError,
    setViewingNote,
    primaryCareUnitName,
    dashboardEditing,
    setDashboardEditing,
    openNote,
    formattedDate,
    formattedTime,
    greeting,
    firstName,
    openTasks,
    nextTasks,
    currentScope,
  } = r;
  return (
    <section className="home-hero" aria-labelledby="page-title">
      <div className="home-hero-top">
        <span className="home-kicker">
          <Icon name="pulse" /> Mein Arbeitsplatz
        </span>
        <div className="home-hero-tools">
          <span className="home-scope">
            <Icon name="building" />
            {primaryCareUnitName || "Gesamtes Haus"}
          </span>
          <button
            className="home-edit-button"
            type="button"
            aria-pressed={dashboardEditing}
            onClick={() => setDashboardEditing((value) => !value)}
          >
            <Icon name="settings" />
            {dashboardEditing ? "Fertig" : "Arbeitsplatz bearbeiten"}
          </button>
        </div>
      </div>
      <div className="home-hero-intro">
        <div>
          <p className="home-date">{formattedDate}</p>
          <h1 id="page-title">
            {greeting}, {firstName}.
          </h1>
          <p>
            Das ist dein Überblick für {currentScope}. Notizen, Aufgaben und Bewohner-Neuigkeiten sind hier an einem
            Ort.
          </p>
        </div>
        <div className="home-clock" aria-label={`Aktuelle Uhrzeit ${formattedTime}`}>
          <strong>{formattedTime}</strong>
          <span>Uhr · Zürich</span>
        </div>
      </div>
      <div className="home-desk-grid">
        <section className="home-desk-card home-shortcuts" aria-labelledby="home-shortcuts-title">
          <div className="home-card-head">
            <div>
              <p className="eyebrow">Direkt weiter</p>
              <h2 id="home-shortcuts-title">Schnellzugriff</h2>
            </div>
          </div>
          <div className="home-shortcut-grid">
            <button type="button" onClick={() => router.push("/c/bewohner")}>
              <span>
                <Icon name="residents" />
              </span>
              Bewohner
            </button>
            <button type="button" onClick={() => router.push("/c/pflegedokumentation")}>
              <span>
                <Icon name="note" />
              </span>
              Dokumentation
            </button>
            <button type="button" onClick={() => router.push("/c/betrieb/aufgaben")}>
              <span>
                <Icon name="tasks" />
              </span>
              Aufgaben
            </button>
            <button type="button" onClick={() => router.push("/c/betrieb/schicht/kalender")}>
              <span>
                <Icon name="calendar" />
              </span>
              Kalender
            </button>
          </div>
        </section>
        <section className="home-desk-card home-notes" aria-labelledby="home-notes-title">
          <div className="home-card-head">
            <div>
              <p className="eyebrow">Nur für dich sichtbar</p>
              <h2 id="home-notes-title">Meine Notizen</h2>
            </div>
            <button type="button" aria-label="Notiz erstellen" onClick={() => openNote("new")}>
              <Icon name="plus" />
            </button>
          </div>
          {notesError ? (
            <p className="home-card-message error">{notesError}</p>
          ) : notesLoading ? (
            <p className="home-card-message">Notizen werden geladen…</p>
          ) : notes.length ? (
            <div className="home-note-list">
              {notes.map((note) => (
                <button type="button" key={note.id} onClick={() => setViewingNote(note)}>
                  <span>
                    <strong>{note.title}</strong>
                    {note.pinned && <small>Fixiert</small>}
                  </span>
                  <p>{note.body}</p>
                  <time>
                    {new Date(note.updated_at).toLocaleDateString("de-CH", { day: "2-digit", month: "short" })}
                  </time>
                </button>
              ))}
            </div>
          ) : (
            <div className="home-notes-empty">
              <Icon name="note" />
              <strong>Platz für deine Gedanken</strong>
              <p>
                Halte persönliche To-dos und Merkpunkte fest. Klinische Einträge gehören weiterhin in die Bewohnerakte.
              </p>
              <button type="button" onClick={() => openNote("new")}>
                Erste Notiz erstellen <Icon name="chevron" />
              </button>
            </div>
          )}
        </section>
        <section className="home-desk-card home-day-card" aria-labelledby="home-day-title">
          <div className="home-card-head">
            <div>
              <p className="eyebrow">Im Dienst</p>
              <h2 id="home-day-title">Heute wichtig</h2>
            </div>
            <span className="home-count">{openTasks.length} offen</span>
          </div>
          <div className="home-day-summary">
            <strong>{assignedResidents.length}</strong>
            <span>Bewohner im Blick</span>
            <i />
            <strong>{changes.filter((item) => item.type === "critical").length}</strong>
            <span>wichtige Einträge</span>
          </div>
          <div className="home-day-tasks">
            {nextTasks.length ? (
              nextTasks.map((task) => (
                <button key={task.id} type="button" onClick={() => router.push("/c/betrieb/aufgaben")}>
                  <span className="home-task-time">{task.time}</span>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.resident || currentScope}</small>
                  </span>
                  <Icon name="chevron" />
                </button>
              ))
            ) : (
              <p>Keine terminierten Aufgaben offen.</p>
            )}
          </div>
          <button className="home-card-footer" type="button" onClick={() => router.push("/c/betrieb/aufgaben")}>
            Aufgaben öffnen <Icon name="chevron" />
          </button>
        </section>
      </div>
    </section>
  );
}

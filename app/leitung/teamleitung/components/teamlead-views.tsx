"use client";

import {
  Archive,
  ArrowClockwise,
  CalendarDots,
  Clock,
  DotsThree,
  PencilSimple,
  UsersThree,
} from "@phosphor-icons/react";
import { SidebarTooltip } from "@/app/components/app-sidebar";
import { TeamleadRow, initials, labelRole } from "./teamlead-utils";

export function EmployeesView({
  rows,
  isArchived,
  onUpdate,
  onSelect,
}: {
  rows: TeamleadRow[];
  isArchived: (row: TeamleadRow) => boolean;
  onUpdate: (id: string, action: "archive" | "restore") => void;
  onSelect: (employee: TeamleadRow) => void;
}) {
  return (
    <section className="teamlead-grid teamlead-employees-grid">
      <article className="teamlead-panel">
        <div className="teamlead-panel-head">
          <div>
            <p className="eyebrow">TEAMVERZEICHNIS</p>
            <h2>Mitarbeitende & Rollen</h2>
            <span>{rows.length} Profile im Überblick</span>
          </div>
          <button type="button" className="teamlead-icon-button" aria-label="Weitere Optionen">
            <DotsThree />
          </button>
        </div>
        <div className="teamlead-table teamlead-employee-table">
          <div className="teamlead-table-head">
            <span>Mitarbeiter</span>
            <span>Rolle</span>
            <span>Arbeitsplatz</span>
            <span>Status</span>
            <span>Aktionen</span>
          </div>
          {rows.map((row) => (
            <div
              className="teamlead-table-row teamlead-employee-row"
              role="button"
              tabIndex={0}
              key={row.id}
              onClick={() => onSelect(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(row);
                }
              }}
            >
              <div className="teamlead-person">
                <b>{initials(row.display_name)}</b>
                <span>
                  <strong>{row.display_name}</strong>
                  <small>@{row.username}</small>
                </span>
              </div>
              <span className="teamlead-role">{labelRole(row.role)}</span>
              <span>{row.care_unit_name || "Kein fester Bereich"}</span>
              <span className={`teamlead-status ${isArchived(row) ? "archived" : "active"}`}>
                <i />
                {isArchived(row) ? "Archiviert" : "Aktiv"}
              </span>
              <span className="teamlead-row-actions">
                <button
                  className="teamlead-row-icon"
                  type="button"
                  aria-label={`${row.display_name} bearbeiten`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(row);
                  }}
                >
                  <PencilSimple />
                  <SidebarTooltip label="Mitarbeiter bearbeiten" />
                </button>
                <button
                  className="teamlead-row-icon"
                  type="button"
                  aria-label={
                    isArchived(row) ? `${row.display_name} wiederherstellen` : `${row.display_name} archivieren`
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onUpdate(row.id, isArchived(row) ? "restore" : "archive");
                  }}
                >
                  {isArchived(row) ? <ArrowClockwise /> : <Archive />}
                  <SidebarTooltip
                    label={isArchived(row) ? "Mitarbeiter wiederherstellen" : "Mitarbeiter archivieren"}
                  />
                </button>
              </span>
            </div>
          ))}
        </div>
      </article>
      <aside className="teamlead-aside">
        <article className="teamlead-panel teamlead-role-card">
          <p className="eyebrow">ROLLEN & ZUGRIFFE</p>
          <h2>Verteilung im Team</h2>
          <div className="teamlead-role-breakdown">
            {["leitung", "pflege", "arzt", "mitarbeitende:r"].map((role) => (
              <div key={role}>
                <span>
                  <i className={`role-dot ${role}`} />
                  {labelRole(role)}
                </span>
                <strong>{rows.filter((row) => row.role === role && !isArchived(row)).length}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="teamlead-info-card">
          <UsersThree />
          <div>
            <strong>Team aktuell halten</strong>
            <p>Klicke auf ein Profil, um Rolle, Arbeitsbereich und Archivstatus zu verwalten.</p>
          </div>
        </article>
      </aside>
    </section>
  );
}

export function ShiftsView({
  rows,
  isArchived,
  onUpdate,
}: {
  rows: TeamleadRow[];
  isArchived: (row: TeamleadRow) => boolean;
  onUpdate: (id: string, action: "archive" | "restore") => void;
}) {
  return (
    <section className="teamlead-grid teamlead-shifts-grid">
      <article className="teamlead-panel">
        <div className="teamlead-panel-head">
          <div>
            <p className="eyebrow">DIENSTPLANUNG</p>
            <h2>Geplante Einsätze</h2>
            <span>Besetzung und Verantwortlichkeiten auf einen Blick</span>
          </div>
          <button type="button" className="secondary-button">
            Diese Woche
          </button>
        </div>
        <div className="teamlead-shift-list">
          {rows.map((row) => (
            <article className={`teamlead-shift ${isArchived(row) ? "archived" : ""}`} key={row.id}>
              <time>
                <strong>
                  {row.starts_at
                    ? new Date(row.starts_at).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </strong>
                <small>
                  {row.ends_at
                    ? new Date(row.ends_at).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })
                    : ""}
                </small>
              </time>
              <span className="teamlead-shift-line" />
              <div>
                <strong>{row.name}</strong>
                <span>{row.care_unit_name || "Bereich übergreifend"}</span>
                <small>{row.assignees || "Noch niemand zugewiesen"}</small>
              </div>
              <span className={`teamlead-status ${isArchived(row) ? "archived" : "active"}`}>
                <i />
                {isArchived(row) ? "Archiviert" : row.assignees ? "Besetzt" : "Offen"}
              </span>
              <button
                className="teamlead-icon-button"
                type="button"
                aria-label={isArchived(row) ? "Dienst wiederherstellen" : "Dienst archivieren"}
                onClick={() => onUpdate(row.id, isArchived(row) ? "restore" : "archive")}
              >
                {isArchived(row) ? <ArrowClockwise /> : <Archive />}
              </button>
            </article>
          ))}
        </div>
      </article>
      <aside className="teamlead-aside">
        <article className="teamlead-panel teamlead-planning-card">
          <p className="eyebrow">PLANUNGSSTATUS</p>
          <h2>Heute im Fokus</h2>
          <div>
            <span>
              <Clock />
              Schichtübergaben prüfen
            </span>
            <strong>{rows.filter((row) => !isArchived(row)).length}</strong>
          </div>
          <div>
            <span>
              <UsersThree />
              Offene Besetzung
            </span>
            <strong>{rows.filter((row) => !row.assignees && !isArchived(row)).length}</strong>
          </div>
        </article>
        <article className="teamlead-info-card">
          <CalendarDots />
          <div>
            <strong>Planung mit Kontext</strong>
            <p>Alle erstellten Dienste und Zuweisungen werden direkt in Neon gespeichert.</p>
          </div>
        </article>
      </aside>
    </section>
  );
}

"use client";

import { type ReactNode } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import type { AdminCareUnit, ManagedRole, ManagedUser } from "@/lib/admin-users";

export type Data = { users: ManagedUser[]; careUnits: AdminCareUnit[]; roles: ManagedRole[] };

export const permissions = [
  "residents.read",
  "residents.write",
  "documentation.write",
  "medication.manage",
  "schedule.manage",
  "team.manage",
  "quality.manage",
  "insights.read",
  "administration.manage",
  "rai.manage",
  "ai.use",
];

export const labels: Record<string, string> = {
  "residents.read": "Bewohner lesen",
  "residents.write": "Bewohner bearbeiten",
  "documentation.write": "Dokumentieren",
  "medication.manage": "Medikation",
  "schedule.manage": "Dienste",
  "team.manage": "Team",
  "quality.manage": "Qualität",
  "insights.read": "Kennzahlen",
  "administration.manage": "Administration",
  "rai.manage": "RAI",
  "ai.use": "KI-Assistenz",
};

export function EmployeeFields(p: {
  name: string;
  setName: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  job: string;
  setJob: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  roles: ManagedRole[];
  careUnits: AdminCareUnit[];
}) {
  return (
    <>
      <div className="user-editor-section-heading">
        <p className="eyebrow">Profil und Berechtigungen</p>
        <h3>Mitarbeiterprofil</h3>
      </div>
      <div className="user-editor-fields">
        <label>
          Name
          <input required value={p.name} onChange={(e) => p.setName(e.target.value)} />
        </label>
        <label>
          Benutzername
          <input required value={p.username} onChange={(e) => p.setUsername(e.target.value.replace(/\s/g, ""))} />
        </label>
        <label>
          Funktion
          <input value={p.job} onChange={(e) => p.setJob(e.target.value)} />
        </label>
        <label>
          Telefon
          <input value={p.phone} onChange={(e) => p.setPhone(e.target.value)} />
        </label>
      </div>
      <fieldset className="user-editor-role">
        <legend>Rolle</legend>
        <div>
          {p.roles.map((r) => (
            <button
              type="button"
              key={r.id}
              className={p.role === r.key ? "active" : ""}
              onClick={() => p.setRole(r.key)}
            >
              <strong>{r.name}</strong>
              <small>{r.description || "Individuell definierter Zugriff"}</small>
              {p.role === r.key && <ModuleIcon name="check" />}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="user-editor-role">
        <legend>Fester Arbeitsbereich</legend>
        <div>
          {p.careUnits.map((u) => (
            <button
              type="button"
              key={u.id}
              className={p.unit === u.id ? "active" : ""}
              onClick={() => p.setUnit(u.id)}
            >
              <strong>{u.name}</strong>
              <small>{u.detail}</small>
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export function Confirm({
  mode,
  active,
  saving,
  error,
  onBack,
  onConfirm,
}: {
  mode: "lock" | "delete";
  active: boolean;
  saving: boolean;
  error: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const del = mode === "delete";
  return (
    <div className="user-editor-confirm">
      <p className="eyebrow">{del ? "Irreversible Aktion" : "Kontostatus"}</p>
      <h3>
        {del ? "Mitarbeiter endgültig löschen" : active ? "Mitarbeiter archivieren" : "Mitarbeiter wiederherstellen"}
      </h3>
      <p>
        {del
          ? "Das Konto und seine Sitzungen werden dauerhaft entfernt."
          : "Das Profil wird als Archiv geführt und kann später wiederhergestellt werden."}
      </p>
      {error && <p className="user-editor-error">{error}</p>}
      <div className="user-editor-footer">
        <button className="secondary-button" type="button" onClick={onBack}>
          Abbrechen
        </button>
        <button
          className={del || active ? "danger-button" : "primary-button"}
          type="button"
          onClick={onConfirm}
          disabled={saving}
        >
          {del ? "Endgültig löschen" : active ? "Archivieren" : "Wiederherstellen"}
        </button>
      </div>
    </div>
  );
}

export function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="user-editor-overlay" onMouseDown={(e) => e.currentTarget === e.target && onClose()}>
      <section className="user-editor-panel" role="dialog" aria-modal="true">
        <header className="user-editor-header">
          <div>
            <p className="eyebrow">CareCore Admin · Zugriffsverwaltung</p>
            <h2>{title}</h2>
            <p>Änderungen werden nachvollziehbar in Neon gespeichert.</p>
          </div>
          <button className="profile-panel-close" type="button" onClick={onClose}>
            <ModuleIcon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

"use client";

import { useState, type FormEvent } from "react";
import type { AdminCareUnit, ManagedRole, ManagedUser } from "@/lib/admin-users";
import { Data, EmployeeFields, Confirm, Overlay, initials } from "./admin-user-parts";

export function EmployeeEditor({
  user,
  careUnits,
  roles,
  onClose,
  onUpdated,
}: {
  user: ManagedUser;
  careUnits: AdminCareUnit[];
  roles: ManagedRole[];
  onClose: () => void;
  onUpdated: (data: Data, message: string) => void;
}) {
  const [name, setName] = useState(user.displayName),
    [username, setUsername] = useState(user.username),
    [role, setRole] = useState(user.role),
    [job, setJob] = useState(user.jobTitle === "Noch nicht angegeben" ? "" : user.jobTitle),
    [phone, setPhone] = useState(user.phone),
    [unit, setUnit] = useState(user.primaryCareUnitId ?? ""),
    [mode, setMode] = useState<"edit" | "lock" | "delete">("edit"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  async function send(method: "PATCH" | "DELETE", body: object, success: string) {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/users", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const next = (await r.json()) as Data & { error?: string };
      if (!r.ok) throw new Error(next.error);
      onUpdated(next, success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung nicht möglich");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Overlay title={`${user.displayName} verwalten`} onClose={onClose}>
      <div className="user-editor-body">
        <aside className="user-editor-summary">
          <span className="profile-large-avatar">{initials(user.displayName)}</span>
          <h3>{user.displayName}</h3>
          <p>@{user.username}</p>
          <div className="user-editor-actions">
            <button className={mode === "edit" ? "active" : ""} type="button" onClick={() => setMode("edit")}>
              Profil bearbeiten
            </button>
            <button
              className={mode === "lock" ? "active warning" : "warning"}
              type="button"
              onClick={() => setMode("lock")}
            >
              {user.active ? "Sperren & archivieren" : "Wiederherstellen"}
            </button>
            <button
              className={mode === "delete" ? "active danger" : "danger"}
              type="button"
              onClick={() => setMode("delete")}
            >
              Endgültig löschen
            </button>
          </div>
        </aside>
        <section className="user-editor-content">
          {mode === "edit" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(
                  "PATCH",
                  {
                    userId: user.id,
                    displayName: name,
                    username,
                    role,
                    jobTitle: job,
                    phone,
                    primaryCareUnitId: unit || null,
                  },
                  "Mitarbeiterprofil gespeichert",
                );
              }}
            >
              <EmployeeFields
                {...{
                  name,
                  setName,
                  username,
                  setUsername,
                  role,
                  setRole,
                  job,
                  setJob,
                  phone,
                  setPhone,
                  unit,
                  setUnit,
                  roles,
                  careUnits,
                }}
              />
              {error && <p className="user-editor-error">{error}</p>}
              <footer className="user-editor-footer">
                <button className="primary-button" disabled={saving}>
                  Änderungen speichern
                </button>
              </footer>
            </form>
          ) : (
            <Confirm
              mode={mode}
              active={user.active}
              saving={saving}
              error={error}
              onBack={() => setMode("edit")}
              onConfirm={() =>
                void send(
                  mode === "delete" ? "DELETE" : "PATCH",
                  mode === "delete"
                    ? { userId: user.id }
                    : { userId: user.id, action: user.active ? "lock" : "restore" },
                  "Mitarbeiter aktualisiert",
                )
              }
            />
          )}
        </section>
      </div>
    </Overlay>
  );
}

export function EmployeeCreator({
  careUnits,
  roles,
  onClose,
  onCreated,
}: {
  careUnits: AdminCareUnit[];
  roles: ManagedRole[];
  onClose: () => void;
  onCreated: (data: Data) => void;
}) {
  const [name, setName] = useState(""),
    [username, setUsername] = useState(""),
    [role, setRole] = useState(roles.find((r) => r.key === "pflege")?.key ?? roles[0]?.key ?? ""),
    [job, setJob] = useState(""),
    [phone, setPhone] = useState(""),
    [unit, setUnit] = useState(careUnits[0]?.id ?? ""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          username,
          role,
          jobTitle: job,
          phone,
          primaryCareUnitId: unit || null,
          password,
        }),
      });
      const next = (await r.json()) as Data & { error?: string };
      if (!r.ok) throw new Error(next.error);
      onCreated(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mitarbeiter konnte nicht erstellt werden.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Overlay title="Mitarbeiter erstellen" onClose={onClose}>
      <div className="user-editor-body">
        <aside className="user-editor-summary">
          <span className="profile-large-avatar">{initials(name || "Neue Person")}</span>
          <h3>{name || "Mitarbeiter:in"}</h3>
          <p>Neues Zugangsprofil</p>
        </aside>
        <section className="user-editor-content">
          <form onSubmit={submit}>
            <EmployeeFields
              {...{
                name,
                setName,
                username,
                setUsername,
                role,
                setRole,
                job,
                setJob,
                phone,
                setPhone,
                unit,
                setUnit,
                roles,
                careUnits,
              }}
            />
            <div className="user-editor-fields">
              <label className="user-editor-password-field">
                Startpasswort
                <input
                  required
                  type="password"
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <small>Wird sicher als Hash gespeichert.</small>
              </label>
            </div>
            {error && <p className="user-editor-error">{error}</p>}
            <footer className="user-editor-footer">
              <button className="primary-button" disabled={saving}>
                Mitarbeiter erstellen
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Overlay>
  );
}

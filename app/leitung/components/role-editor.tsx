"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import type { ManagedRole } from "@/lib/admin-users";
import { permissions, labels, Overlay } from "./admin-user-parts";

export function RoleEditor({
  role,
  onClose,
  onUpdated,
}: {
  role: ManagedRole | null;
  onClose: () => void;
  onUpdated: (roles: ManagedRole[], message: string) => void;
}) {
  const [name, setName] = useState(role?.name ?? ""),
    [key, setKey] = useState(role?.key ?? ""),
    [description, setDescription] = useState(role?.description ?? ""),
    [selected, setSelected] = useState<string[]>(role?.permissions ?? []),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const toggle = (v: string) =>
    setSelected((items) => (items.includes(v) ? items.filter((x) => x !== v) : [...items, v]));
  async function request(method: "POST" | "PATCH" | "DELETE") {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/roles", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          method === "DELETE"
            ? { roleId: role?.id }
            : role
              ? { roleId: role.id, name, description, permissions: selected }
              : { name, key, description, permissions: selected },
        ),
      });
      const payload = (await r.json()) as { roles?: ManagedRole[]; error?: string };
      if (!r.ok || !payload.roles) throw new Error(payload.error);
      onUpdated(payload.roles, method === "DELETE" ? "Rolle gelöscht" : role ? "Rolle gespeichert" : "Rolle erstellt");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rolle konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Overlay title={role ? `${role.name} verwalten` : "Rolle erstellen"} onClose={onClose}>
      <div className="role-editor">
        <form
          className="user-editor-content"
          onSubmit={(e) => {
            e.preventDefault();
            void request(role ? "PATCH" : "POST");
          }}
        >
          <div className="user-editor-section-heading">
            <p className="eyebrow">Rollenverwaltung</p>
            <h3>{role ? "Rolle bearbeiten" : "Neue Rolle"}</h3>
            <p>Systemrollen sind geschützt. Eigene Rollen können entfernt werden, wenn sie nicht zugeordnet sind.</p>
          </div>
          <div className="user-editor-fields">
            <label>
              Name
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Rollen-Schlüssel
              <input
                required
                disabled={Boolean(role)}
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9:_-]/g, ""))}
              />
            </label>
            <label className="user-editor-password-field">
              Beschreibung
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>
          <fieldset className="user-editor-role">
            <legend>Berechtigungen</legend>
            <div>
              {permissions.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={selected.includes(p) ? "active" : ""}
                  onClick={() => toggle(p)}
                >
                  <strong>{labels[p]}</strong>
                  <small>{p}</small>
                  {selected.includes(p) && <ModuleIcon name="check" />}
                </button>
              ))}
            </div>
          </fieldset>
          {error && <p className="user-editor-error">{error}</p>}
          <footer className="user-editor-footer">
            {role && !role.systemRole && (
              <button
                className="danger-button"
                type="button"
                disabled={saving || role.userCount > 0}
                onClick={() => void request("DELETE")}
              >
                Rolle löschen
              </button>
            )}
            <button className="primary-button" disabled={saving}>
              Rolle speichern
            </button>
          </footer>
        </form>
      </div>
    </Overlay>
  );
}

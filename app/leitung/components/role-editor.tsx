"use client";

import { useCountry, useTerms } from "@/app/components/care-context";
import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import type { ManagedRole } from "@/lib/admin-users";
import { permissions, permissionLabel, Overlay } from "./admin-user-parts";

export function RoleEditor({
  role,
  onClose,
  onUpdated,
}: {
  role: ManagedRole | null;
  onClose: () => void;
  onUpdated: (roles: ManagedRole[], message: string) => void;
}) {
  const t = useTerms();
  const country = useCountry();
  const [name, setName] = useState(role?.name ?? ""),
    [key, setKey] = useState(role?.key ?? ""),
    [description, setDescription] = useState(role?.description ?? ""),
    [selected, setSelected] = useState<string[]>(role?.permissions ?? []),
    [needsQualification, setNeedsQualification] = useState(role?.medicationRequiresQualification ?? false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    // Kopie: dieselben Rechte als neue eigene Rolle der Einrichtung.
    [copyOf, setCopyOf] = useState<ManagedRole | null>(null);
  const editing = copyOf ? null : role;
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
            : editing
              ? {
                  roleId: editing.id,
                  name,
                  description,
                  permissions: selected,
                  medicationRequiresQualification: needsQualification,
                }
              : {
                  name,
                  key,
                  description,
                  permissions: selected,
                  medicationRequiresQualification: needsQualification,
                  copyOf: copyOf?.id,
                },
        ),
      });
      const payload = (await r.json()) as { roles?: ManagedRole[]; error?: string };
      if (!r.ok || !payload.roles) throw new Error(payload.error);
      onUpdated(
        payload.roles,
        method === "DELETE"
          ? "Rolle gelöscht"
          : editing
            ? "Rolle gespeichert"
            : copyOf
              ? "Rolle kopiert"
              : "Rolle erstellt",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rolle konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Overlay
      title={editing ? `${editing.name} verwalten` : copyOf ? `${copyOf.name} kopieren` : "Rolle erstellen"}
      onClose={onClose}
    >
      <div className="role-editor">
        <form
          className="user-editor-content"
          onSubmit={(e) => {
            e.preventDefault();
            void request(editing ? "PATCH" : "POST");
          }}
        >
          <div className="user-editor-section-heading">
            <p className="eyebrow">Rollenverwaltung</p>
            <h3>{editing ? "Rolle bearbeiten" : copyOf ? "Kopie als eigene Rolle" : "Neue Rolle"}</h3>
            <p>
              {copyOf
                ? `Die Kopie übernimmt die Berechtigungen von „${copyOf.name}“ und gehört nur dieser Einrichtung.`
                : "Systemrollen sind geschützt. Eigene Rollen können entfernt werden, wenn sie nicht zugeordnet sind."}
            </p>
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
                disabled={Boolean(editing)}
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
                  // Die Leitung verabreicht Medikamente immer.
                  disabled={editing?.key === "leitung" && p === "medication.administer"}
                  onClick={() => toggle(p)}
                >
                  <strong>{permissionLabel(p, t)}</strong>
                  <small>{p}</small>
                  {selected.includes(p) && <ModuleIcon name="check" />}
                </button>
              ))}
            </div>
          </fieldset>
          {(selected.includes("medication.manage") || selected.includes("medication.administer")) &&
            editing?.key !== "admin" &&
            editing?.key !== "leitung" && (
              <fieldset className="user-editor-role">
                <legend>Medikation</legend>
                <div>
                  <button
                    type="button"
                    className={needsQualification ? "active" : ""}
                    aria-pressed={needsQualification}
                    onClick={() => setNeedsQualification((value) => !value)}
                  >
                    <strong>Nur mit Qualifikation</strong>
                    <small>
                      Medikation nur für Personen mit berechtigender Qualifikation (z. B. {country.medicationExamples})
                    </small>
                    {needsQualification && <ModuleIcon name="check" />}
                  </button>
                </div>
              </fieldset>
            )}
          {error && <p className="user-editor-error">{error}</p>}
          <footer className="user-editor-footer">
            {editing && !editing.systemRole && (
              <button
                className="danger-button"
                type="button"
                disabled={saving || editing.userCount > 0}
                onClick={() => void request("DELETE")}
              >
                Rolle löschen
              </button>
            )}
            {editing && (
              <button
                className="secondary-button"
                type="button"
                disabled={saving}
                onClick={() => {
                  setCopyOf(editing);
                  setName(`${editing.name} (Kopie)`.slice(0, 100));
                  setKey(`${editing.key}-kopie`.slice(0, 40));
                  setError("");
                }}
              >
                Rolle kopieren
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

"use client";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import type { AdminCareUnit, ManagedRole, ManagedUser } from "@/lib/admin-users";

type Data = { users: ManagedUser[]; careUnits: AdminCareUnit[]; roles: ManagedRole[] };
const permissions = [
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
const labels: Record<string, string> = {
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

export default function AdminUserManagement({
  showToast,
  createOpen,
  onCloseCreate,
}: {
  showToast: (message: string) => void;
  createOpen: boolean;
  onCloseCreate: () => void;
}) {
  const [data, setData] = useState<Data | null>(null),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<ManagedUser | null>(null),
    [roleEditor, setRoleEditor] = useState<ManagedRole | "create" | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    void fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => showToast("Mitarbeiter konnten nicht aus Neon geladen werden"))
      .finally(() => setLoading(false));
  }, [showToast]);
  const users = useMemo(
    () =>
      (data?.users ?? []).filter((u) =>
        `${u.displayName} ${u.username} ${u.role}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [data, query],
  );
  const roleName = (key: string) => data?.roles.find((r) => r.key === key)?.name ?? key;
  return (
    <>
      <div className="admin-users-layout">
        <section className="card admin-users-card">
          <div className="admin-table-header">
            <div>
              <p className="eyebrow">Zugriffsverwaltung</p>
              <h2 className="card-title">Mitarbeiter</h2>
              <p className="card-subtitle">
                {loading
                  ? "Mitarbeiter werden geladen…"
                  : `${users.filter((u) => u.active).length} aktiv · ${users.filter((u) => !u.active).length} archiviert`}
              </p>
            </div>
            <label className="resident-search">
              <ModuleIcon name="search" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name oder Benutzername suchen"
              />
            </label>
          </div>
          <div className="admin-user-table-head">
            <span>Profil</span>
            <span>Rolle</span>
            <span>Arbeitsbereich</span>
            <span>Status</span>
          </div>
          {users.map((u) => (
            <button
              className={`admin-user-row ${selected?.id === u.id ? "selected" : ""}`}
              type="button"
              key={u.id}
              onClick={() => setSelected(u)}
            >
              <span className="avatar">{initials(u.displayName)}</span>
              <span>
                <strong>{u.displayName}</strong>
                <small>
                  @{u.username} · {u.jobTitle}
                </small>
              </span>
              <span>{roleName(u.role)}</span>
              <span>{u.primaryCareUnitName ?? "Nicht zugeteilt"}</span>
              <span className={`status-badge ${u.active ? "stable" : "attention"}`}>
                {u.active ? "Aktiv" : "Archiviert"}
              </span>
            </button>
          ))}
        </section>
        <aside className="card admin-access-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Ausgewählt</p>
              <h2 className="card-title">{selected?.displayName ?? "Mitarbeiter auswählen"}</h2>
            </div>
            <ModuleIcon name="quality" />
          </div>
          {selected ? (
            <>
              <p>Das Profil kann bearbeitet, archiviert oder gelöscht werden.</p>
              <dl>
                <div>
                  <dt>Rolle</dt>
                  <dd>{roleName(selected.role)}</dd>
                </div>
                <div>
                  <dt>Fester Bereich</dt>
                  <dd>{selected.primaryCareUnitName ?? "Nicht zugeteilt"}</dd>
                </div>
              </dl>
              <button className="primary-button" type="button" onClick={() => setSelected(selected)}>
                Mitarbeiter verwalten
              </button>
            </>
          ) : (
            <p>Wähle einen Mitarbeiter aus der Liste aus.</p>
          )}
        </aside>
      </div>
      <section className="card admin-roles-card">
        <div className="admin-table-header">
          <div>
            <p className="eyebrow">Rollenverwaltung</p>
            <h2 className="card-title">Rollen und Berechtigungen</h2>
            <p className="card-subtitle">{data?.roles.length ?? 0} Rollen stehen für Mitarbeiter zur Verfügung.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => setRoleEditor("create")}>
            <ModuleIcon name="plus" />
            Rolle erstellen
          </button>
        </div>
        <div className="admin-role-grid">
          {(data?.roles ?? []).map((role) => (
            <button className="admin-role-row" key={role.id} type="button" onClick={() => setRoleEditor(role)}>
              <span className="admin-role-icon">
                <ModuleIcon name={role.systemRole ? "quality" : "team"} />
              </span>
              <span>
                <strong>{role.name}</strong>
                <small>{role.description || "Keine Beschreibung"}</small>
              </span>
              <span className="admin-role-meta">
                <small>{role.userCount} Mitarbeiter</small>
                <em>{role.systemRole ? "Systemrolle" : "Eigene Rolle"}</em>
              </span>
              <ModuleIcon name="chevron" />
            </button>
          ))}
        </div>
      </section>
      {selected && (
        <EmployeeEditor
          user={selected}
          careUnits={data?.careUnits ?? []}
          roles={data?.roles ?? []}
          onClose={() => setSelected(null)}
          onUpdated={(next, message) => {
            setData(next);
            setSelected(null);
            showToast(message);
          }}
        />
      )}{" "}
      {createOpen && (
        <EmployeeCreator
          careUnits={data?.careUnits ?? []}
          roles={data?.roles ?? []}
          onClose={onCloseCreate}
          onCreated={(next) => {
            setData(next);
            onCloseCreate();
            showToast("Mitarbeiter erstellt");
          }}
        />
      )}{" "}
      {roleEditor && (
        <RoleEditor
          role={roleEditor === "create" ? null : roleEditor}
          onClose={() => setRoleEditor(null)}
          onUpdated={(roles, message) => {
            setData((current) => (current ? { ...current, roles } : current));
            setRoleEditor(null);
            showToast(message);
          }}
        />
      )}
    </>
  );
}

function EmployeeEditor({
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

function EmployeeCreator({
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

function EmployeeFields(p: {
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

function Confirm({
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

function RoleEditor({
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
function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

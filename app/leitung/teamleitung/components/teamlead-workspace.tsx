"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  ArrowClockwise,
  CalendarDots,
  CheckCircle,
  ClipboardText,
  Clock,
  DotsThree,
  PencilSimple,
  Plus,
  UserPlus,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import ModulePageShell from "@/app/components/module-page-shell";
import { CareSelect } from "@/app/components/care-form-controls";
import { SidebarTooltip } from "@/app/components/app-sidebar";

type View = "employees" | "shifts" | "tasks";
type Employee = {
  id: string;
  display_name: string;
  username?: string;
  role: string;
  active: boolean;
  archived_at?: string | null;
  care_unit_name?: string;
  primary_care_unit_id?: string | null;
  job_title?: string;
  phone?: string;
};
type TeamleadRow = Employee & {
  name?: string;
  title?: string;
  starts_at?: string;
  ends_at?: string;
  assignee?: string;
  assignees?: string;
  description?: string;
  status?: string;
  priority?: string;
  due_at?: string | null;
  care_unit_name?: string;
};
type Unit = { id: string; name: string };

const config = {
  employees: {
    title: "Mitarbeiter",
    eyebrow: "TEAMLEITUNG · PERSONAL",
    subtitle: "Dein Team im Blick – Zuständigkeiten, Rollen und Verfügbarkeit an einem Ort.",
    action: "Mitarbeiter erstellen",
  },
  shifts: {
    title: "Dienste",
    eyebrow: "TEAMLEITUNG · EINSATZPLANUNG",
    subtitle: "Dienste planen, besetzen und zuverlässig mit dem Team abstimmen.",
    action: "Dienst erstellen",
  },
  tasks: {
    title: "Aufgaben",
    eyebrow: "TEAMLEITUNG · ARBEITSSTEUERUNG",
    subtitle: "Verantwortlichkeiten klar verteilen und den Fortschritt im Team nachhalten.",
    action: "Aufgabe erstellen",
  },
} as const;

const endpointFor = (view: View) =>
  `/api/teamlead/${view === "employees" ? "employees" : view === "shifts" ? "shifts" : "tasks"}`;
const initials = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const labelRole = (role?: string) =>
  ({
    admin: "Administration",
    leitung: "Leitung",
    pflege: "Pflege",
    arzt: "Ärztlicher Dienst",
    "mitarbeitende:r": "Mitarbeitende:r",
  })[role ?? ""] ?? "Mitarbeitende:r";
const priorityLabel = (priority?: string) =>
  ({ low: "Niedrig", normal: "Normal", high: "Hoch", critical: "Kritisch" })[priority ?? ""] ?? "Normal";
const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
        new Date(value),
      )
    : "Nicht terminiert";

export default function TeamleadWorkspace({ view }: { view: View }) {
  const [role, setRole] = useState<string | null>(null);
  const [rows, setRows] = useState<TeamleadRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<TeamleadRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const content = config[view];

  const load = useCallback(async () => {
    const [context, result] = await Promise.all([
      fetch("/api/work-context")
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
      fetch(endpointFor(view), { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    ]);
    setRole(context?.profile?.role ?? null);
    setRows((result?.employees ?? result?.shifts ?? result?.tasks ?? []) as TeamleadRow[]);
    setEmployees((result?.employees ?? []) as Employee[]);
    setUnits((result?.units ?? []) as Unit[]);
  }, [view]);

  // This effect fetches external state when the selected workspace changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const canLead = role === "admin" || role === "leitung";
  const isArchived = useCallback(
    (row: TeamleadRow) => Boolean(row.archived_at || row.status === "cancelled" || row.active === false),
    [],
  );
  const totals = useMemo(
    () => ({
      active: rows.filter((row) => !isArchived(row)).length,
      attention:
        view === "employees"
          ? rows.filter((row) => row.role === "leitung").length
          : view === "shifts"
            ? rows.filter((row) => row.status === "planned").length
            : rows.filter((row) => row.priority === "high" || row.priority === "critical").length,
      archived: rows.filter(isArchived).length,
    }),
    [isArchived, rows, view],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = view === "shifts" ? { ...form, employeeIds: form.employeeId ? [form.employeeId] : [] } : form;
    const response = await fetch(endpointFor(view), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(body.error ?? "Die Änderung konnte nicht gespeichert werden.");
      return;
    }
    setNotice(`${content.title} wurde gespeichert.`);
    setForm({});
    setShowForm(false);
    await load();
  }
  async function updateState(id: string, action: "archive" | "restore") {
    const response = await fetch(endpointFor(view), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (!response.ok) {
      setNotice("Die Änderung konnte nicht gespeichert werden.");
      return;
    }
    setNotice(action === "archive" ? "Eintrag wurde archiviert." : "Eintrag wurde wiederhergestellt.");
    await load();
  }
  const metrics =
    view === "employees"
      ? [
          [totals.active, "Aktive Mitarbeitende", "im Team verfügbar"],
          [totals.attention, "Leitungsrollen", "mit erweiterter Berechtigung"],
          [totals.archived, "Archiviert", "nicht im Tagesgeschäft"],
        ]
      : view === "shifts"
        ? [
            [totals.active, "Geplante Dienste", "im aktuellen Plan"],
            [totals.attention, "Noch offen", "Besetzung prüfen"],
            [rows.filter((row) => row.assignees).length, "Besetzt", "mit Teamzuweisung"],
          ]
        : [
            [totals.active, "Aktive Aufgaben", "im Team in Bearbeitung"],
            [totals.attention, "Hohe Priorität", "brauchen heute Fokus"],
            [totals.archived, "Archiviert", "abgeschlossen oder verworfen"],
          ];

  return (
    <ModulePageShell activeModule="teamlead" activeChild={content.title} pageClass="leadership-page">
      {() => (
        <main className="workspace teamlead-workspace">
          <header className="teamlead-hero">
            <div>
              <p className="eyebrow">{content.eyebrow}</p>
              <h1>{content.title}</h1>
              <p>{content.subtitle}</p>
            </div>
            <button className="primary-button teamlead-create" type="button" onClick={() => setShowForm(true)}>
              {view === "employees" ? <UserPlus /> : <Plus />}
              {content.action}
            </button>
          </header>
          {!canLead ? (
            <section className="teamlead-denied">
              <WarningCircle />
              <div>
                <strong>Zugriff beschränkt</strong>
                <p>Dieser Bereich ist ausschließlich für Administratoren und Leitungen verfügbar.</p>
              </div>
            </section>
          ) : (
            <>
              <section className="teamlead-metrics">
                {metrics.map(([value, label, detail], index) => (
                  <article key={label as string}>
                    <span className={`teamlead-metric-icon tone-${index}`}>
                      {index === 0 ? (
                        view === "employees" ? (
                          <UsersThree />
                        ) : view === "shifts" ? (
                          <CalendarDots />
                        ) : (
                          <ClipboardText />
                        )
                      ) : index === 1 ? (
                        <WarningCircle />
                      ) : (
                        <Archive />
                      )}
                    </span>
                    <div>
                      <strong>{value}</strong>
                      <span>{label}</span>
                      <small>{detail}</small>
                    </div>
                  </article>
                ))}
              </section>
              {view === "employees" && (
                <EmployeesView
                  rows={rows}
                  isArchived={isArchived}
                  onUpdate={updateState}
                  onSelect={setSelectedEmployee}
                />
              )}
              {view === "shifts" && <ShiftsView rows={rows} isArchived={isArchived} onUpdate={updateState} />}
              {view === "tasks" && <TasksView rows={rows} isArchived={isArchived} onUpdate={updateState} />}
            </>
          )}
          {notice && (
            <p className="teamlead-notice">
              <CheckCircle />
              {notice}
            </p>
          )}
          {showForm && (
            <TeamleadForm
              view={view}
              form={form}
              setForm={setForm}
              units={units}
              employees={employees}
              onClose={() => setShowForm(false)}
              onSubmit={submit}
            />
          )}
          {selectedEmployee && (
            <TeamleadEmployeeEditor
              employee={selectedEmployee}
              units={units}
              onClose={() => setSelectedEmployee(null)}
              onUpdated={async (message) => {
                setSelectedEmployee(null);
                setNotice(message);
                await load();
              }}
            />
          )}
        </main>
      )}
    </ModulePageShell>
  );
}

function EmployeesView({
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

function ShiftsView({
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

function TasksView({
  rows,
  isArchived,
  onUpdate,
}: {
  rows: TeamleadRow[];
  isArchived: (row: TeamleadRow) => boolean;
  onUpdate: (id: string, action: "archive" | "restore") => void;
}) {
  const open = rows.filter((row) => !isArchived(row));
  const archived = rows.filter(isArchived);
  return (
    <section className="teamlead-task-layout">
      <article className="teamlead-panel">
        <div className="teamlead-panel-head">
          <div>
            <p className="eyebrow">AUFGABENBOARD</p>
            <h2>Teamaufgaben steuern</h2>
            <span>Prioritäten und Verantwortung transparent koordinieren</span>
          </div>
          <button type="button" className="secondary-button">
            Alle Aufgaben
          </button>
        </div>
        <div className="teamlead-kanban">
          <TaskColumn title="Aktiv" count={open.length} rows={open} onUpdate={onUpdate} />
          <TaskColumn title="Archiv" count={archived.length} rows={archived} onUpdate={onUpdate} archived />
        </div>
      </article>
      <article className="teamlead-info-card">
        <ClipboardText />
        <div>
          <strong>Klare Zuständigkeit</strong>
          <p>Neue Aufgaben können direkt einer Person zugewiesen und mit einer Fälligkeit versehen werden.</p>
        </div>
      </article>
    </section>
  );
}

function TaskColumn({
  title,
  count,
  rows,
  onUpdate,
  archived = false,
}: {
  title: string;
  count: number;
  rows: TeamleadRow[];
  onUpdate: (id: string, action: "archive" | "restore") => void;
  archived?: boolean;
}) {
  return (
    <section className="teamlead-task-column">
      <header>
        <span>{title}</span>
        <b>{count}</b>
      </header>
      <div>
        {rows.map((row) => (
          <article className="teamlead-task-card" key={row.id}>
            <div>
              <span className={`priority-mark ${row.priority ?? "normal"}`} />
              <small>{priorityLabel(row.priority)}</small>
            </div>
            <strong>{row.title}</strong>
            <p>{row.description || "Keine zusätzliche Beschreibung"}</p>
            <footer>
              <span>{row.assignee || "Nicht zugewiesen"}</span>
              <time>{formatDate(row.due_at)}</time>
            </footer>
            <button type="button" onClick={() => onUpdate(row.id, archived ? "restore" : "archive")}>
              {archived ? <ArrowClockwise /> : <Archive />}
              {archived ? "Wiederherstellen" : "Archivieren"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeamleadEmployeeEditor({
  employee,
  units,
  onClose,
  onUpdated,
}: {
  employee: TeamleadRow;
  units: Unit[];
  onClose: () => void;
  onUpdated: (message: string) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(employee.display_name);
  const [username, setUsername] = useState(employee.username ?? "");
  const [role, setRole] = useState(employee.role);
  const [jobTitle, setJobTitle] = useState(employee.job_title ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [unitId, setUnitId] = useState(employee.primary_care_unit_id ?? "");
  const [mode, setMode] = useState<"edit" | "archive" | "delete">("edit");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const unitName = units.find((unit) => unit.id === unitId)?.name ?? "Nicht festgelegt";
  const roleOptions = ["Mitarbeitende:r", "Pflege", "Ärztlicher Dienst", "Leitung"];
  const roleKey = (value: string) =>
    ({ "Mitarbeitende:r": "mitarbeitende:r", Pflege: "pflege", "Ärztlicher Dienst": "arzt", Leitung: "leitung" })[
      value
    ] ?? "mitarbeitende:r";

  async function request(method: "PATCH" | "DELETE", payload: Record<string, string | null>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/teamlead/employees", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: employee.id, ...payload }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Die Änderung konnte nicht gespeichert werden.");
      await onUpdated(
        method === "DELETE"
          ? "Mitarbeiter wurde endgültig gelöscht."
          : payload.action === "archive"
            ? "Mitarbeiter wurde archiviert."
            : payload.action === "restore"
              ? "Mitarbeiter wurde wiederhergestellt."
              : "Mitarbeiterprofil wurde gespeichert.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Die Änderung konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="user-editor-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="user-editor-panel" role="dialog" aria-modal="true" aria-labelledby="teamlead-employee-title">
        <header className="user-editor-header">
          <div>
            <p className="eyebrow">CareCore Teamleitung · Mitarbeitende</p>
            <h2 id="teamlead-employee-title">{employee.display_name} verwalten</h2>
            <p>Profil, Rolle und Arbeitsbereich werden nachvollziehbar in Neon gespeichert.</p>
          </div>
          <button
            className="profile-panel-close"
            type="button"
            onClick={onClose}
            aria-label="Mitarbeiterverwaltung schliessen"
          >
            ×
          </button>
        </header>
        <div className="user-editor-body">
          <aside className="user-editor-summary">
            <span className="profile-large-avatar">{initials(displayName || employee.display_name)}</span>
            <h3>{displayName || employee.display_name}</h3>
            <p>@{username || employee.username}</p>
            <div className="user-editor-actions">
              <button className={mode === "edit" ? "active" : ""} type="button" onClick={() => setMode("edit")}>
                Profil bearbeiten
              </button>
              <button
                className={mode === "archive" ? "active warning" : "warning"}
                type="button"
                onClick={() => setMode("archive")}
              >
                {employee.active ? "Sperren & archivieren" : "Wiederherstellen"}
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
                onSubmit={(event) => {
                  event.preventDefault();
                  void request("PATCH", {
                    displayName,
                    username,
                    role,
                    jobTitle,
                    phone,
                    primaryCareUnitId: unitId || null,
                  });
                }}
              >
                <div className="user-editor-section-heading">
                  <p className="eyebrow">Profil und Berechtigungen</p>
                  <h3>Mitarbeiterprofil</h3>
                  <p>Aktualisiere die Angaben für die tägliche Zusammenarbeit im Team.</p>
                </div>
                <div className="user-editor-fields">
                  <label>
                    Name
                    <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                  </label>
                  <label>
                    Benutzername
                    <input
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value.replace(/\s/g, ""))}
                    />
                  </label>
                  <label>
                    Funktion
                    <input
                      value={jobTitle}
                      placeholder="z. B. Pflegefachperson HF"
                      onChange={(event) => setJobTitle(event.target.value)}
                    />
                  </label>
                  <label>
                    Telefon
                    <input
                      value={phone}
                      placeholder="z. B. +41 79 123 45 67"
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </label>
                  <label>
                    Rolle
                    <CareSelect
                      label="Rolle auswählen"
                      value={labelRole(role)}
                      options={roleOptions}
                      onChange={(value) => setRole(roleKey(value))}
                    />
                  </label>
                  <label>
                    Fester Arbeitsbereich
                    <CareSelect
                      label="Festen Arbeitsbereich auswählen"
                      value={unitName}
                      options={["Nicht festgelegt", ...units.map((unit) => unit.name)]}
                      onChange={(name) => setUnitId(units.find((unit) => unit.name === name)?.id ?? "")}
                    />
                  </label>
                </div>
                {error && <p className="user-editor-error">{error}</p>}
                <footer className="user-editor-footer">
                  <button className="primary-button" disabled={saving}>
                    Änderungen speichern
                  </button>
                </footer>
              </form>
            ) : (
              <div className="user-editor-confirm">
                <p className="eyebrow">{mode === "delete" ? "Irreversible Aktion" : "Kontostatus"}</p>
                <h3>
                  {mode === "delete"
                    ? "Mitarbeiter endgültig löschen"
                    : employee.active
                      ? "Mitarbeiter archivieren"
                      : "Mitarbeiter wiederherstellen"}
                </h3>
                <p>
                  {mode === "delete"
                    ? "Das Mitarbeiterkonto wird inklusive Zugang dauerhaft entfernt."
                    : employee.active
                      ? "Das Profil wird aus dem Tagesgeschäft entfernt und als Archiv geführt."
                      : "Das Profil wird wieder aktiviert und steht dem Team wieder zur Verfügung."}
                </p>
                {error && <p className="user-editor-error">{error}</p>}
                <div className="user-editor-footer">
                  <button className="secondary-button" type="button" onClick={() => setMode("edit")}>
                    Abbrechen
                  </button>
                  <button
                    className={mode === "delete" || employee.active ? "danger-button" : "primary-button"}
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      void request(
                        mode === "delete" ? "DELETE" : "PATCH",
                        mode === "delete" ? {} : { action: employee.active ? "archive" : "restore" },
                      )
                    }
                  >
                    {mode === "delete" ? "Endgültig löschen" : employee.active ? "Archivieren" : "Wiederherstellen"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function TeamleadForm({
  view,
  form,
  setForm,
  units,
  employees,
  onClose,
  onSubmit,
}: {
  view: View;
  form: Record<string, string>;
  setForm: (value: Record<string, string>) => void;
  units: Unit[];
  employees: Employee[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const update = (key: string, value: string) => setForm({ ...form, [key]: value });
  const label = config[view].action;
  const careUnitName = units.find((unit) => unit.id === (form.primaryCareUnitId || form.careUnitId))?.name;
  const fixedCareUnit = careUnitName ?? "Nicht festgelegt";
  const assignedEmployee = employees.find(
    (employee) => employee.id === (form.employeeId || form.assignedTo),
  )?.display_name;
  const intro =
    view === "employees"
      ? {
          title: "Neues Mitarbeiterprofil",
          copy: "Lege Zugang, Rolle und festen Arbeitsbereich in einem Schritt fest.",
          status: "Bereit zum Erstellen",
        }
      : view === "shifts"
        ? {
            title: "Neuen Dienst planen",
            copy: "Plane Einsatzzeit, Wohnbereich und Besetzung direkt im Teamkontext.",
            status: "Bereit zum Planen",
          }
        : {
            title: "Neue Teamaufgabe",
            copy: "Halte Verantwortlichkeit, Priorität und Termin nachvollziehbar fest.",
            status: "Bereit zum Erstellen",
          };
  const summary =
    view === "employees"
      ? {
          primary: form.displayName || "Neues Mitarbeiterprofil",
          secondary: `${labelRole(form.role)} · ${form.username ? `@${form.username}` : "Benutzername folgt"}`,
          context: careUnitName || "Noch kein fester Wohnbereich",
          contextLabel: "Arbeitsbereich",
        }
      : view === "shifts"
        ? {
            primary: form.name || "Neuer Dienst",
            secondary: form.startsAt ? `Beginn ${formatDate(form.startsAt)}` : "Zeit noch festlegen",
            context: assignedEmployee || "Noch nicht zugewiesen",
            contextLabel: "Besetzung",
          }
        : {
            primary: form.title || "Neue Aufgabe",
            secondary: priorityLabel(form.priority),
            context: assignedEmployee || "Noch nicht zugewiesen",
            contextLabel: "Verantwortung",
          };

  return (
    <div
      className="area-editor-overlay teamlead-editor-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="area-editor-panel teamlead-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="teamlead-editor-title"
      >
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CARECORE TEAMLEITUNG</p>
            <h2 id="teamlead-editor-title">{label}</h2>
            <p>Die Angaben können später jederzeit angepasst werden.</p>
          </div>
          <button className="area-editor-close" type="button" onClick={onClose} aria-label="Editor schliessen">
            ×
          </button>
        </header>
        <form id="teamlead-form" className="area-editor-form" onSubmit={onSubmit}>
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              {view === "employees" ? <UsersThree /> : view === "shifts" ? <CalendarDots /> : <ClipboardText />}
            </span>
            <div>
              <strong>{intro.title}</strong>
              <p>{intro.copy}</p>
            </div>
            <span className="duty-assignment-status">
              <i />
              {intro.status}
            </span>
          </div>
          <div className="area-editor-grid">
            {view === "employees" && (
              <>
                <label>
                  Name
                  <input
                    required
                    placeholder="z. B. Fabienne Krempel"
                    value={form.displayName ?? ""}
                    onChange={(event) => update("displayName", event.target.value)}
                  />
                </label>
                <label>
                  Benutzername
                  <input
                    required
                    placeholder="z. B. fkrempel"
                    value={form.username ?? ""}
                    onChange={(event) => update("username", event.target.value)}
                  />
                </label>
                <label>
                  Startpasswort
                  <input
                    required
                    minLength={10}
                    type="password"
                    placeholder="Mindestens 10 Zeichen"
                    value={form.password ?? ""}
                    onChange={(event) => update("password", event.target.value)}
                  />
                </label>
                <label>
                  Rolle
                  <CareSelect
                    label="Rolle auswählen"
                    value={labelRole(form.role)}
                    options={["Mitarbeitende:r", "Pflege", "Ärztlicher Dienst", "Leitung"]}
                    onChange={(role) =>
                      update(
                        "role",
                        {
                          "Mitarbeitende:r": "mitarbeitende:r",
                          Pflege: "pflege",
                          "Ärztlicher Dienst": "arzt",
                          Leitung: "leitung",
                        }[role] ?? "mitarbeitende:r",
                      )
                    }
                  />
                </label>
                <label className="area-editor-wide">
                  Fester Wohnbereich
                  <CareSelect
                    label="Festen Wohnbereich auswählen"
                    value={fixedCareUnit}
                    options={["Nicht festgelegt", ...units.map((unit) => unit.name)]}
                    onChange={(name) => update("primaryCareUnitId", units.find((unit) => unit.name === name)?.id ?? "")}
                  />
                </label>
              </>
            )}
            {view === "shifts" && (
              <>
                <label>
                  Bezeichnung
                  <input
                    required
                    placeholder="z. B. Frühdienst"
                    value={form.name ?? ""}
                    onChange={(event) => update("name", event.target.value)}
                  />
                </label>
                <label>
                  Wohnbereich
                  <select value={form.careUnitId ?? ""} onChange={(event) => update("careUnitId", event.target.value)}>
                    <option value="">Bereich übergreifend</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Beginn
                  <input
                    required
                    type="datetime-local"
                    value={form.startsAt ?? ""}
                    onChange={(event) => update("startsAt", event.target.value)}
                  />
                </label>
                <label>
                  Ende
                  <input
                    required
                    type="datetime-local"
                    value={form.endsAt ?? ""}
                    onChange={(event) => update("endsAt", event.target.value)}
                  />
                </label>
                <label className="area-editor-wide">
                  Mitarbeiter zuweisen
                  <select value={form.employeeId ?? ""} onChange={(event) => update("employeeId", event.target.value)}>
                    <option value="">Noch nicht zuweisen</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.display_name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {view === "tasks" && (
              <>
                <label className="area-editor-wide">
                  Titel
                  <input
                    required
                    placeholder="Was soll erledigt werden?"
                    value={form.title ?? ""}
                    onChange={(event) => update("title", event.target.value)}
                  />
                </label>
                <label className="area-editor-wide">
                  Beschreibung
                  <textarea
                    placeholder="Kontext, gewünschtes Ergebnis oder Hinweise"
                    value={form.description ?? ""}
                    onChange={(event) => update("description", event.target.value)}
                  />
                </label>
                <label>
                  Priorität
                  <select
                    value={form.priority ?? "normal"}
                    onChange={(event) => update("priority", event.target.value)}
                  >
                    <option value="low">Niedrig</option>
                    <option value="normal">Normal</option>
                    <option value="high">Hoch</option>
                    <option value="critical">Kritisch</option>
                  </select>
                </label>
                <label>
                  Zuweisen
                  <select value={form.assignedTo ?? ""} onChange={(event) => update("assignedTo", event.target.value)}>
                    <option value="">Nicht zugewiesen</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="area-editor-wide">
                  Fällig am
                  <input
                    type="datetime-local"
                    value={form.dueAt ?? ""}
                    onChange={(event) => update("dueAt", event.target.value)}
                  />
                </label>
              </>
            )}
          </div>
          <div className="duty-assignment-summary teamlead-editor-summary">
            <span>
              <strong>{summary.primary}</strong>
              <small>{summary.secondary}</small>
            </span>
            <span>
              <strong>{summary.context}</strong>
              <small>{summary.contextLabel}</small>
            </span>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit">
              {label}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

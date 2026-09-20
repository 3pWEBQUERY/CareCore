"use client";

import { useEffect, useState } from "react";
import ModulePageShell from "@/app/components/module-page-shell";

type View = "employees" | "shifts" | "tasks";
type Employee = { id: string; display_name: string; username?: string; role: string; active: boolean; archived_at?: string | null; care_unit_name?: string };
type TeamleadRow = Employee & { id: string; name?: string; title?: string; starts_at?: string; assignee?: string; description?: string; status?: string };

export default function TeamleadWorkspace({ view }: { view: View }) {
  const [role, setRole] = useState<string | null>(null);
  const [rows, setRows] = useState<TeamleadRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  async function load() {
    const context = await fetch("/api/work-context").then((r) => r.ok ? r.json() : null).catch(() => null);
    setRole(context?.profile?.role ?? null);
    const endpoint = view === "employees" ? "/api/teamlead/employees" : view === "shifts" ? "/api/teamlead/shifts" : "/api/teamlead/tasks";
    const result = await fetch(endpoint).then((r) => r.ok ? r.json() : null).catch(() => null);
    setRows((result?.employees ?? result?.shifts ?? result?.tasks ?? []) as TeamleadRow[]); setEmployees((result?.employees ?? []) as Employee[]); setUnits((result?.units ?? []) as Array<{ id: string; name: string }>);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [view]);
  const canLead = role === "admin" || role === "leitung";
  const title = view === "employees" ? "Mitarbeiter" : view === "shifts" ? "Dienste" : "Aufgaben";
  const subtitle = view === "employees" ? "Mitarbeitende, Rollen und Zugriffe im Team verwalten." : view === "shifts" ? "Dienste planen und Mitarbeitenden zuweisen." : "Aufgaben erstellen, delegieren und nachvollziehbar archivieren.";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const endpoint = view === "employees" ? "/api/teamlead/employees" : view === "shifts" ? "/api/teamlead/shifts" : "/api/teamlead/tasks";
    const payload = view === "shifts" ? { ...form, employeeIds: form.employeeId ? [form.employeeId] : [] } : form;
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { setMessage((await response.json()).error ?? "Speichern fehlgeschlagen."); return; }
    setMessage(`${title} gespeichert.`); setForm({}); setShowForm(false); await load();
  }
  async function action(id: string, actionName: string) { await fetch(view === "employees" ? "/api/teamlead/employees" : view === "shifts" ? "/api/teamlead/shifts" : "/api/teamlead/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action: actionName }) }); await load(); }
  return <ModulePageShell activeModule="teamlead" activeChild={title} pageClass="leadership-page">{() => <main className="page-content leadership-content">
    <div className="page-heading"><div><p className="eyebrow">CARECORE TEAMLEITUNG</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div><button className="primary-button" type="button" onClick={() => setShowForm(true)}>+ {view === "employees" ? "Mitarbeiter erstellen" : view === "shifts" ? "Dienst erstellen" : "Aufgabe erstellen"}</button></div>
    {!canLead ? <section className="leadership-card"><h2>Zugriff beschränkt</h2><p>Dieser Bereich ist nur für Administratoren und Leitungen verfügbar.</p></section> : <section className="leadership-card"><div className="section-heading"><div><p className="eyebrow">TEAMLEITUNG</p><h2>{rows.length} Einträge</h2></div></div><div className="teamlead-list">{rows.map((row) => <article className="teamlead-row" key={row.id}><div><strong>{row.display_name ?? row.name ?? row.title}</strong><span>{row.role ?? row.care_unit_name ?? row.assignee ?? ""}</span><small>{row.username ?? row.starts_at ? `${row.username ?? ""}${row.starts_at ? ` · ${new Date(row.starts_at).toLocaleString("de-CH")}` : ""}` : row.description ?? ""}</small></div><div className="teamlead-row-actions">{(row.archived_at || row.status === "cancelled" || row.active === false) ? <button type="button" onClick={() => action(row.id, "restore")}>Wiederherstellen</button> : <button type="button" onClick={() => action(row.id, "archive")}>Archivieren</button>}</div></article>)}</div></section>}
    {message && <p className="form-success">{message}</p>}
    {showForm && <div className="area-editor-overlay" role="dialog" aria-modal="true"><section className="area-editor-panel"><div className="area-editor-head"><div><p className="eyebrow">TEAMLEITUNG</p><h2>{title} erstellen</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div><form id="teamlead-form" className="area-editor-form" onSubmit={submit}>{view === "employees" && <><label>Name<input required value={form.displayName ?? ""} onChange={(e) => setForm({ ...form, displayName: e.target.value })}/></label><label>Benutzername<input required value={form.username ?? ""} onChange={(e) => setForm({ ...form, username: e.target.value })}/></label><label>Startpasswort<input required minLength={10} type="password" value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })}/></label><label>Rolle<select value={form.role ?? "mitarbeitende:r"} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="mitarbeitende:r">Mitarbeitende:r</option><option value="pflege">Pflege</option><option value="arzt">Arzt</option><option value="leitung">Leitung</option></select></label><label>Wohnbereich<select value={form.primaryCareUnitId ?? ""} onChange={(e) => setForm({ ...form, primaryCareUnitId: e.target.value })}><option value="">Nicht festgelegt</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label></>}{view === "shifts" && <><label>Bezeichnung<input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label><label>Wohnbereich<select value={form.careUnitId ?? ""} onChange={(e) => setForm({ ...form, careUnitId: e.target.value })}><option value="">Alle Bereiche</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label>Beginn<input required type="datetime-local" value={form.startsAt ?? ""} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}/></label><label>Ende<input required type="datetime-local" value={form.endsAt ?? ""} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}/></label><label>Mitarbeiter<select value={form.employeeId ?? ""} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Noch nicht zuweisen</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.display_name}</option>)}</select></label></>}{view === "tasks" && <><label>Titel<input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label><label>Beschreibung<textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label><label>Priorität<select value={form.priority ?? "normal"} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Hoch</option><option value="critical">Kritisch</option></select></label><label>Zuweisen<select value={form.assignedTo ?? ""} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}><option value="">Nicht zugewiesen</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.display_name}</option>)}</select></label><label>Fällig am<input type="datetime-local" value={form.dueAt ?? ""} onChange={(e) => setForm({ ...form, dueAt: e.target.value })}/></label></>}</form><div className="area-editor-actions"><button type="button" onClick={() => setShowForm(false)}>Abbrechen</button><button className="primary-button" type="submit" form="teamlead-form">Speichern</button></div></section></div>}
  </main>}</ModulePageShell>;
}

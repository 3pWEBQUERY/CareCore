"use client";

import { type FormEvent } from "react";
import { CalendarDots, ClipboardText, UsersThree } from "@phosphor-icons/react";
import { CareSelect } from "@/app/components/care-form-controls";
import { View, Employee, Unit, config, labelRole, priorityLabel, formatDate } from "./teamlead-utils";

export function TeamleadForm({
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

"use client";

import { useState, type FormEvent } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { requestJson } from "@/app/components/workspace-ui";
import { ABSENCE_KINDS, weekdaysBetween, type AbsenceKind, type SchedulePayload } from "@/lib/schedule-shared";
import { ScheduleDatePicker, ScheduleSelect, formatScheduleDate, notifyOperationsChanged } from "./operations-ui";
import { NO_SUBSTITUTE, addDays } from "./schedule-utils";

export function AbsenceEditor({
  data,
  onClose,
  onSaved,
}: {
  data: SchedulePayload;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const start = addDays(data.today, 1);
  const [kind, setKind] = useState<AbsenceKind>("vacation");
  const [urgent, setUrgent] = useState(false);
  const [fromDate, setFromDate] = useState(start);
  const [toDate, setToDate] = useState(start);
  const [substitute, setSubstitute] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const colleagues = data.people.filter((person) => person.id !== data.currentUserId);
  const substituteName = colleagues.find((person) => person.id === substitute)?.name ?? NO_SUBSTITUTE;
  const workdays = toDate >= fromDate ? weekdaysBetween(fromDate, toDate) : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await requestJson("/api/schedule/absences", {
        method: "POST",
        body: { kind, urgent, startsOn: fromDate, endsOn: toDate, substituteUserId: substitute || null, note },
      });
      notifyOperationsChanged();
      onSaved(
        kind === "sick"
          ? "Krankmeldung erfasst – gute Besserung!"
          : `Abwesenheit vom ${formatScheduleDate(fromDate)} bis ${formatScheduleDate(toDate)} wurde beantragt`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  }

  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && !saving && onClose()}
    >
      <section className="area-editor-panel" role="dialog" aria-modal="true" aria-labelledby="absence-editor-title">
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Schedule · Abwesenheiten</p>
            <h2 id="absence-editor-title">Abwesenheit melden</h2>
            <p>Erfasse deine Abwesenheit, damit die Dienstplanung rechtzeitig angepasst werden kann.</p>
          </div>
          <button
            className="area-editor-close"
            type="button"
            onClick={onClose}
            aria-label="Abwesenheitseditor schliessen"
          >
            ×
          </button>
        </header>
        <form className="area-editor-form" onSubmit={submit}>
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="calendar" />
            </span>
            <div>
              <strong>{kind === "sick" ? "Krankmeldung" : "Neue Abwesenheit"}</strong>
              <p>
                {kind === "sick"
                  ? "Gilt sofort: deine Dienste in diesem Zeitraum werden freigegeben und die Leitung informiert."
                  : "Die Leitung wird über deine Meldung informiert und prüft die Abdeckung."}
              </p>
            </div>
          </div>
          <div className="area-editor-grid">
            <label>
              Art der Abwesenheit
              <ScheduleSelect
                label="Art der Abwesenheit"
                value={ABSENCE_KINDS[kind]}
                options={Object.values(ABSENCE_KINDS)}
                onChange={(label) =>
                  setKind(
                    (Object.keys(ABSENCE_KINDS) as AbsenceKind[]).find((key) => ABSENCE_KINDS[key] === label) ??
                      "vacation",
                  )
                }
              />
            </label>
            <label>
              Priorität
              <ScheduleSelect
                label="Priorität"
                value={urgent ? "Dringend" : "Normal"}
                options={["Normal", "Dringend"]}
                onChange={(value) => setUrgent(value === "Dringend")}
              />
            </label>
            <label>
              Von
              <ScheduleDatePicker
                label="Von"
                value={fromDate}
                onChange={(value) => {
                  setFromDate(value);
                  if (toDate < value) setToDate(value);
                }}
              />
            </label>
            <label>
              Bis
              <ScheduleDatePicker label="Bis" value={toDate} onChange={setToDate} />
            </label>
            <label className="area-editor-wide">
              Stellvertretung
              <ScheduleSelect
                label="Stellvertretung"
                value={substituteName}
                options={[NO_SUBSTITUTE, ...colleagues.map((person) => person.name)]}
                onChange={(name) => setSubstitute(colleagues.find((person) => person.name === name)?.id ?? "")}
              />
            </label>
            <label className="area-editor-wide">
              Hinweis oder Bemerkung
              <textarea
                value={note}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
                placeholder="z. B. Übergabe an das Team, Erreichbarkeit …"
                rows={4}
              />
            </label>
          </div>
          <div className="duty-assignment-summary">
            <span>
              <strong>{ABSENCE_KINDS[kind]}</strong>
              <small>
                {substitute ? `Vertretung: ${substituteName}` : "Ohne Stellvertretung"}
                {urgent ? " · dringend" : ""}
              </small>
            </span>
            <span>
              <strong>
                {formatScheduleDate(fromDate)} – {formatScheduleDate(toDate)}
              </strong>
              <small>
                {workdays} {workdays === 1 ? "Arbeitstag" : "Arbeitstage"} (Mo–Fr)
              </small>
            </span>
          </div>
          {error && (
            <p className="appointment-editor-error" role="alert">
              {error}
            </p>
          )}
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit" disabled={saving || toDate < fromDate}>
              <ModuleIcon name="check" /> {saving ? "Wird gemeldet…" : "Abwesenheit melden"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

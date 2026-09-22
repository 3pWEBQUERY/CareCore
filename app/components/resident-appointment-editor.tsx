"use client";

import { useState, type FormEvent } from "react";
import { CalendarDots, Check, Trash, X } from "@phosphor-icons/react";
import { CareDatePicker, CareSelect } from "@/app/components/care-form-controls";
import {
  appointmentCategories, draftFromAppointment, initialAppointmentDraft, zurichTimeToIso,
  type AppointmentDraft, type AppointmentResident, type ResidentAppointment,
} from "@/lib/resident-appointments";

const times = Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`);
const statusLabels = { scheduled: "Geplant", completed: "Abgeschlossen", cancelled: "Abgesagt" } as const;

export default function ResidentAppointmentEditor({
  appointment, residents, residentId, initialDraft, onClose, onSaved,
}: {
  appointment?: ResidentAppointment | null;
  residents: AppointmentResident[];
  residentId?: string;
  initialDraft?: AppointmentDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<AppointmentDraft>(() => appointment ? draftFromAppointment(appointment) : initialDraft ?? initialAppointmentDraft(residentId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const residentOptions = residents.map((item) => ({ ...item, label: `${item.name} · ${item.room_name || item.care_unit_name || "ohne Zimmer"}` }));
  const selectedResident = residentOptions.find((item) => item.id === draft.residentId);
  const update = <K extends keyof AppointmentDraft>(key: K, value: AppointmentDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const startsAt = zurichTimeToIso(draft.date, draft.startTime);
    const endsAt = zurichTimeToIso(draft.date, draft.endTime);
    if (!draft.residentId) { setError("Bitte einen Bewohner auswählen."); return; }
    if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) { setError("Bitte einen gültigen Zeitraum mit Endzeit nach der Startzeit wählen."); return; }
    setSaving(true);
    try {
      const response = await fetch(appointment ? `/api/appointments/${appointment.id}` : "/api/appointments", {
        method: appointment ? "PATCH" : "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ residentId: draft.residentId, title: draft.title, category: draft.category, startsAt, endsAt, location: draft.location, notes: draft.notes, status: draft.status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Termin konnte nicht gespeichert werden.");
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Termin konnte nicht gespeichert werden."); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!appointment) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Termin konnte nicht gelöscht werden.");
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Termin konnte nicht gelöscht werden."); setSaving(false); }
  }

  return <div className="area-editor-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
    <section className="area-editor-panel appointment-editor-panel" role="dialog" aria-modal="true" aria-labelledby="appointment-editor-title">
      <header className="area-editor-header"><div><p className="eyebrow">CareCore · Bewohnertermine</p><h2 id="appointment-editor-title">{appointment ? "Termin verwalten" : "Termin erstellen"}</h2><p>Termine sind im Betriebskalender und in der Bewohnerakte sichtbar.</p></div><button className="area-editor-close" type="button" aria-label="Terminfenster schliessen" onClick={onClose}><X/></button></header>
      <form className="area-editor-form" onSubmit={save}>
        <div className="area-editor-intro"><span className="area-editor-icon"><CalendarDots/></span><div><strong>{appointment ? appointment.title : "Neuer Bewohnertermin"}</strong><p>Alle Zeiten werden für das Alterszentrum in der Zeitzone Zürich geführt.</p></div></div>
        <div className="area-editor-grid appointment-editor-grid">
          <label className="area-editor-wide"><span>Bezeichnung</span><input required maxLength={180} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="z. B. Arztvisite, Physiotherapie oder Untersuchung"/></label>
          <label><span>Bewohner</span>{residentId ? <input value={selectedResident?.name ?? appointment?.resident_name ?? "Bewohner"} readOnly/> : <CareSelect label="Bewohner" value={selectedResident?.label ?? "Bewohner auswählen"} options={residentOptions.map((item) => item.label)} onChange={(value) => update("residentId", residentOptions.find((item) => item.label === value)?.id ?? "")}/>}</label>
          <label><span>Kategorie</span><CareSelect label="Kategorie" value={draft.category} options={[...appointmentCategories]} onChange={(value) => update("category", value)}/></label>
          <label><span>Datum</span><CareDatePicker label="Termindatum" value={draft.date} onChange={(value) => update("date", value)}/></label>
          <label><span>Ort</span><input maxLength={180} value={draft.location} onChange={(event) => update("location", event.target.value)} placeholder="z. B. Praxis, Therapieraum oder Spital"/></label>
          <label><span>Von</span><CareSelect label="Beginn" value={draft.startTime} options={times} onChange={(value) => update("startTime", value)}/></label>
          <label><span>Bis</span><CareSelect label="Ende" value={draft.endTime} options={times} onChange={(value) => update("endTime", value)}/></label>
          {appointment && <label><span>Status</span><CareSelect label="Terminstatus" value={statusLabels[draft.status]} options={Object.values(statusLabels)} onChange={(value) => update("status", value === "Abgeschlossen" ? "completed" : value === "Abgesagt" ? "cancelled" : "scheduled")}/></label>}
          <label className="area-editor-wide"><span>Hinweise für das Team</span><textarea rows={4} maxLength={4000} value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Vorbereitung, Begleitung, Transport oder wichtige Informationen …"/></label>
        </div>
        {error && <p className="appointment-editor-error" role="alert">{error}</p>}
        {confirmDelete && <div className="appointment-delete-confirm" role="alert"><strong>Termin endgültig löschen?</strong><p>Der Eintrag verschwindet auch aus der Bewohnerakte. Für eine Absage kannst du stattdessen den Status „Abgesagt“ wählen.</p><div><button className="secondary-button" type="button" onClick={() => setConfirmDelete(false)}>Behalten</button><button className="appointment-danger-button" type="button" disabled={saving} onClick={() => void remove()}>Ja, löschen</button></div></div>}
        <footer className="area-editor-actions appointment-editor-actions">{appointment && !confirmDelete && <button className="appointment-delete-button" type="button" onClick={() => setConfirmDelete(true)}><Trash/> Löschen</button>}<button className="secondary-button" type="button" onClick={onClose}>Abbrechen</button><button className="primary-button" type="submit" disabled={saving || !residents.length}><Check/> {saving ? "Speichern…" : appointment ? "Änderungen speichern" : "Termin erstellen"}</button></footer>
      </form>
    </section>
  </div>;
}

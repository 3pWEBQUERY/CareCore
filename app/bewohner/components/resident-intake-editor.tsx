"use client";

import { useState } from "react";
import { useApiData } from "@/app/components/workspace-ui";
import { CARE_LEVELS, NOT_ASSESSED } from "@/lib/care-levels";
import { CareDatePicker, CareSelect, formatCareDate } from "../../components/care-form-controls";
import { Icon } from "./residents-utils";

type IntakeOptions = {
  units: Array<{ id: string; name: string }>;
  rooms: Array<{ id: string; name: string; careUnitId: string; free: number }>;
  staff: Array<{ id: string; name: string }>;
  primaryCareUnitId: string | null;
};

const NO_NURSE = "Noch nicht festgelegt";

type Props = { open: boolean; onClose: () => void; onSuccess: (message: string) => void };

// Rendered only while open, so every admission starts with an empty form.
export function ResidentIntakeEditor(props: Props) {
  return props.open ? <IntakeForm {...props} /> : null;
}

function IntakeForm({ onClose, onSuccess }: Props) {
  const options = useApiData<IntakeOptions>("/api/residents/intake-options");
  const units = options.data?.units ?? [];
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("Weiblich");
  const [admissionDate, setAdmissionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [chosenUnitId, setUnitId] = useState<string | null>(null);
  const [room, setRoom] = useState("");
  const [careLevel, setCareLevel] = useState(NOT_ASSESSED);
  const [nurseId, setNurseId] = useState<string | null>(null);
  const [status, setStatus] = useState("Aktiv");
  // Until chosen: the own care unit, otherwise the first one.
  const unitId =
    chosenUnitId ?? units.find((item) => item.id === options.data?.primaryCareUnitId)?.id ?? units[0]?.id ?? null;
  const unit = units.find((item) => item.id === unitId)?.name ?? "";
  const unitRooms = (options.data?.rooms ?? []).filter((item) => item.careUnitId === unitId);
  const nurse = options.data?.staff.find((item) => item.id === nurseId)?.name ?? NO_NURSE;
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submitIntake(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          birthDate,
          gender,
          admissionDate,
          careUnitId: unitId,
          room,
          careLevel,
          primaryNurseId: nurseId,
          status,
          note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Aufnahme fehlgeschlagen.");
      onClose();
      onSuccess(`${firstName} ${lastName} wurde aufgenommen und ${unit} zugewiesen`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Aufnahme fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }
  const fullName = `${firstName} ${lastName}`.trim();
  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section
        className="area-editor-panel resident-intake-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-intake-title"
      >
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Bewohner · Aufnahme</p>
            <h2 id="resident-intake-title">Bewohner aufnehmen</h2>
            <p>Erstelle die Bewohnerakte und weise die Person direkt einem Zimmer und einer Bezugspflege zu.</p>
          </div>
          <button className="area-editor-close" type="button" onClick={onClose} aria-label="Aufnahmeeditor schliessen">
            ×
          </button>
        </header>
        <form className="area-editor-form" onSubmit={submitIntake}>
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <Icon name="residents" />
            </span>
            <div>
              <strong>Neue Bewohnerakte</strong>
              <p>Pflichtangaben können später in den Stammdaten ergänzt und bearbeitet werden.</p>
            </div>
            <span className="duty-assignment-status">
              <i />
              Aufnahme vorbereiten
            </span>
          </div>
          <div className="area-editor-grid">
            <label>
              Vorname
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="z. B. Elisabeth"
                required
              />
            </label>
            <label>
              Nachname
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="z. B. Weber"
                required
              />
            </label>
            <label>
              Geburtsdatum
              <input
                type="date"
                value={birthDate}
                max={admissionDate}
                onChange={(event) => setBirthDate(event.target.value)}
                aria-label="Geburtsdatum"
                required
              />
            </label>
            <label>
              Geschlecht
              <CareSelect
                label="Geschlecht"
                value={gender}
                options={["Weiblich", "Männlich", "Divers", "Keine Angabe"]}
                onChange={setGender}
              />
            </label>
            <label>
              Eintrittsdatum
              <CareDatePicker label="Eintrittsdatum" value={admissionDate} onChange={setAdmissionDate} />
            </label>
            <label>
              Pflegestufe
              <CareSelect
                label="Pflegestufe"
                value={careLevel}
                options={[NOT_ASSESSED, ...CARE_LEVELS]}
                onChange={setCareLevel}
              />
            </label>
            <label>
              Wohnbereich
              <CareSelect
                label="Wohnbereich"
                value={unit || (options.loading ? "Wird geladen …" : "Kein Wohnbereich")}
                options={units.map((item) => item.name)}
                onChange={(name) => {
                  setUnitId(units.find((item) => item.name === name)?.id ?? null);
                  setRoom("");
                }}
              />
            </label>
            <label>
              Zimmer
              <input
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                placeholder={unitRooms[0] ? `z. B. ${unitRooms[0].name}` : "z. B. Zimmer 216"}
                list="intake-rooms"
                maxLength={80}
                required
              />
              <datalist id="intake-rooms">
                {unitRooms.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.free > 0 ? `${item.free} Bett${item.free === 1 ? "" : "en"} frei` : "belegt"}
                  </option>
                ))}
              </datalist>
            </label>
            <label>
              Bezugspflege
              <CareSelect
                label="Bezugspflege"
                value={nurse}
                options={[NO_NURSE, ...(options.data?.staff ?? []).map((item) => item.name)]}
                onChange={(name) => setNurseId(options.data?.staff.find((item) => item.name === name)?.id ?? null)}
              />
            </label>
            <label>
              Status
              <CareSelect
                label="Status"
                value={status}
                options={["Aktiv", "Eintritt geplant", "Vorläufig"]}
                onChange={setStatus}
              />
            </label>
            <label className="area-editor-wide">
              Hinweis zur Aufnahme
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="z. B. Angehörige, Diagnosen oder wichtige Hinweise …"
                rows={5}
              />
            </label>
          </div>
          <div className="duty-assignment-summary">
            <span>
              <strong>{fullName || "Neue Bewohnerakte"}</strong>
              <small>{[room || "Zimmer offen", unit, careLevel].filter(Boolean).join(" · ")}</small>
            </span>
            <span>
              <strong>Eintritt {formatCareDate(admissionDate)}</strong>
              <small>
                Bezugspflege: {nurse} · {status}
              </small>
            </span>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit" disabled={saving || !unitId}>
              <Icon name="check" /> {saving ? "Speichern…" : "Bewohner aufnehmen"}
            </button>
          </footer>
          {(error || options.error) && (
            <p className="appointment-editor-error" role="alert">
              {error || options.error}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

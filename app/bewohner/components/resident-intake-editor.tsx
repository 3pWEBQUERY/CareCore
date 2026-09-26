"use client";

import { useState } from "react";
import { CareDatePicker, CareSelect, formatCareDate } from "../../components/care-form-controls";
import { Icon } from "./residents-utils";

export function ResidentIntakeEditor({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("1942-05-18");
  const [gender, setGender] = useState("Weiblich");
  const [admissionDate, setAdmissionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [unit, setUnit] = useState("Wohnbereich 2");
  const [room, setRoom] = useState("Zimmer 216");
  const [careLevel, setCareLevel] = useState("Pflegestufe 3");
  const [owner, setOwner] = useState("Anna Meier");
  const [status, setStatus] = useState("Aktiv");
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
          unit,
          room,
          careLevel,
          owner,
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
  if (!open) return null;
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
              <CareDatePicker label="Geburtsdatum" value={birthDate} onChange={setBirthDate} />
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
                options={["Pflegestufe 1", "Pflegestufe 2", "Pflegestufe 3", "Pflegestufe 4", "Pflegestufe 5"]}
                onChange={setCareLevel}
              />
            </label>
            <label>
              Wohnbereich
              <CareSelect
                label="Wohnbereich"
                value={unit}
                options={["Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Pflegewohngruppe"]}
                onChange={setUnit}
              />
            </label>
            <label>
              Zimmer
              <input
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                placeholder="z. B. Zimmer 216"
                required
              />
            </label>
            <label>
              Bezugspflege
              <CareSelect
                label="Bezugspflege"
                value={owner}
                options={["Anna Meier", "Lea Frei", "Nora Baumann", "Sven Keller"]}
                onChange={setOwner}
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
              <small>
                {room} · {unit} · {careLevel}
              </small>
            </span>
            <span>
              <strong>Eintritt {formatCareDate(admissionDate)}</strong>
              <small>
                Bezugspflege: {owner} · {status}
              </small>
            </span>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              <Icon name="check" /> {saving ? "Speichern…" : "Bewohner aufnehmen"}
            </button>
          </footer>
          {error && <p role="alert">{error}</p>}
        </form>
      </section>
    </div>
  );
}

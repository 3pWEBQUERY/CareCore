"use client";

import { useState } from "react";
import { CareDatePicker, CareSelect } from "@/app/components/care-form-controls";
import { EditorDialog, requestJson, todayInZurich } from "@/app/components/workspace-ui";
import { INSTRUMENTS, bandFor, instrumentByCode, scoreAnswers } from "@/lib/assessment-instruments";
import { useCareResident } from "@/app/components/care-context";

const plusDays = (days: number) => {
  const date = new Date(`${todayInZurich()}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export default function AssessmentDialog({
  residents,
  residentId: initialResident,
  instrument: initialInstrument,
  onClose,
  onSaved,
}: {
  residents: Array<{ id: string; name: string; room: string }>;
  residentId?: string;
  instrument?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [contextId] = useCareResident();
  const [residentId, setResidentId] = useState(
    initialResident ?? residents.find((r) => r.id === contextId)?.id ?? residents[0]?.id ?? "",
  );
  const [code, setCode] = useState(
    initialInstrument && instrumentByCode(initialInstrument) ? initialInstrument : INSTRUMENTS[0].code,
  );
  const instrument = instrumentByCode(code)!;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [nextDueOn, setNextDueOn] = useState(() => plusDays(instrument.reassessDays));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const score = scoreAnswers(instrument, answers);
  const band = score === null ? null : bandFor(instrument, score);
  const answered = instrument.items.filter((item) => answers[item.key] !== undefined).length;
  const residentLabel = (r: { name: string; room: string }) => `${r.name}${r.room ? ` · ${r.room}` : ""}`;
  const resident = residents.find((r) => r.id === residentId);

  const chooseInstrument = (name: string) => {
    const next = INSTRUMENTS.find((i) => i.name === name);
    if (!next) return;
    setCode(next.code);
    setAnswers({});
    setNextDueOn(plusDays(next.reassessDays));
  };

  async function save() {
    if (score === null) {
      setError(`Bitte alle ${instrument.items.length} Fragen beantworten (${answered} beantwortet).`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await requestJson<{ score: number; riskLabel: string | null }>("/api/assessments", {
        method: "POST",
        body: { residentId, instrument: code, answers, note, nextDueOn },
      });
      onSaved(
        `${resident?.name}: ${instrument.name} ${result.score} Punkte${result.riskLabel ? ` · ${result.riskLabel}` : ""}`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Einschätzung konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  return (
    <EditorDialog
      id="assessment"
      eyebrow="CareCore Einschätzungen"
      title={instrument.name}
      description={instrument.description}
      onClose={onClose}
      onSubmit={save}
      saving={saving}
      error={error}
      submitLabel="Einschätzung abschliessen"
    >
      <label>
        <span>Bewohner</span>
        {initialResident ? (
          <input value={resident ? residentLabel(resident) : ""} readOnly />
        ) : (
          <CareSelect
            label="Bewohner"
            value={resident ? residentLabel(resident) : "Bewohner wählen"}
            options={residents.map(residentLabel)}
            onChange={(value) => setResidentId(residents.find((r) => residentLabel(r) === value)?.id ?? residentId)}
          />
        )}
      </label>
      <label>
        <span>Instrument</span>
        {initialInstrument ? (
          <input value={instrument.name} readOnly />
        ) : (
          <CareSelect
            label="Instrument"
            value={instrument.name}
            options={INSTRUMENTS.map((i) => i.name)}
            onChange={chooseInstrument}
          />
        )}
      </label>
      {instrument.items.map((item) => (
        <fieldset key={item.key} className="area-editor-wide assessment-item">
          <legend>{item.label}</legend>
          <div className={item.options.length > 5 ? "compact" : ""}>
            {item.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={answers[item.key] === option.value ? "active" : ""}
                aria-pressed={answers[item.key] === option.value}
                onClick={() => setAnswers((current) => ({ ...current, [item.key]: option.value }))}
              >
                {item.options.length > 5 ? option.label : `${option.label} (${option.value})`}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <div className={`area-editor-wide assessment-score ${band?.tone ?? ""}`} aria-live="polite">
        <strong>{score === null ? `${answered} / ${instrument.items.length} beantwortet` : `${score} Punkte`}</strong>
        <span>{band?.label ?? "Ergebnis erscheint, sobald alle Fragen beantwortet sind."}</span>
      </div>
      <label>
        <span>Nächste Einschätzung</span>
        <CareDatePicker label="Nächste Einschätzung" value={nextDueOn} onChange={setNextDueOn} />
      </label>
      <label className="area-editor-wide">
        <span>Bemerkung</span>
        <textarea
          rows={2}
          maxLength={4000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z. B. Einschätzung nach Sturz, abgeleitete Massnahmen"
        />
      </label>
    </EditorDialog>
  );
}

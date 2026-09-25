"use client";

import { CareSelect } from "@/app/components/care-form-controls";
import { EDGE_OPTIONS, EXUDATE_OPTIONS, SKIN_OPTIONS, TISSUE_OPTIONS } from "@/lib/wounds-shared";

export type EntryDraft = {
  lengthCm: string;
  widthCm: string;
  depthCm: string;
  tissue: string;
  exudate: string;
  woundEdge: string;
  surroundingSkin: string;
  odor: boolean;
  infectionSigns: boolean;
  painScore: string;
  treatment: string;
  note: string;
};

export const emptyEntry: EntryDraft = {
  lengthCm: "",
  widthCm: "",
  depthCm: "",
  tissue: "",
  exudate: "",
  woundEdge: "",
  surroundingSkin: "",
  odor: false,
  infectionSigns: false,
  painScore: "",
  treatment: "",
  note: "",
};

const NOT_SET = "Nicht beurteilt";
const PAIN = ["Nicht erhoben", ...Array.from({ length: 11 }, (_, i) => `${i}`)];
const decimal = (value: string) => (value.trim() ? Number(value.replace(",", ".")) : null);

export function entryPayload(draft: EntryDraft) {
  return {
    lengthCm: decimal(draft.lengthCm),
    widthCm: decimal(draft.widthCm),
    depthCm: decimal(draft.depthCm),
    tissue: draft.tissue || null,
    exudate: draft.exudate || null,
    woundEdge: draft.woundEdge || null,
    surroundingSkin: draft.surroundingSkin || null,
    odor: draft.odor,
    infectionSigns: draft.infectionSigns,
    painScore: draft.painScore === "" ? null : Number(draft.painScore),
    treatment: draft.treatment,
    note: draft.note,
  };
}

// Structured wound assessment shared by the initial assessment and follow-up entries.
export default function EntryFields({ draft, onChange }: { draft: EntryDraft; onChange: (draft: EntryDraft) => void }) {
  const set = <K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) => onChange({ ...draft, [key]: value });
  const select = (
    key: "tissue" | "exudate" | "woundEdge" | "surroundingSkin",
    label: string,
    options: readonly string[],
  ) => (
    <label>
      <span>{label}</span>
      <CareSelect
        label={label}
        value={draft[key] || NOT_SET}
        options={[NOT_SET, ...options]}
        onChange={(value) => set(key, value === NOT_SET ? "" : value)}
      />
    </label>
  );
  return (
    <>
      <div className="area-editor-wide form-field">
        <span>Grösse (cm)</span>
        <div className="wound-size-inputs">
          <input
            inputMode="decimal"
            aria-label="Länge in cm"
            placeholder="Länge"
            value={draft.lengthCm}
            onChange={(e) => set("lengthCm", e.target.value)}
          />
          <b aria-hidden="true">×</b>
          <input
            inputMode="decimal"
            aria-label="Breite in cm"
            placeholder="Breite"
            value={draft.widthCm}
            onChange={(e) => set("widthCm", e.target.value)}
          />
          <b aria-hidden="true">×</b>
          <input
            inputMode="decimal"
            aria-label="Tiefe in cm"
            placeholder="Tiefe (optional)"
            value={draft.depthCm}
            onChange={(e) => set("depthCm", e.target.value)}
          />
        </div>
      </div>
      {select("tissue", "Wundgrund", TISSUE_OPTIONS)}
      {select("exudate", "Exsudat", EXUDATE_OPTIONS)}
      {select("woundEdge", "Wundrand", EDGE_OPTIONS)}
      {select("surroundingSkin", "Wundumgebung", SKIN_OPTIONS)}
      <label>
        <span>Schmerz (NRS 0–10)</span>
        <CareSelect
          label="Schmerz"
          value={draft.painScore === "" ? PAIN[0] : draft.painScore}
          options={PAIN}
          onChange={(value) => set("painScore", value === PAIN[0] ? "" : value)}
        />
      </label>
      <div className="form-field">
        <span>Beobachtungen</span>
        <label className="form-checkbox">
          <input type="checkbox" checked={draft.odor} onChange={(e) => set("odor", e.target.checked)} />
          Auffälliger Geruch
        </label>
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={draft.infectionSigns}
            onChange={(e) => set("infectionSigns", e.target.checked)}
          />
          Infektionszeichen (Rötung, Wärme, Schwellung, Eiter)
        </label>
      </div>
      <label className="area-editor-wide">
        <span>Durchgeführte Versorgung</span>
        <textarea
          rows={2}
          maxLength={4000}
          value={draft.treatment}
          onChange={(e) => set("treatment", e.target.value)}
          placeholder="z. B. Reinigung mit NaCl 0,9 %, Hydrokolloidverband, Druckentlastung"
        />
      </label>
      <label className="area-editor-wide">
        <span>Bemerkung</span>
        <textarea
          rows={2}
          maxLength={4000}
          value={draft.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Weitere Beobachtungen, Absprachen"
        />
      </label>
    </>
  );
}

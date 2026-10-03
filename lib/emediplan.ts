import { gunzipSync } from "node:zlib";
import { ApiError } from "@/lib/api-context";
import type { EmediplanDraft, EmediplanLine, EmediplanSlot } from "@/lib/emediplan-shared";

export { dosesBySlot } from "@/lib/emediplan-shared";

// Lesen des ChTransmissionFormat (Inhalt des QR-Codes auf dem eMediplan): `CHMED16A0{JSON}` oder
// `CHMED16A1{Base64(gzip(JSON))}` laut Spezifikation der IG eMediplan. CHMED23A hat ein anderes Objektmodell und wird
// (noch) nicht gelesen. Gelesen wird nur, was im Plan steht – ohne Arzneimitteldatenbank, ohne Prüfung.

const MAX_LENGTH = 200_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown) =>
  typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
const day = (value: unknown) => {
  const text = str(value).slice(0, 10);
  return DATE.test(text) ? text : null;
};

// Inhalt des QR-Codes in das JSON-Objekt des Plans umwandeln.
export function decodeChmed(input: string): { version: string; plan: Json } {
  const code = input.trim();
  if (!code) throw new ApiError("Bitte den Inhalt des eMediplan-QR-Codes einfügen oder scannen.");
  if (code.length > MAX_LENGTH) throw new ApiError("Der Code ist zu lang für einen eMediplan.");
  const match = /^CHMED(\d{2})([A-Z]+)/i.exec(code);
  if (!match) throw new ApiError("Das ist kein eMediplan-Code (er beginnt nicht mit „CHMED“).");
  const year = match[1];
  if (year === "23")
    throw new ApiError("eMediplan nach CHMED23A wird noch nicht unterstützt. Bitte die Medikation von Hand erfassen.");
  const v16 = /^CHMED16([A-Z])([01])([\s\S]*)$/i.exec(code);
  if (year !== "16" || !v16) throw new ApiError(`Diese eMediplan-Version (CHMED${year}) wird nicht unterstützt.`);
  const version = `CHMED16${v16[1].toUpperCase()}`;
  let json: string;
  try {
    json = v16[2] === "1" ? gunzipSync(Buffer.from(v16[3].trim(), "base64")).toString("utf8") : v16[3];
  } catch {
    throw new ApiError("Der eMediplan-Code ist unvollständig oder beschädigt. Bitte erneut scannen.");
  }
  let plan: unknown;
  try {
    plan = JSON.parse(json);
  } catch {
    throw new ApiError("Der eMediplan-Code ist unvollständig oder beschädigt. Bitte erneut scannen.");
  }
  if (!isObject(plan) || !Array.isArray(plan.Medicaments))
    throw new ApiError("Der eMediplan enthält keine Medikamente.");
  return { version, plan };
}

function doses(value: unknown): Record<EmediplanSlot, number> | null {
  if (!Array.isArray(value) || !value.length) return null;
  const numbers = value.slice(0, 4).map((item) => (typeof item === "number" && Number.isFinite(item) ? item : 0));
  while (numbers.length < 4) numbers.push(0);
  if (numbers.every((item) => item === 0)) return null;
  return { morning: numbers[0], noon: numbers[1], evening: numbers[2], night: numbers[3] };
}

// Plan in Entwurfszeilen übersetzen (ohne Zuordnung zum eigenen Präparatestamm).
export function draftFromPlan(version: string, plan: Json): Omit<EmediplanDraft, "patientMismatch"> {
  const patient = isObject(plan.Patient) ? plan.Patient : {};
  const lines: EmediplanLine[] = (plan.Medicaments as unknown[]).filter(isObject).map((item, index) => {
    const positions = Array.isArray(item.Pos) ? item.Pos.filter(isObject) : [];
    const first = positions[0] ?? {};
    const idType = typeof item.IdType === "number" ? item.IdType : 1;
    const id = str(item.Id);
    const timed = Array.isArray(first.TT) && first.TT.length > 0;
    return {
      index,
      idType,
      id,
      freeText: idType === 1 ? id : null,
      unit: str(item.Unit),
      route: str(item.Roa),
      reason: str(item.TkgRsn),
      instructions: str(item.AppInstr),
      prescribedBy: str(item.PrscbBy),
      selfMedication: item.AutoMed === 1,
      from: day(first.DtFrom),
      to: day(first.DtTo),
      reserve: first.InRes === 1,
      doses: timed ? null : doses(first.D),
      complex: timed || positions.length > 1,
      match: null,
    };
  });
  return {
    version,
    issuedAt: str(plan.Dt) || null,
    author: str(plan.Auth),
    remark: str(plan.Rmk),
    patient: {
      firstName: str(patient.FName),
      lastName: str(patient.LName),
      birthDate: day(patient.BDt),
    },
    lines,
  };
}

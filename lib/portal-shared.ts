// Portal für Angehörige und Ärztinnen/Ärzte: Arten, Bereiche und Grundlagen der Freigabe (Server und Oberfläche).

export const PORTAL_KINDS = { relative: "Angehörige", physician: "Ärztin / Arzt" } as const;
export type PortalKind = keyof typeof PORTAL_KINDS;

// Bereiche, die eine Freigabe einzeln öffnet. Die Grunddaten (Name, Geburtsdatum, Wohnbereich, Zimmer) gehören zu
// jeder Freigabe, damit die Person erkennbar ist.
export const PORTAL_AREAS = {
  emergency: "Notfalldaten (Reanimationsstatus, Allergien)",
  medication: "Medikation (laufende Verordnungen)",
  vitals: "Vitalwerte (30 Tage)",
  reports: "Pflegeberichte (14 Tage)",
  appointments: "Termine (kommende)",
  wounds: "Wunden (offene)",
} as const;
export type PortalArea = keyof typeof PORTAL_AREAS;
export const PORTAL_AREA_KEYS = Object.keys(PORTAL_AREAS) as PortalArea[];

// Worauf die Freigabe beruht; der Vermerk hält Einzelheiten fest (z. B. Datum der Einwilligung).
export const PORTAL_BASES = {
  consent: "Einwilligung der Person",
  representative: "Vertretungsberechtigte Person",
  treatment: "Behandlungsverhältnis",
} as const;
export type PortalBasis = keyof typeof PORTAL_BASES;

export type PortalGrant = {
  id: string;
  residentId: string | null;
  residentName: string | null;
  careUnitId: string | null;
  careUnitName: string | null;
  areas: PortalArea[];
  validFrom: string | null;
  validUntil: string | null;
  basis: PortalBasis;
  basisNote: string;
  createdAt: string;
  createdBy: string | null;
  revokedAt: string | null;
};

export type PortalAccount = {
  id: string;
  kind: PortalKind;
  displayName: string;
  username: string;
  email: string;
  phone: string;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  grants: PortalGrant[];
};

export type PortalAccessEntry = {
  id: string;
  action: string;
  residentName: string | null;
  areas: PortalArea[];
  createdAt: string;
};

// Sicht des Portals: eine freigegebene Person mit den Bereichen (bei mehreren Freigaben zusammengeführt).
export type PortalResident = {
  id: string;
  name: string;
  birthDate: string | null;
  careUnit: string;
  room: string;
  areas: PortalArea[];
};

export type PortalResidentDetail = PortalResident & {
  emergency?: { resuscitation: string; resuscitationSource: string; decidedOn: string | null; allergies: string };
  medication?: Array<{ name: string; amount: string; times: string[]; prn: boolean; indication: string }>;
  vitals?: Array<{ metric: string; value: string; unit: string; measuredAt: string }>;
  reports?: Array<{ category: string; title: string; body: string; occurredAt: string }>;
  appointments?: Array<{ title: string; startsAt: string; location: string; category: string }>;
  wounds?: Array<{ title: string; location: string; status: string; since: string | null }>;
};

export const isPortalArea = (value: unknown): value is PortalArea => typeof value === "string" && value in PORTAL_AREAS;

// Freigegebene Bereiche aus JSON (unbekannte Einträge fallen weg).
export const portalAreas = (value: unknown): PortalArea[] =>
  Array.isArray(value) ? [...new Set(value.filter(isPortalArea))] : [];

// Mindestlänge und Zusammensetzung des Portal-Passworts.
export function portalPasswordProblem(password: string) {
  if (password.length < 12) return "Das Passwort braucht mindestens 12 Zeichen.";
  if (password.length > 200) return "Das Passwort ist zu lang.";
  if (!/[A-Za-zÄÖÜäöü]/.test(password) || !/\d/.test(password)) return "Das Passwort braucht Buchstaben und Ziffern.";
  return null;
}

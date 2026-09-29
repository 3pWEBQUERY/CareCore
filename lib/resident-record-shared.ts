// Resident record (Bewohnerakte): master data, key figures, timeline and documents,
// shared by the API and the record panel.

export const MARITAL_STATUSES = ["Ledig", "Verheiratet", "Eingetragene Partnerschaft", "Verwitwet", "Geschieden"];
export const LANGUAGES: Record<string, string> = {
  "de-CH": "Deutsch",
  "fr-CH": "Französisch",
  "it-CH": "Italienisch",
  en: "Englisch",
  other: "Andere",
};
// Dokumente der Bewohnerakte: PDFs und Bilder (z. B. fotografierte Arztberichte), höchstens 4 MB.
export const RESIDENT_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const RESIDENT_FILE_MAX_BYTES = 4 * 1024 * 1024;

export const RESIDENT_DOCUMENT_CATEGORIES = ["Arztberichte", "Pflege", "Medikation", "Administration"] as const;

export type MasterData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string;
  maritalStatus: string | null;
  language: string;
  socialSecurityNumber: string | null;
  religion: string | null;
  externalNumber: string | null;
  admittedOn: string | null;
  admissionReason: string | null;
  primaryNurseId: string | null;
  gpName: string | null;
  gpPractice: string | null;
  gpPhone: string | null;
  pharmacy: string | null;
  insurer: string | null;
  insuranceNumber: string | null;
};

export type RecordSummary = {
  master: MasterData;
  primaryNurse: string | null;
  planOwner: string | null;
  careLevel: string | null;
  checkedAt: string | null;
  checkedBy: string | null;
  missing: string[];
  lastVital: { measuredAt: string; metric: string; status: string } | null;
  medsToday: { given: number; total: number };
  documentsCount: number;
  staff: Array<{ id: string; name: string }>;
  canWrite: boolean;
  // Änderungsprotokoll: nur für die Leitung (Rollen mit team.manage oder administration.manage).
  canViewAudit: boolean;
};

export type TimelineCategory = "Pflege" | "Vitalwerte" | "Medikation" | "Termine";

export type TimelineEntry = {
  id: string;
  category: TimelineCategory;
  occurredAt: string;
  title: string;
  description: string;
  author: string | null;
  tone: "critical" | "attention" | "info" | "stable";
  documentationId: string | null;
};

export type ResidentFile = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  fileId: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  uploadedBy: string | null;
};

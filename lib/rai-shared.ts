// interRAI workplace: shared types and labels of API and pages.

export const RAI_INSTRUMENTS = ["interRAI LTCF", "interRAI HC", "interRAI CMH", "interRAI Screener"];

export const RAI_DOMAINS = [
  { id: "Alltag", description: "Essen, Körperpflege, Ankleiden und Mobilität", icon: "tasks" },
  { id: "Kognition", description: "Orientierung, Gedächtnis und Entscheidungsfähigkeit", icon: "assess" },
  { id: "Stimmung", description: "Antrieb, Rückzug und psychosoziales Wohlbefinden", icon: "pulse" },
  { id: "Gesundheit", description: "Schmerz, Haut, Sturzrisiko und klinische Hinweise", icon: "vitals" },
] as const;
export type RaiDomain = (typeof RAI_DOMAINS)[number]["id"];

export const RAI_SCORES = [
  "0 – Kein Bedarf",
  "1 – Beobachten",
  "2 – Geringe Unterstützung",
  "3 – Hoher Unterstützungsbedarf",
  "4 – Umfassende Unterstützung",
];

// Follow-up assessment after completion, and the first one after admission.
export const RAI_INTERVAL_MONTHS = 6;
export const RAI_ADMISSION_DAYS = 14;

export type RaiState = "new" | "due" | "overdue" | "in_progress" | "current";
export const RAI_STATE: Record<RaiState, { label: string; tone: "stable" | "attention" | "critical" | "info" }> = {
  new: { label: "Neuaufnahme", tone: "info" },
  due: { label: "Fällig", tone: "attention" },
  overdue: { label: "Fällig", tone: "critical" },
  in_progress: { label: "In Bearbeitung", tone: "attention" },
  current: { label: "Aktuell", tone: "stable" },
};

export type RaiPerson = {
  id: string;
  name: string;
  initials: string;
  openAssessments: number;
  online: boolean;
};

export type RaiResidentRow = {
  id: string;
  name: string;
  initials: string;
  room: string;
  unit: string;
  careUnitId: string | null;
  state: RaiState;
  reason: string;
  dueOn: string | null;
  progress: number;
  instrument: string | null;
  assessorId: string | null;
  assessor: string | null;
  draftId: string | null;
  lastCompletedOn: string | null;
  averageScore: number | null;
};

export type RaiWorkplace = {
  residents: RaiResidentRow[];
  people: RaiPerson[];
  summary: { records: number; due: number; currentShare: number; responsible: number; drafts: number };
};

export type RaiAssessment = {
  id: string;
  instrument: string;
  status: "new" | "in_progress" | "current" | "overdue" | "archived";
  assessedOn: string;
  dueOn: string | null;
  progress: number;
  scores: Partial<Record<RaiDomain, number>>;
  notes: string;
  assessorId: string | null;
  assessor: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type RaiResidentDetail = {
  resident: { id: string; name: string; room: string; unit: string };
  draft: RaiAssessment | null;
  history: RaiAssessment[];
  people: RaiPerson[];
};

export const scoreLabel = (score: number | undefined) => (score === undefined ? null : RAI_SCORES[score]);
export const scoreFromLabel = (label: string) => {
  const index = RAI_SCORES.indexOf(label);
  return index === -1 ? undefined : index;
};

// Four domains plus the professional note make up the progress of a draft.
export function raiProgress(scores: Partial<Record<RaiDomain, number>>, notes: string) {
  const filled = RAI_DOMAINS.filter((domain) => scores[domain.id] !== undefined).length + (notes.trim() ? 1 : 0);
  return Math.round((filled / (RAI_DOMAINS.length + 1)) * 100);
}

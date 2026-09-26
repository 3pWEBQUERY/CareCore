// Learning definitions shared by the API and the client workspace.

export const TRAINING_CATEGORIES = [
  "Pflege",
  "Medikation",
  "Wundmanagement",
  "Hygiene",
  "Notfall",
  "Sicherheit",
  "Kommunikation",
  "Organisation",
] as const;

export const TRAINING_FORMATS = {
  elearning: "E-Learning",
  presence: "Präsenz",
  external: "Extern",
} as const;
export type TrainingFormat = keyof typeof TRAINING_FORMATS;

export const CERTIFICATE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

// Evidence that expires within this many days counts as "due soon".
export const DUE_SOON_DAYS = 60;

export type TrainingSession = {
  id: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  capacity: number | null;
  booked: number;
  mine: boolean;
};

export type Enrollment = {
  id: string;
  trainingId: string;
  userId: string;
  userName: string;
  status: "assigned" | "in_progress" | "completed";
  progress: number;
  dueOn: string | null;
  sessionId: string | null;
  completedAt: string | null;
  validUntil: string | null;
  verified: boolean;
  verifiedByName: string | null;
  certificateFileId: string | null;
  certificateName: string | null;
  note: string | null;
  assignedByName: string | null;
};

export type Training = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  format: TrainingFormat;
  durationMinutes: number | null;
  mandatory: boolean;
  validForMonths: number | null;
  requiredRoles: string[];
  linkUrl: string | null;
  sessions: TrainingSession[];
  enrollment: Enrollment | null;
  enrolledCount: number;
};

export type ComplianceState = "valid" | "due_soon" | "expired" | "missing" | "pending";

export const COMPLIANCE_STATES: Record<ComplianceState, { label: string; tone: string }> = {
  valid: { label: "Gültig", tone: "stable" },
  due_soon: { label: "Bald fällig", tone: "attention" },
  expired: { label: "Abgelaufen", tone: "critical" },
  missing: { label: "Offen", tone: "critical" },
  pending: { label: "Prüfung ausstehend", tone: "info" },
};

export type ComplianceRow = {
  key: string;
  trainingId: string;
  title: string;
  description: string | null;
  category: string;
  userId: string;
  userName: string;
  state: ComplianceState;
  deadline: string | null;
  enrollment: Enrollment | null;
};

export type LearningPerson = { id: string; name: string; role: string; jobTitle: string };

export type LearningPayload = {
  today: string;
  trainings: Training[];
  compliance: ComplianceRow[];
  people: LearningPerson[];
  roles: Array<{ key: string; name: string }>;
  canManage: boolean;
  currentUserId: string;
};

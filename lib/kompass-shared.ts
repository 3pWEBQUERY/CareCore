// CareCore Kompass: Typen für API und Oberfläche.
import type { ContextKey, KompassData } from "@/lib/kompass-instrument";
import type { RaiPerson } from "@/lib/rai-shared";

export type KompassStatus = "new" | "in_progress" | "current" | "overdue" | "archived";

export type KompassAssessment = {
  id: string;
  instrument: string;
  status: KompassStatus;
  dueOn: string | null;
  progress: number;
  assessorId: string | null;
  assessor: string | null;
  completedAt: string | null;
  completedBy: string | null;
  updatedAt: string;
  // Abklärung mit dem Kompass; frühere vereinfachte Erfassungen nur mit Notiz und Stufen je Bereich.
  kompass: KompassData | null;
  legacy: { assessedOn: string; notes: string; scores: Record<string, number> } | null;
};

// Fakten aus anderen Bereichen der Akte, beim passenden Kompass-Bereich gezeigt (ohne Bewertung).
export type KompassFact = { label: string; detail: string; href: string };
export type KompassContext = Record<ContextKey, KompassFact[]>;

export type KompassDetail = {
  resident: { id: string; name: string; room: string; unit: string; admittedOn: string | null };
  // Laufende Abklärung (Entwurf) und geplante, noch nicht begonnene.
  draft: KompassAssessment | null;
  planned: { id: string; dueOn: string | null } | null;
  history: KompassAssessment[];
  // Antworten der letzten abgeschlossenen Abklärung mit dem Kompass (zum Vergleich).
  previous: KompassAssessment | null;
  people: RaiPerson[];
  context: KompassContext;
  settings: { admissionDays: number | null; intervalMonths: number | null };
  today: string;
};

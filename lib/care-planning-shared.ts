// Care planning definitions shared by the API and the client workspace.

export const GOAL_CATEGORIES = [
  "Mobilität",
  "Sicherheit & Sturz",
  "Körperpflege",
  "Ernährung & Flüssigkeit",
  "Ausscheidung",
  "Haut & Wunden",
  "Atmung & Kreislauf",
  "Stoffwechsel",
  "Schmerz",
  "Schlaf & Ruhe",
  "Kognition & Kommunikation",
  "Psyche & Wohlbefinden",
  "Soziales & Beschäftigung",
] as const;

export const RESPONSIBLE_ROLES = [
  "Pflege",
  "Pflegefachperson",
  "Physiotherapie",
  "Ergotherapie",
  "Aktivierung",
  "Ärztlicher Dienst",
  "Team",
] as const;

export type PlanStatus = "draft" | "active" | "review" | "closed";
export type GoalStatus = "active" | "achieved" | "not_achieved" | "cancelled";
export type Outcome = "achieved" | "partially" | "not_achieved" | "ongoing";
export type InterventionStatus = "active" | "paused" | "completed" | "cancelled";

export const OUTCOME_LABELS: Record<Outcome, string> = {
  achieved: "Erreicht",
  partially: "Teilweise erreicht",
  not_achieved: "Nicht erreicht",
  ongoing: "Weiterhin in Arbeit",
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Aktiv",
  achieved: "Erreicht",
  not_achieved: "Nicht erreicht",
  cancelled: "Abgebrochen",
};

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  active: "Aktiv",
  paused: "Pausiert",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

export type Intervention = {
  id: string;
  goalId: string;
  title: string;
  instructions: string | null;
  frequency: string | null;
  responsibleRole: string | null;
  status: InterventionStatus;
};

export type GoalEvaluation = {
  id: string;
  outcome: Outcome;
  note: string;
  evaluatedAt: string;
  evaluatedBy: string | null;
  nextReviewOn: string | null;
};

export type CareGoal = {
  id: string;
  planId: string;
  category: string;
  problem: string | null;
  resources: string | null;
  statement: string;
  targetDate: string | null;
  status: GoalStatus;
  reviewDue: boolean;
  interventions: Intervention[];
  evaluations: GoalEvaluation[];
};

export type CarePlan = {
  id: string;
  residentId: string;
  status: PlanStatus;
  careLevel: string | null;
  focus: string | null;
  ownerId: string | null;
  ownerName: string | null;
  startsOn: string;
  reviewOn: string | null;
  reviewDue: boolean;
  updatedAt: string;
  goals: CareGoal[];
};

export type PlanningResident = {
  id: string;
  name: string;
  initials: string;
  room: string;
  careUnit: string;
  planId: string | null;
  planStatus: PlanStatus | null;
  reviewOn: string | null;
  reviewDue: boolean;
  activeGoals: number;
  goalsDue: number;
  ownerName: string | null;
};

export type GoalListItem = CareGoal & {
  residentId: string;
  residentName: string;
  room: string;
  ownerId: string | null;
  ownerName: string | null;
  lastEvaluation: GoalEvaluation | null;
};

export type EvaluationStats = {
  days: number;
  byCategory: Array<{
    category: string;
    activeGoals: number;
    evaluations: number;
    achieved: number;
    partially: number;
    notAchieved: number;
    ongoing: number;
  }>;
  totals: {
    activeGoals: number;
    evaluations: number;
    achieved: number;
    partially: number;
    notAchieved: number;
    ongoing: number;
  };
  due: Array<{
    kind: "plan" | "goal";
    id: string;
    residentId: string;
    residentName: string;
    title: string;
    date: string;
  }>;
};

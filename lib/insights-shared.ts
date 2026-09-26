// Leadership key figures (Kennzahlen), shared by the API and the client pages.

export type InsightTone = "stable" | "attention" | "critical" | "info";
export type InsightIcon =
  "note" | "alert" | "wounds" | "assess" | "plan" | "building" | "quality" | "tasks" | "calendar" | "team" | "learn";

export type Kpi = { value: string; label: string; note: string; tone: InsightTone };

export type Indicator = {
  id: string;
  title: string;
  detail: string;
  metric: string;
  status: string;
  tone: InsightTone;
  icon: InsightIcon;
  href: string;
};

export type CareInsights = {
  kpis: Kpi[];
  indicators: Indicator[];
  documentation: number | null;
  belowTarget: number;
};

export type LeadershipInsights = {
  kpis: Kpi[];
  scores: Array<{ label: string; value: string; note: string }>;
  progress: { value: number | null; label: string };
  units: Array<{ name: string; residents: number; beds: number }>;
  decisions: Indicator[];
};

export type StaffingCell = { required: number; assigned: number };

export type WorkforceInsights = {
  kpis: Kpi[];
  days: Array<{ day: string; label: string }>;
  matrix: Array<{ unit: string; cells: StaffingCell[] }>;
  coverage: number | null;
  absences: Array<{ id: string; name: string; period: string; status: string; tone: InsightTone }>;
  compliance: { valid: number; dueSoon: number; expired: number; missing: number; pending: number } | null;
};

export const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null);
export const formatPercent = (value: number | null) => (value === null ? "–" : `${value} %`);

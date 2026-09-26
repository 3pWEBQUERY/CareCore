"use client";

import {
  ArrowsLeftRight,
  Bell,
  Buildings,
  CalendarDots,
  CaretDown,
  CaretRight,
  ChartBar,
  ChatsCircle,
  Check,
  ClipboardText,
  FileText,
  Files,
  FirstAidKit,
  ForkKnife,
  GearSix,
  GraduationCap,
  Heartbeat,
  House,
  ListChecks,
  MagnifyingGlass,
  NotePencil,
  Pill,
  Plus,
  Pulse,
  ShieldCheck,
  SidebarSimple,
  SignOut,
  Sparkle,
  Stethoscope,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";

export type IconName =
  | "home"
  | "residents"
  | "tasks"
  | "handover"
  | "calendar"
  | "team"
  | "learn"
  | "docs"
  | "chart"
  | "quality"
  | "settings"
  | "search"
  | "bell"
  | "building"
  | "chevron"
  | "caretDown"
  | "alert"
  | "check"
  | "plus"
  | "pulse"
  | "close"
  | "note"
  | "vitals"
  | "report"
  | "plan"
  | "med"
  | "wounds"
  | "nutrition"
  | "assess"
  | "shift"
  | "ai"
  | "sidebar"
  | "logout";

export type WebMCPContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const icons = {
    home: House,
    residents: UsersThree,
    tasks: ListChecks,
    handover: ArrowsLeftRight,
    calendar: CalendarDots,
    team: ChatsCircle,
    learn: GraduationCap,
    docs: Files,
    chart: ChartBar,
    quality: ShieldCheck,
    settings: GearSix,
    search: MagnifyingGlass,
    bell: Bell,
    building: Buildings,
    chevron: CaretRight,
    caretDown: CaretDown,
    alert: Warning,
    check: Check,
    plus: Plus,
    pulse: Pulse,
    close: X,
    note: NotePencil,
    vitals: Heartbeat,
    report: FileText,
    plan: ClipboardText,
    med: Pill,
    wounds: FirstAidKit,
    nutrition: ForkKnife,
    assess: Stethoscope,
    shift: Heartbeat,
    ai: Sparkle,
    sidebar: SidebarSimple,
    logout: SignOut,
  };
  const Component = icons[name];
  return <Component className={className} aria-hidden="true" weight="regular" />;
}

export type DashboardChange = {
  id: string;
  initials: string;
  name: string;
  note: string;
  time: string;
  status: string;
  type: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  resident: string;
  time: string;
  dueAt: string | null;
  completed: boolean;
  overdue: boolean;
};

export type DashboardResident = { initials: string; name: string; room: string; risk: string; critical?: boolean };

export type DashboardNote = { id: string; title: string; body: string; pinned: boolean; updated_at: string };

export type ResidentNews = {
  id: string;
  first_name: string;
  last_name: string;
  room: string;
  care_unit_name: string | null;
  title: string | null;
  body: string | null;
  importance: string | null;
  occurred_at: string | null;
  flag_label: string | null;
  flag_severity: string | null;
};

export type DashboardWidgetId = "summary" | "critical" | "shift" | "tasks" | "residents";

export const dashboardWidgets: Array<{ id: DashboardWidgetId; label: string; description: string; wide?: boolean }> = [
  { id: "summary", label: "Schichtübersicht", description: "Kennzahlen für den aktuellen Dienst", wide: true },
  { id: "critical", label: "Wichtiger Hinweis", description: "Kritische Informationen", wide: true },
  { id: "tasks", label: "Als Nächstes", description: "Offene Aufgaben" },
  { id: "shift", label: "Meine Schicht", description: "Zeitlicher Dienstplan" },
  { id: "residents", label: "Meine Bewohner", description: "Zugewiesene Bewohner", wide: true },
];

export const defaultDashboardOrder = dashboardWidgets.map((widget) => widget.id);

export const dashboardLayoutStorageKey = "carecore.dashboard-layout.v1";

export function readStoredDashboardLayout() {
  if (typeof window === "undefined") return { order: defaultDashboardOrder, hidden: [] as DashboardWidgetId[] };
  try {
    const saved = window.localStorage.getItem(dashboardLayoutStorageKey);
    if (!saved) return { order: defaultDashboardOrder, hidden: [] as DashboardWidgetId[] };
    const layout = JSON.parse(saved) as { order?: DashboardWidgetId[]; hidden?: DashboardWidgetId[] };
    const allowed = new Set(defaultDashboardOrder);
    const order = (layout.order ?? []).filter((id): id is DashboardWidgetId => allowed.has(id));
    return {
      order: [...order, ...defaultDashboardOrder.filter((id) => !order.includes(id))],
      hidden: (layout.hidden ?? []).filter((id): id is DashboardWidgetId => allowed.has(id)),
    };
  } catch {
    return { order: defaultDashboardOrder, hidden: [] as DashboardWidgetId[] };
  }
}

export function Timeline({
  time,
  title,
  detail,
  state,
  variant = "",
  rail = false,
}: {
  time: string;
  title: string;
  detail: string;
  state: string;
  variant?: string;
  rail?: boolean;
}) {
  return (
    <div className={`timeline-row ${variant}`}>
      <time className="timeline-time">{time}</time>
      <span className="timeline-line">
        <i className="timeline-dot" />
        {rail && <i className="timeline-rail" />}
      </span>
      <span className="timeline-content">
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
      <span className={`timeline-state ${variant === "done" ? "done" : variant === "current" ? "now" : ""}`}>
        {state}
      </span>
    </div>
  );
}

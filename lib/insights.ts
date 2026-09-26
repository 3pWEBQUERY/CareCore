import type { ApiContext, Row } from "@/lib/api-context";
import { dueAssessments } from "@/lib/assessments";
import {
  formatPercent,
  percent,
  type CareInsights,
  type Indicator,
  type InsightTone,
  type LeadershipInsights,
  type WorkforceInsights,
} from "@/lib/insights-shared";
import { canManage as canManageTeam, learningData } from "@/lib/learning";
import { ABSENCE_KINDS, activeAssignments, openSlots } from "@/lib/schedule-shared";
import { addDays, orgToday, scheduleData, selectAbsences } from "@/lib/schedule";

// Key figures are computed live from the operational tables; nothing is stored.

const DOC_TARGET = 90;
const toneFor = (value: number | null, good: number, fair: number): InsightTone =>
  value === null ? "info" : value >= good ? "stable" : value >= fair ? "attention" : "critical";
const dayLabel = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;

async function careFigures(ctx: ApiContext) {
  const rows = (await ctx.sql`
    WITH org AS (SELECT timezone AS tz, date_trunc('month', NOW() AT TIME ZONE timezone) AS month_start
      FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}),
    active AS (SELECT id FROM carecore_residents WHERE organization_id = ${ctx.actor.organizationId} AND status = 'active')
    SELECT
      (SELECT COUNT(*) FROM active)::int AS active,
      (SELECT COUNT(DISTINCT d.resident_id) FROM carecore_documentation_entries d
        WHERE d.resident_id IN (SELECT id FROM active) AND d.occurred_at > NOW() - INTERVAL '24 hours')::int AS documented,
      (SELECT COUNT(*) FROM carecore_quality_events e, org WHERE e.organization_id = ${ctx.actor.organizationId}
        AND e.type = 'Sturz' AND e.occurred_at >= org.month_start AT TIME ZONE org.tz)::int AS falls,
      (SELECT COUNT(*) FROM carecore_quality_events e, org WHERE e.organization_id = ${ctx.actor.organizationId}
        AND e.type = 'Sturz' AND e.occurred_at >= (org.month_start - INTERVAL '1 month') AT TIME ZONE org.tz
        AND e.occurred_at < org.month_start AT TIME ZONE org.tz)::int AS falls_before,
      (SELECT COUNT(*) FROM carecore_wounds w WHERE w.resident_id IN (SELECT id FROM active)
        AND w.status IN ('active', 'healing'))::int AS wounds,
      (SELECT COUNT(*) FROM carecore_wounds w WHERE w.resident_id IN (SELECT id FROM active)
        AND w.status IN ('active', 'healing') AND w.origin = 'inhouse')::int AS wounds_inhouse,
      (SELECT COUNT(*) FROM carecore_wounds w WHERE w.resident_id IN (SELECT id FROM active)
        AND w.status IN ('active', 'healing') AND w.severity = 'critical')::int AS wounds_critical,
      (SELECT COUNT(*) FROM carecore_care_plans p WHERE p.resident_id IN (SELECT id FROM active)
        AND p.status IN ('draft', 'active', 'review'))::int AS plans,
      (SELECT COUNT(DISTINCT p.resident_id) FROM carecore_care_plans p, org WHERE p.resident_id IN (SELECT id FROM active)
        AND p.status IN ('draft', 'active', 'review')
        AND (p.status = 'review' OR p.review_on <= (NOW() AT TIME ZONE org.tz)::date OR EXISTS (
          SELECT 1 FROM carecore_care_goals g WHERE g.care_plan_id = p.id AND g.status = 'active'
            AND g.target_date <= (NOW() AT TIME ZONE org.tz)::date)))::int AS reviews_due`) as Row[];
  const r = rows[0];
  const due = await dueAssessments(ctx);
  const behind = new Set(
    due.filter((item) => item.kind === "overdue" || item.kind === "missing").map((i) => i.residentId),
  );
  return {
    active: Number(r.active),
    documented: Number(r.documented),
    falls: Number(r.falls),
    fallsBefore: Number(r.falls_before),
    wounds: Number(r.wounds),
    woundsInhouse: Number(r.wounds_inhouse),
    woundsCritical: Number(r.wounds_critical),
    plans: Number(r.plans),
    reviewsDue: Number(r.reviews_due),
    assessmentsOverdue: due.filter((item) => item.kind === "overdue").length,
    assessmentsMissing: due.filter((item) => item.kind === "missing").length,
    assessmentsBehind: behind.size,
  };
}

export async function careInsights(ctx: ApiContext): Promise<CareInsights> {
  const f = await careFigures(ctx);
  const documentation = percent(f.documented, f.active);
  const assessments = percent(f.active - f.assessmentsBehind, f.active);
  const planning = percent(f.plans, f.active);
  const fallTone: InsightTone = f.falls > f.fallsBefore ? "attention" : "stable";
  const indicators: Indicator[] = [
    {
      id: "documentation",
      title: "Dokumentationsquote (24 h)",
      detail: `${f.documented} von ${f.active} Bewohnern in den letzten 24 Stunden dokumentiert`,
      metric: formatPercent(documentation),
      status: documentation === null ? "Keine Daten" : documentation >= DOC_TARGET ? "Im Ziel" : "Unter Ziel",
      tone: toneFor(documentation, DOC_TARGET, 70),
      icon: "note",
      href: "/pflegedokumentation",
    },
    {
      id: "falls",
      title: "Sturzereignisse",
      detail: `${f.falls} im laufenden Monat · Vormonat ${f.fallsBefore}`,
      metric: String(f.falls),
      status: f.falls > f.fallsBefore ? "Gestiegen" : f.falls < f.fallsBefore ? "Verbessert" : "Unverändert",
      tone: fallTone,
      icon: "alert",
      href: "/leitung/qualitaet",
    },
    {
      id: "wounds",
      title: "Aktive Wunden",
      detail: `${f.woundsInhouse} im Haus entstanden · ${f.woundsCritical} kritisch`,
      metric: String(f.wounds),
      status: f.woundsCritical ? "Kritisch" : f.wounds ? "Beobachten" : "Keine",
      tone: f.woundsCritical ? "critical" : f.wounds ? "info" : "stable",
      icon: "wounds",
      href: "/wundmanagement",
    },
    {
      id: "assessments",
      title: "Einschätzungen aktuell",
      detail: `${f.assessmentsOverdue} überfällig · ${f.assessmentsMissing} Kerninstrumente fehlen`,
      metric: formatPercent(assessments),
      status: f.assessmentsBehind ? "Nachholen" : "Aktuell",
      tone: toneFor(assessments, 90, 70),
      icon: "assess",
      href: "/einschaetzungen/faelligkeiten",
    },
    {
      id: "planning",
      title: "Pflegeplanung",
      detail: `${f.plans} von ${f.active} Bewohnern mit Pflegeplan · ${f.reviewsDue} Evaluationen fällig`,
      metric: formatPercent(planning),
      status: f.reviewsDue ? "Evaluationen fällig" : planning === 100 ? "Vollständig" : "Lücken",
      tone: f.reviewsDue ? "attention" : toneFor(planning, 100, 80),
      icon: "plan",
      href: "/pflegeplanung/auswertung",
    },
  ];
  return {
    kpis: [
      {
        value: formatPercent(documentation),
        label: "Dokumentation",
        note: `letzte 24 h · Ziel ${DOC_TARGET} %`,
        tone: toneFor(documentation, DOC_TARGET, 70),
      },
      {
        value: String(f.falls),
        label: "Sturzereignisse",
        note: `${f.falls - f.fallsBefore >= 0 ? "+" : ""}${f.falls - f.fallsBefore} zum Vormonat`,
        tone: fallTone,
      },
      {
        value: String(f.wounds),
        label: "aktive Wunden",
        note: `${f.woundsInhouse} im Haus entstanden`,
        tone: f.woundsCritical ? "critical" : "info",
      },
      {
        value: formatPercent(assessments),
        label: "Einschätzungen aktuell",
        note: `${f.assessmentsBehind} Bewohner mit Rückstand`,
        tone: toneFor(assessments, 90, 70),
      },
    ],
    indicators,
    documentation,
    belowTarget: indicators.filter((item) => item.tone === "attention" || item.tone === "critical").length,
  };
}

// ------------------------------------------------------------- workforce

async function staffing(ctx: ApiContext) {
  const today = await orgToday(ctx);
  const to = addDays(today, 6);
  const schedule = await scheduleData(ctx, new URLSearchParams({ scope: "team", from: today, to }));
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const units = [...schedule.careUnits.map((unit) => unit.name)];
  if (schedule.shifts.some((shift) => !shift.careUnit)) units.push("Ohne Wohnbereich");
  const matrix = units.map((unit) => ({
    unit,
    cells: days.map((day) => {
      const shifts = schedule.shifts.filter((s) => s.day === day && (s.careUnit ?? "Ohne Wohnbereich") === unit);
      return {
        required: shifts.reduce((sum, s) => sum + s.requiredStaff, 0),
        assigned: shifts.reduce((sum, s) => sum + Math.min(activeAssignments(s).length, s.requiredStaff), 0),
      };
    }),
  }));
  const required = schedule.shifts.reduce((sum, s) => sum + s.requiredStaff, 0);
  const covered = schedule.shifts.reduce((sum, s) => sum + Math.min(activeAssignments(s).length, s.requiredStaff), 0);
  return {
    today,
    days,
    matrix,
    coverage: percent(covered, required),
    openSlots: schedule.shifts.reduce((sum, s) => sum + openSlots(s), 0),
    pendingRequests: schedule.requests.filter((a) => a.status === "requested").length,
  };
}

async function compliance(ctx: ApiContext) {
  if (!canManageTeam(ctx)) return null;
  const learning = await learningData(ctx, new URLSearchParams({ userId: "all" }));
  const count = (state: string) => learning.compliance.filter((row) => row.state === state).length;
  return {
    valid: count("valid"),
    dueSoon: count("due_soon"),
    expired: count("expired"),
    missing: count("missing"),
    pending: count("pending"),
  };
}

const complianceShare = (c: NonNullable<Awaited<ReturnType<typeof compliance>>>) =>
  percent(c.valid + c.dueSoon, c.valid + c.dueSoon + c.expired + c.missing + c.pending);

export async function workforceInsights(ctx: ApiContext): Promise<WorkforceInsights> {
  const [plan, training] = await Promise.all([staffing(ctx), compliance(ctx)]);
  const absences = (await selectAbsences(ctx, { from: plan.today, to: addDays(plan.today, 13) }))
    .filter((a) => a.status === "requested" || a.status === "approved")
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const trainingShare = training ? complianceShare(training) : null;
  return {
    kpis: [
      {
        value: formatPercent(plan.coverage),
        label: "Besetzung",
        note: "nächste 7 Tage",
        tone: toneFor(plan.coverage, 95, 85),
      },
      {
        value: String(plan.pendingRequests),
        label: "Abwesenheitsanträge",
        note: plan.pendingRequests ? "noch zu entscheiden" : "alle entschieden",
        tone: plan.pendingRequests ? "attention" : "stable",
      },
      {
        value: formatPercent(trainingShare),
        label: "Pflichtschulungen gültig",
        note: training ? `${training.expired + training.missing} fehlend oder abgelaufen` : "nur für die Leitung",
        tone: toneFor(trainingShare, 95, 80),
      },
      {
        value: String(plan.openSlots),
        label: "offene Dienste",
        note: "zu besetzen in 7 Tagen",
        tone: plan.openSlots ? "critical" : "stable",
      },
    ],
    days: plan.days.map((day) => ({
      day,
      label: `${new Date(`${day}T12:00:00Z`).toLocaleDateString("de-CH", { weekday: "short", timeZone: "UTC" })} ${dayLabel(day)}`,
    })),
    matrix: plan.matrix,
    coverage: plan.coverage,
    absences: absences.map((a) => ({
      id: a.id,
      name: a.name,
      period: `${ABSENCE_KINDS[a.kind] ?? a.kind} · ${a.startsOn === a.endsOn ? dayLabel(a.startsOn) : `${dayLabel(a.startsOn)}–${dayLabel(a.endsOn)}`}`,
      status:
        a.status === "requested" ? "Antrag offen" : a.substituteName ? `Vertretung ${a.substituteName}` : "Genehmigt",
      tone: a.status === "requested" ? "attention" : a.substituteName ? "stable" : "info",
    })),
    compliance: training,
  };
}

// ------------------------------------------------------------ leadership

export async function leadershipInsights(ctx: ApiContext): Promise<LeadershipInsights> {
  const [rows, units, care, plan, training] = await Promise.all([
    ctx.sql`
      SELECT
        (SELECT COUNT(*) FROM carecore_quality_events WHERE organization_id = ${ctx.actor.organizationId}
          AND status IN ('open', 'investigating'))::int AS open_events,
        (SELECT COUNT(*) FROM carecore_quality_events WHERE organization_id = ${ctx.actor.organizationId}
          AND status IN ('open', 'investigating') AND severity = 'critical')::int AS critical_events,
        (SELECT COUNT(*) FROM carecore_quality_actions a, carecore_organizations o WHERE o.id = a.organization_id
          AND a.organization_id = ${ctx.actor.organizationId} AND a.status IN ('open', 'planned')
          AND a.due_on < (NOW() AT TIME ZONE o.timezone)::date)::int AS overdue_actions,
        (SELECT COUNT(*) FROM carecore_tasks WHERE organization_id = ${ctx.actor.organizationId}
          AND status IN ('open', 'in_progress') AND due_at < NOW())::int AS overdue_tasks` as Promise<Row[]>,
    ctx.sql`
      SELECT cu.name,
        COALESCE((SELECT SUM(ro.beds) FROM carecore_rooms ro WHERE ro.care_unit_id = cu.id AND ro.active), 0)::int AS beds,
        COALESCE(cu.capacity, 0)::int AS capacity,
        (SELECT COUNT(*) FROM carecore_resident_stays s JOIN carecore_residents r ON r.id = s.resident_id
          WHERE s.care_unit_id = cu.id AND s.ended_at IS NULL AND r.status IN ('active', 'transferred'))::int AS residents
      FROM carecore_care_units cu JOIN carecore_sites si ON si.id = cu.site_id
      WHERE si.organization_id = ${ctx.actor.organizationId} AND cu.active
      ORDER BY cu.name` as Promise<Row[]>,
    careFigures(ctx),
    staffing(ctx),
    compliance(ctx),
  ]);
  const r = rows[0];
  const unitRows = units.map((row) => ({
    name: String(row.name),
    residents: Number(row.residents),
    // Capacity is the planned number of places; rooms only count once they are set up.
    beds: Math.max(Number(row.capacity), Number(row.beds)),
  }));
  const beds = unitRows.reduce((sum, unit) => sum + unit.beds, 0);
  const occupied = unitRows.reduce((sum, unit) => sum + unit.residents, 0);
  const occupancy = percent(occupied, beds);
  const planning = percent(care.plans, care.active);
  const trainingShare = training ? complianceShare(training) : null;
  const withoutPlan = care.active - care.plans;
  const decisions: Indicator[] = [
    {
      id: "critical-events",
      title: "Kritische Ereignisse",
      detail: "Offene Meldungen mit hohem Schweregrad",
      metric: String(r.critical_events),
      status: "Sofort prüfen",
      tone: "critical" as InsightTone,
      icon: "alert" as const,
      href: "/leitung/qualitaet",
      count: Number(r.critical_events),
    },
    {
      id: "open-slots",
      title: "Offene Dienste",
      detail: "Unbesetzte Dienste in den nächsten 7 Tagen",
      metric: String(plan.openSlots),
      status: "Besetzen",
      tone: "attention" as InsightTone,
      icon: "calendar" as const,
      href: "/betrieb/dienstplanung/team",
      count: plan.openSlots,
    },
    {
      id: "overdue-actions",
      title: "Überfällige Qualitätsmassnahmen",
      detail: "Termin überschritten, noch nicht abgeschlossen",
      metric: String(r.overdue_actions),
      status: "Nachfassen",
      tone: "attention" as InsightTone,
      icon: "quality" as const,
      href: "/leitung/qualitaet/massnahmen",
      count: Number(r.overdue_actions),
    },
    {
      id: "absence-requests",
      title: "Abwesenheitsanträge",
      detail: "Warten auf Entscheid der Leitung",
      metric: String(plan.pendingRequests),
      status: "Entscheiden",
      tone: "info" as InsightTone,
      icon: "team" as const,
      href: "/betrieb/dienstplanung/team",
      count: plan.pendingRequests,
    },
    {
      id: "overdue-tasks",
      title: "Überfällige Aufgaben",
      detail: "Offene Aufgaben mit überschrittener Frist",
      metric: String(r.overdue_tasks),
      status: "Prüfen",
      tone: "attention" as InsightTone,
      icon: "tasks" as const,
      href: "/betrieb/aufgaben/team",
      count: Number(r.overdue_tasks),
    },
    {
      id: "without-plan",
      title: "Bewohner ohne Pflegeplan",
      detail: care.reviewsDue
        ? `Zusätzlich ${care.reviewsDue} Pflegepläne zur Evaluation fällig`
        : "Pflegeakte mit Zielen und Massnahmen anlegen",
      metric: String(withoutPlan),
      status: "Planen",
      tone: "info" as InsightTone,
      icon: "plan" as const,
      href: "/bewohner/pflegeakte",
      count: withoutPlan,
    },
  ].flatMap(({ count, ...item }) => (count > 0 ? [item] : []));
  const openHints = decisions.length;
  return {
    kpis: [
      {
        value: formatPercent(occupancy),
        label: "Belegung",
        note: `${occupied} von ${beds} Plätzen`,
        tone: toneFor(occupancy, 90, 75),
      },
      {
        value: String(Number(r.open_events)),
        label: "Ereignisse offen",
        note: `${r.critical_events} kritisch`,
        tone: Number(r.critical_events) ? "critical" : Number(r.open_events) ? "attention" : "stable",
      },
      {
        value: formatPercent(planning),
        label: "Pflegeplanung",
        note: `${care.reviewsDue} Evaluationen fällig`,
        tone: toneFor(planning, 100, 80),
      },
      {
        value: String(openHints),
        label: "Themen für die Leitung",
        note: openHints ? "siehe Entscheidungen" : "alles im Plan",
        tone: openHints ? "attention" : "stable",
      },
    ],
    scores: [
      { label: "Belegung", value: formatPercent(occupancy), note: `${occupied} von ${beds} Plätzen` },
      {
        label: "Pflegeplanung",
        value: formatPercent(planning),
        note: `${care.plans} von ${care.active} Bewohnern`,
      },
      { label: "Dienstbesetzung", value: formatPercent(plan.coverage), note: "nächste 7 Tage" },
    ],
    progress:
      trainingShare === null
        ? { value: plan.coverage, label: `Dienstbesetzung ${formatPercent(plan.coverage)}` }
        : { value: trainingShare, label: `Pflichtschulungen gültig ${formatPercent(trainingShare)}` },
    units: unitRows,
    decisions,
  };
}

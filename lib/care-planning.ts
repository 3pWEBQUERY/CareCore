import { randomUUID } from "node:crypto";
import {
  ApiError,
  assertResident,
  assertUuid,
  iso,
  text,
  writeAudit,
  type ApiContext,
  type Row,
} from "@/lib/api-context";
import { initials } from "@/lib/medication-shared";
import {
  GOAL_CATEGORIES,
  type CareGoal,
  type CarePlan,
  type EvaluationStats,
  type GoalEvaluation,
  type GoalListItem,
  type GoalStatus,
  type Intervention,
  type InterventionStatus,
  type Outcome,
  type PlanStatus,
  type PlanningResident,
} from "@/lib/care-planning-shared";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OPEN = ["draft", "active", "review"];
const date = (value: unknown) => (typeof value === "string" && DATE.test(value) ? value : null);
const day = (value: unknown) => (value ? (iso(value) ?? "").slice(0, 10) || null : null);

async function today(ctx: ApiContext) {
  const rows =
    await ctx.sql`SELECT to_char(NOW() AT TIME ZONE timezone, 'YYYY-MM-DD') AS d FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}`;
  return String(rows[0].d);
}

async function assertStaff(ctx: ApiContext, userId: unknown) {
  if (!userId) return null;
  const id = assertUuid(userId, "Bezugsperson");
  const rows =
    await ctx.sql`SELECT user_id FROM carecore_user_profiles WHERE user_id = ${id} AND organization_id = ${ctx.actor.organizationId}`;
  if (!rows[0]) throw new ApiError("Die Bezugsperson gehört nicht zu dieser Organisation.");
  return id;
}

// ---------------------------------------------------------------- overview

export async function planningOverview(ctx: ApiContext) {
  const [residents, staff] = (await Promise.all([
    ctx.sql`
      SELECT r.id, r.first_name, r.last_name, COALESCE(ro.name, '') AS room, COALESCE(cu.name, '') AS care_unit,
        p.id AS plan_id, p.status AS plan_status, to_char(p.review_on, 'YYYY-MM-DD') AS review_on,
        (p.review_on IS NOT NULL AND p.review_on <= (NOW() AT TIME ZONE org.tz)::date) AS review_due,
        u.display_name AS owner_name,
        (SELECT COUNT(*)::int FROM carecore_care_goals g WHERE g.care_plan_id = p.id AND g.status = 'active') AS active_goals,
        (SELECT COUNT(*)::int FROM carecore_care_goals g WHERE g.care_plan_id = p.id AND g.status = 'active'
          AND g.target_date <= (NOW() AT TIME ZONE org.tz)::date) AS goals_due
      FROM carecore_residents r
      CROSS JOIN (SELECT timezone AS tz FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}) org
      LEFT JOIN LATERAL (SELECT care_unit_id, room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) stay ON TRUE
      LEFT JOIN carecore_care_units cu ON cu.id = stay.care_unit_id
      LEFT JOIN carecore_rooms ro ON ro.id = stay.room_id
      LEFT JOIN carecore_care_plans p ON p.resident_id = r.id AND p.status IN ('draft', 'active', 'review')
      LEFT JOIN carecore_users u ON u.id = p.owner_user_id
      WHERE r.organization_id = ${ctx.actor.organizationId} AND r.status = 'active'
      ORDER BY r.last_name, r.first_name`,
    ctx.sql`
      SELECT u.id, u.display_name AS name FROM carecore_users u JOIN carecore_user_profiles p ON p.user_id = u.id
      WHERE p.organization_id = ${ctx.actor.organizationId} AND u.active ORDER BY u.display_name`,
  ])) as [Row[], Row[]];
  return {
    residents: residents.map((row): PlanningResident => {
      const name = `${row.first_name} ${row.last_name}`;
      return {
        id: String(row.id),
        name,
        initials: initials(name),
        room: String(row.room),
        careUnit: String(row.care_unit),
        planId: (row.plan_id as string | null) ?? null,
        planStatus: (row.plan_status as PlanStatus | null) ?? null,
        reviewOn: (row.review_on as string | null) ?? null,
        reviewDue: Boolean(row.review_due),
        activeGoals: Number(row.active_goals ?? 0),
        goalsDue: Number(row.goals_due ?? 0),
        ownerName: (row.owner_name as string | null) ?? null,
      };
    }),
    staff: staff.map((row) => ({ id: String(row.id), name: String(row.name) })),
  };
}

// ------------------------------------------------------------ plan detail

function mapEvaluation(row: Row): GoalEvaluation {
  return {
    id: String(row.id),
    outcome: row.outcome as Outcome,
    note: String(row.note),
    evaluatedAt: iso(row.evaluated_at) ?? "",
    evaluatedBy: (row.evaluated_by as string | null) ?? null,
    nextReviewOn: day(row.next_review_on),
  };
}

function mapIntervention(row: Row): Intervention {
  return {
    id: String(row.id),
    goalId: String(row.care_goal_id),
    title: String(row.title),
    instructions: (row.instructions as string | null) ?? null,
    frequency: (row.frequency as string | null) ?? null,
    responsibleRole: (row.responsible_role as string | null) ?? null,
    status: row.status as InterventionStatus,
  };
}

async function goalsOf(ctx: ApiContext, planIds: string[]) {
  if (!planIds.length) return new Map<string, CareGoal[]>();
  const [goals, interventions, evaluations] = (await Promise.all([
    ctx.sql`
      SELECT g.*, to_char(g.target_date, 'YYYY-MM-DD') AS target_day,
        (g.status = 'active' AND g.target_date <= (NOW() AT TIME ZONE org.tz)::date) AS review_due
      FROM carecore_care_goals g
      CROSS JOIN (SELECT timezone AS tz FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}) org
      WHERE g.care_plan_id = ANY(${planIds}::uuid[]) AND g.status <> 'cancelled'
      ORDER BY (g.status <> 'active'), g.target_date NULLS LAST, g.created_at`,
    ctx.sql`
      SELECT i.* FROM carecore_interventions i JOIN carecore_care_goals g ON g.id = i.care_goal_id
      WHERE g.care_plan_id = ANY(${planIds}::uuid[]) AND i.status <> 'cancelled'
      ORDER BY (i.status <> 'active'), i.created_at`,
    ctx.sql`
      SELECT e.*, u.display_name AS evaluated_by FROM carecore_care_goal_evaluations e
      JOIN carecore_care_goals g ON g.id = e.care_goal_id
      LEFT JOIN carecore_users u ON u.id = e.evaluated_by
      WHERE g.care_plan_id = ANY(${planIds}::uuid[])
      ORDER BY e.evaluated_at DESC`,
  ])) as [Row[], Row[], Row[]];
  const byPlan = new Map<string, CareGoal[]>();
  for (const row of goals) {
    const goal: CareGoal = {
      id: String(row.id),
      planId: String(row.care_plan_id),
      category: String(row.category),
      problem: (row.problem as string | null) ?? null,
      resources: (row.resources as string | null) ?? null,
      statement: String(row.statement),
      targetDate: (row.target_day as string | null) ?? null,
      status: row.status as GoalStatus,
      reviewDue: Boolean(row.review_due),
      interventions: interventions.filter((i) => i.care_goal_id === row.id).map(mapIntervention),
      evaluations: evaluations.filter((e) => e.care_goal_id === row.id).map(mapEvaluation),
    };
    byPlan.set(goal.planId, [...(byPlan.get(goal.planId) ?? []), goal]);
  }
  return byPlan;
}

export async function residentPlan(
  ctx: ApiContext,
  residentIdInput: unknown,
): Promise<{ plan: CarePlan | null; closedPlans: number }> {
  const residentId = await assertResident(ctx, residentIdInput);
  const rows = (await ctx.sql`
    SELECT p.*, u.display_name AS owner_name, to_char(p.starts_on, 'YYYY-MM-DD') AS starts_day, to_char(p.review_on, 'YYYY-MM-DD') AS review_day,
      (p.review_on IS NOT NULL AND p.review_on <= (NOW() AT TIME ZONE org.tz)::date) AS review_due,
      (SELECT COUNT(*)::int FROM carecore_care_plans c WHERE c.resident_id = p.resident_id AND c.status IN ('closed', 'archived')) AS closed_plans
    FROM carecore_care_plans p
    CROSS JOIN (SELECT timezone AS tz FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}) org
    LEFT JOIN carecore_users u ON u.id = p.owner_user_id
    WHERE p.resident_id = ${residentId} AND p.status IN ('draft', 'active', 'review')
    LIMIT 1`) as Row[];
  const row = rows[0];
  if (!row) {
    const closed =
      await ctx.sql`SELECT COUNT(*)::int AS n FROM carecore_care_plans WHERE resident_id = ${residentId} AND status IN ('closed', 'archived')`;
    return { plan: null, closedPlans: Number(closed[0].n) };
  }
  const goals = await goalsOf(ctx, [String(row.id)]);
  return {
    closedPlans: Number(row.closed_plans),
    plan: {
      id: String(row.id),
      residentId,
      status: row.status as PlanStatus,
      careLevel: (row.care_level as string | null) ?? null,
      focus: (row.focus as string | null) ?? null,
      ownerId: (row.owner_user_id as string | null) ?? null,
      ownerName: (row.owner_name as string | null) ?? null,
      startsOn: String(row.starts_day),
      reviewOn: (row.review_day as string | null) ?? null,
      reviewDue: Boolean(row.review_due),
      updatedAt: iso(row.updated_at) ?? "",
      goals: goals.get(String(row.id)) ?? [],
    },
  };
}

// ------------------------------------------------------------------ plans

function parsePlan(body: Record<string, unknown>) {
  const plan = {
    careLevel: text(body.careLevel, 80) || null,
    focus: text(body.focus, 4000),
    startsOn: date(body.startsOn),
    reviewOn: date(body.reviewOn),
  };
  if (!plan.focus) throw new ApiError("Bitte den Pflegefokus beschreiben.");
  if (!plan.startsOn) throw new ApiError("Bitte das Startdatum angeben.");
  if (!plan.reviewOn) throw new ApiError("Bitte ein Überprüfungsdatum festlegen.");
  if (plan.reviewOn < plan.startsOn) throw new ApiError("Die Überprüfung liegt vor dem Startdatum.");
  return plan;
}

async function loadPlan(ctx: ApiContext, planIdInput: unknown) {
  const id = assertUuid(planIdInput, "Pflegeplan");
  const rows = (await ctx.sql`
    SELECT p.* FROM carecore_care_plans p JOIN carecore_residents r ON r.id = p.resident_id AND r.organization_id = ${ctx.actor.organizationId}
    WHERE p.id = ${id}`) as Row[];
  if (!rows[0]) throw new ApiError("Pflegeplan nicht gefunden.", 404);
  return rows[0];
}

function assertOpen(plan: Row) {
  if (!OPEN.includes(String(plan.status))) throw new ApiError("Der Pflegeplan ist abgeschlossen.", 409);
}

export async function createPlan(ctx: ApiContext, body: Record<string, unknown>) {
  const residentId = await assertResident(ctx, body.residentId);
  const plan = parsePlan(body);
  const ownerId = await assertStaff(ctx, body.ownerId);
  const id = randomUUID();
  try {
    await ctx.sql`
      INSERT INTO carecore_care_plans (id, resident_id, owner_user_id, status, care_level, focus, starts_on, review_on)
      VALUES (${id}, ${residentId}, ${ownerId}, 'active', ${plan.careLevel}, ${plan.focus}, ${plan.startsOn}, ${plan.reviewOn})`;
  } catch (error) {
    if (String(error).includes("carecore_care_plans_one_open_idx"))
      throw new ApiError("Für diesen Bewohner besteht bereits ein offener Pflegeplan.", 409);
    throw error;
  }
  await writeAudit(ctx, "care_plan", id, "created", null, { residentId, ownerId, ...plan });
  return id;
}

export async function updatePlan(ctx: ApiContext, planId: unknown, body: Record<string, unknown>) {
  const before = await loadPlan(ctx, planId);
  if ("status" in body) {
    const status = body.status;
    if (status !== "active" && status !== "review" && status !== "closed") throw new ApiError("Ungültiger Status.");
    const reason = text(body.reason, 1000);
    if (status === "closed" && !reason) throw new ApiError("Bitte den Grund für den Abschluss angeben.");
    assertOpen(before);
    await ctx.sql`
      UPDATE carecore_care_plans SET status = ${status}, closed_at = CASE WHEN ${status} = 'closed' THEN NOW() END,
        closed_reason = CASE WHEN ${status} = 'closed' THEN ${reason} END, updated_at = NOW()
      WHERE id = ${before.id}`;
    await writeAudit(
      ctx,
      "care_plan",
      String(before.id),
      `status_${status}`,
      { status: before.status },
      { status, reason: reason || null },
    );
    return;
  }
  assertOpen(before);
  const plan = parsePlan(body);
  const ownerId = await assertStaff(ctx, body.ownerId);
  await ctx.sql`
    UPDATE carecore_care_plans SET owner_user_id = ${ownerId}, care_level = ${plan.careLevel}, focus = ${plan.focus},
      starts_on = ${plan.startsOn}, review_on = ${plan.reviewOn}, updated_at = NOW()
    WHERE id = ${before.id}`;
  await writeAudit(ctx, "care_plan", String(before.id), "updated", before, { ownerId, ...plan });
}

// ------------------------------------------------------------------ goals

function parseGoal(body: Record<string, unknown>) {
  const goal = {
    category:
      typeof body.category === "string" && (GOAL_CATEGORIES as readonly string[]).includes(body.category)
        ? body.category
        : "",
    problem: text(body.problem, 4000) || null,
    resources: text(body.resources, 4000) || null,
    statement: text(body.statement, 2000),
    targetDate: date(body.targetDate),
  };
  if (!goal.category) throw new ApiError("Bitte den Pflegebereich wählen.");
  if (!goal.problem) throw new ApiError("Bitte das Pflegeproblem beschreiben.");
  if (!goal.statement) throw new ApiError("Bitte das Ziel überprüfbar formulieren.");
  if (!goal.targetDate) throw new ApiError("Bitte ein Überprüfungsdatum für das Ziel angeben.");
  return goal;
}

async function loadGoal(ctx: ApiContext, goalIdInput: unknown) {
  const id = assertUuid(goalIdInput, "Pflegeziel");
  const rows = (await ctx.sql`
    SELECT g.*, p.status AS plan_status FROM carecore_care_goals g
    JOIN carecore_care_plans p ON p.id = g.care_plan_id
    JOIN carecore_residents r ON r.id = p.resident_id AND r.organization_id = ${ctx.actor.organizationId}
    WHERE g.id = ${id}`) as Row[];
  if (!rows[0]) throw new ApiError("Pflegeziel nicht gefunden.", 404);
  if (!OPEN.includes(String(rows[0].plan_status))) throw new ApiError("Der Pflegeplan ist abgeschlossen.", 409);
  return rows[0];
}

export async function addGoal(ctx: ApiContext, planId: unknown, body: Record<string, unknown>) {
  const plan = await loadPlan(ctx, planId);
  assertOpen(plan);
  const goal = parseGoal(body);
  const id = randomUUID();
  await ctx.sql`
    INSERT INTO carecore_care_goals (id, care_plan_id, category, problem, resources, statement, target_date, status, created_by)
    VALUES (${id}, ${plan.id}, ${goal.category}, ${goal.problem}, ${goal.resources}, ${goal.statement}, ${goal.targetDate}, 'active', ${ctx.actor.id})`;
  await ctx.sql`UPDATE carecore_care_plans SET updated_at = NOW() WHERE id = ${plan.id}`;
  await writeAudit(ctx, "care_goal", id, "created", null, { planId: plan.id, ...goal });
  return id;
}

export async function updateGoal(ctx: ApiContext, goalId: unknown, body: Record<string, unknown>) {
  const before = await loadGoal(ctx, goalId);
  if (body.status === "cancelled") {
    const reason = text(body.reason, 1000);
    if (!reason) throw new ApiError("Bitte den Grund für den Abbruch angeben.");
    await ctx.sql`UPDATE carecore_care_goals SET status = 'cancelled', evaluation_note = ${reason}, updated_at = NOW() WHERE id = ${before.id}`;
    await writeAudit(ctx, "care_goal", String(before.id), "cancelled", { status: before.status }, { reason });
    return;
  }
  if (before.status !== "active") throw new ApiError("Nur aktive Ziele können bearbeitet werden.", 409);
  const goal = parseGoal(body);
  await ctx.sql`
    UPDATE carecore_care_goals SET category = ${goal.category}, problem = ${goal.problem}, resources = ${goal.resources},
      statement = ${goal.statement}, target_date = ${goal.targetDate}, updated_at = NOW()
    WHERE id = ${before.id}`;
  await writeAudit(ctx, "care_goal", String(before.id), "updated", before, goal);
}

// Documents an evaluation; "achieved" closes the goal, otherwise a new review date keeps it running.
export async function evaluateGoal(ctx: ApiContext, goalId: unknown, body: Record<string, unknown>) {
  const goal = await loadGoal(ctx, goalId);
  if (goal.status !== "active") throw new ApiError("Nur aktive Ziele können evaluiert werden.", 409);
  const outcome = body.outcome as Outcome;
  if (!["achieved", "partially", "not_achieved", "ongoing"].includes(outcome))
    throw new ApiError("Bitte das Ergebnis wählen.");
  const note = text(body.note, 4000);
  if (!note) throw new ApiError("Bitte die Evaluation begründen (Beobachtungen, Veränderungen, Anpassungen).");
  const closeGoal = outcome === "achieved" || (outcome === "not_achieved" && body.closeGoal === true);
  const nextReviewOn = date(body.nextReviewOn);
  if (!closeGoal && !nextReviewOn) throw new ApiError("Bitte das nächste Überprüfungsdatum festlegen.");
  if (nextReviewOn && nextReviewOn < (await today(ctx)))
    throw new ApiError("Das nächste Überprüfungsdatum liegt in der Vergangenheit.");
  const status: GoalStatus = closeGoal ? (outcome === "achieved" ? "achieved" : "not_achieved") : "active";
  const id = randomUUID();
  await ctx.sql.transaction([
    ctx.sql`
      INSERT INTO carecore_care_goal_evaluations (id, care_goal_id, evaluated_by, outcome, note, next_review_on)
      VALUES (${id}, ${goal.id}, ${ctx.actor.id}, ${outcome}, ${note}, ${closeGoal ? null : nextReviewOn})`,
    ctx.sql`
      UPDATE carecore_care_goals SET status = ${status}, evaluation_note = ${note}, evaluated_at = NOW(),
        target_date = COALESCE(${closeGoal ? null : nextReviewOn}::date, target_date), updated_at = NOW()
      WHERE id = ${goal.id}`,
  ]);
  await writeAudit(
    ctx,
    "care_goal",
    String(goal.id),
    "evaluated",
    { status: goal.status },
    { outcome, note, nextReviewOn, status },
  );
}

// ---------------------------------------------------------- interventions

function parseIntervention(body: Record<string, unknown>) {
  const intervention = {
    title: text(body.title, 220),
    instructions: text(body.instructions, 4000) || null,
    frequency: text(body.frequency, 100) || null,
    responsibleRole: text(body.responsibleRole, 100) || null,
  };
  if (!intervention.title) throw new ApiError("Bitte die Massnahme benennen.");
  if (!intervention.frequency) throw new ApiError("Bitte die Häufigkeit angeben, z. B. „2× täglich“.");
  return intervention;
}

export async function addIntervention(ctx: ApiContext, goalId: unknown, body: Record<string, unknown>) {
  const goal = await loadGoal(ctx, goalId);
  if (goal.status !== "active") throw new ApiError("Massnahmen können nur zu aktiven Zielen ergänzt werden.", 409);
  const intervention = parseIntervention(body);
  const id = randomUUID();
  await ctx.sql`
    INSERT INTO carecore_interventions (id, care_goal_id, title, instructions, frequency, responsible_role, status, created_by)
    VALUES (${id}, ${goal.id}, ${intervention.title}, ${intervention.instructions}, ${intervention.frequency}, ${intervention.responsibleRole}, 'active', ${ctx.actor.id})`;
  await writeAudit(ctx, "intervention", id, "created", null, { goalId: goal.id, ...intervention });
  return id;
}

export async function updateIntervention(ctx: ApiContext, interventionIdInput: unknown, body: Record<string, unknown>) {
  const id = assertUuid(interventionIdInput, "Massnahme");
  const rows = (await ctx.sql`
    SELECT i.*, p.status AS plan_status FROM carecore_interventions i
    JOIN carecore_care_goals g ON g.id = i.care_goal_id
    JOIN carecore_care_plans p ON p.id = g.care_plan_id
    JOIN carecore_residents r ON r.id = p.resident_id AND r.organization_id = ${ctx.actor.organizationId}
    WHERE i.id = ${id}`) as Row[];
  const before = rows[0];
  if (!before) throw new ApiError("Massnahme nicht gefunden.", 404);
  if (!OPEN.includes(String(before.plan_status))) throw new ApiError("Der Pflegeplan ist abgeschlossen.", 409);
  if ("status" in body) {
    const status = body.status as InterventionStatus;
    if (!["active", "paused", "completed", "cancelled"].includes(status)) throw new ApiError("Ungültiger Status.");
    await ctx.sql`UPDATE carecore_interventions SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
    await writeAudit(ctx, "intervention", id, `status_${status}`, { status: before.status }, { status });
    return;
  }
  const intervention = parseIntervention(body);
  await ctx.sql`
    UPDATE carecore_interventions SET title = ${intervention.title}, instructions = ${intervention.instructions},
      frequency = ${intervention.frequency}, responsible_role = ${intervention.responsibleRole}, updated_at = NOW()
    WHERE id = ${id}`;
  await writeAudit(ctx, "intervention", id, "updated", before, intervention);
}

// ------------------------------------------------------------- house views

export async function listGoals(ctx: ApiContext): Promise<GoalListItem[]> {
  const plans = (await ctx.sql`
    SELECT p.id, p.owner_user_id, u.display_name AS owner_name, r.id AS resident_id, r.first_name || ' ' || r.last_name AS resident_name,
      COALESCE(ro.name, '') AS room
    FROM carecore_care_plans p
    JOIN carecore_residents r ON r.id = p.resident_id AND r.organization_id = ${ctx.actor.organizationId} AND r.status = 'active'
    LEFT JOIN LATERAL (SELECT room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) stay ON TRUE
    LEFT JOIN carecore_rooms ro ON ro.id = stay.room_id
    LEFT JOIN carecore_users u ON u.id = p.owner_user_id
    WHERE p.status IN ('draft', 'active', 'review')`) as Row[];
  const goals = await goalsOf(
    ctx,
    plans.map((p) => String(p.id)),
  );
  return plans
    .flatMap((plan) =>
      (goals.get(String(plan.id)) ?? [])
        .filter((goal) => goal.status === "active")
        .map((goal) => ({
          ...goal,
          residentId: String(plan.resident_id),
          residentName: String(plan.resident_name),
          room: String(plan.room),
          ownerId: (plan.owner_user_id as string | null) ?? null,
          ownerName: (plan.owner_name as string | null) ?? null,
          lastEvaluation: goal.evaluations[0] ?? null,
        })),
    )
    .sort((a, b) => (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999"));
}

export async function evaluationStats(ctx: ApiContext, daysInput: unknown): Promise<EvaluationStats> {
  const days = [30, 90, 365].includes(Number(daysInput)) ? Number(daysInput) : 90;
  const [categories, due] = (await Promise.all([
    ctx.sql`
      SELECT g.category,
        COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'active')::int AS active_goals,
        COUNT(e.id)::int AS evaluations,
        COUNT(e.id) FILTER (WHERE e.outcome = 'achieved')::int AS achieved,
        COUNT(e.id) FILTER (WHERE e.outcome = 'partially')::int AS partially,
        COUNT(e.id) FILTER (WHERE e.outcome = 'not_achieved')::int AS not_achieved,
        COUNT(e.id) FILTER (WHERE e.outcome = 'ongoing')::int AS ongoing
      FROM carecore_care_goals g
      JOIN carecore_care_plans p ON p.id = g.care_plan_id
      JOIN carecore_residents r ON r.id = p.resident_id AND r.organization_id = ${ctx.actor.organizationId}
      LEFT JOIN carecore_care_goal_evaluations e ON e.care_goal_id = g.id AND e.evaluated_at > NOW() - make_interval(days => ${days})
      WHERE g.status <> 'cancelled'
      GROUP BY g.category ORDER BY g.category`,
    ctx.sql`
      SELECT * FROM (
        SELECT 'plan' AS kind, p.id, r.id AS resident_id, r.first_name || ' ' || r.last_name AS resident_name,
          'Pflegeplan überprüfen' AS title, to_char(p.review_on, 'YYYY-MM-DD') AS due_date
        FROM carecore_care_plans p JOIN carecore_residents r ON r.id = p.resident_id AND r.organization_id = ${ctx.actor.organizationId} AND r.status = 'active'
        WHERE p.status IN ('draft', 'active', 'review') AND p.review_on IS NOT NULL
        UNION ALL
        SELECT 'goal', g.id, r.id, r.first_name || ' ' || r.last_name, g.statement, to_char(g.target_date, 'YYYY-MM-DD')
        FROM carecore_care_goals g JOIN carecore_care_plans p ON p.id = g.care_plan_id
        JOIN carecore_residents r ON r.id = p.resident_id AND r.organization_id = ${ctx.actor.organizationId} AND r.status = 'active'
        WHERE g.status = 'active' AND p.status IN ('draft', 'active', 'review') AND g.target_date IS NOT NULL
      ) due
      CROSS JOIN (SELECT timezone AS tz FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}) org
      WHERE due.due_date::date <= (NOW() AT TIME ZONE org.tz)::date + 14
      ORDER BY due.due_date LIMIT 50`,
  ])) as [Row[], Row[]];
  const byCategory = categories.map((row) => ({
    category: String(row.category),
    activeGoals: Number(row.active_goals),
    evaluations: Number(row.evaluations),
    achieved: Number(row.achieved),
    partially: Number(row.partially),
    notAchieved: Number(row.not_achieved),
    ongoing: Number(row.ongoing),
  }));
  const sum = (key: keyof (typeof byCategory)[number]) =>
    byCategory.reduce((total, row) => total + Number(row[key]), 0);
  return {
    days,
    byCategory,
    totals: {
      activeGoals: sum("activeGoals"),
      evaluations: sum("evaluations"),
      achieved: sum("achieved"),
      partially: sum("partially"),
      notAchieved: sum("notAchieved"),
      ongoing: sum("ongoing"),
    },
    due: due.map((row) => ({
      kind: row.kind as "plan" | "goal",
      id: String(row.id),
      residentId: String(row.resident_id),
      residentName: String(row.resident_name),
      title: String(row.title),
      date: String(row.due_date),
    })),
  };
}

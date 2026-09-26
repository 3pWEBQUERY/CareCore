import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, text, writeAudit, type ApiContext, type Row } from "@/lib/api-context";
import { GOAL_CATEGORIES, type GoalStatus, type InterventionStatus, type Outcome } from "@/lib/care-planning-shared";
import { date, OPEN, loadPlan, assertOpen, today } from "./care-planning";

// ------------------------------------------------------------------ goals

export function parseGoal(body: Record<string, unknown>) {
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

export async function loadGoal(ctx: ApiContext, goalIdInput: unknown) {
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

export function parseIntervention(body: Record<string, unknown>) {
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

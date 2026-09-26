import type { ApiContext, Row } from "@/lib/api-context";
import { listRound } from "@/lib/medication-round";
import { ROUNDS, type RoundKey } from "@/lib/medication-shared";

// Counts shown as badges in the sidebar: my open tasks due today, unread handover
// notes of the last 72 hours and scheduled doses overdue by more than 30 minutes.
export type NavigationBadges = { tasks: number; handover: number; medRound: number };

export async function navigationBadges(ctx: ApiContext): Promise<NavigationBadges> {
  const [counts, rounds] = await Promise.all([
    ctx.sql`
      SELECT
        (SELECT COUNT(*) FROM carecore_tasks t, carecore_organizations o
          WHERE o.id = t.organization_id AND t.organization_id = ${ctx.actor.organizationId}
            AND t.assigned_to = ${ctx.actor.id} AND t.status IN ('open', 'in_progress')
            AND (t.due_at IS NULL OR t.due_at < ((NOW() AT TIME ZONE o.timezone)::date + 1) AT TIME ZONE o.timezone))::int AS tasks,
        (SELECT COUNT(*) FROM carecore_handovers h
          WHERE h.organization_id = ${ctx.actor.organizationId} AND h.created_at > NOW() - INTERVAL '72 hours'
            AND h.author_user_id IS DISTINCT FROM ${ctx.actor.id}
            AND NOT EXISTS (SELECT 1 FROM carecore_handover_reads r WHERE r.handover_id = h.id AND r.user_id = ${ctx.actor.id}))::int AS handover` as Promise<
      Row[]
    >,
    Promise.all((Object.keys(ROUNDS) as RoundKey[]).map((round) => listRound(ctx, round, null))),
  ]);
  const limit = Date.now() - 30 * 60_000;
  return {
    tasks: Number(counts[0]?.tasks ?? 0),
    handover: Number(counts[0]?.handover ?? 0),
    medRound: rounds
      .flatMap((round) => round.doses)
      .filter((dose) => dose.status === "scheduled" && Date.parse(dose.scheduledAt) < limit).length,
  };
}

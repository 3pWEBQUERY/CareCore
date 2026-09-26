import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, iso, text, writeAudit, type ApiContext, type Row } from "@/lib/api-context";
import { ABSENCE_KINDS, type AbsenceKind } from "@/lib/schedule-shared";
import { conflictsFor, assertPerson, dayLabel } from "./schedule-planning";
import { DATE, DAY, orgToday, addDays, notifyManagers, selectAbsences, notify, requireManage } from "./schedule";

export async function requestAbsence(ctx: ApiContext, body: Record<string, unknown>) {
  const { sql, actor } = ctx;
  const kind = typeof body.kind === "string" && body.kind in ABSENCE_KINDS ? (body.kind as AbsenceKind) : null;
  if (!kind) throw new ApiError("Bitte die Art der Abwesenheit wählen.");
  const startsOn = typeof body.startsOn === "string" && DATE.test(body.startsOn) ? body.startsOn : "";
  const endsOn = typeof body.endsOn === "string" && DATE.test(body.endsOn) ? body.endsOn : "";
  if (!startsOn || !endsOn) throw new ApiError("Bitte Beginn und Ende angeben.");
  if (endsOn < startsOn) throw new ApiError("Das Ende liegt vor dem Beginn.");
  if (Date.parse(endsOn) - Date.parse(startsOn) > 366 * DAY)
    throw new ApiError("Eine Abwesenheit darf höchstens ein Jahr dauern.");
  const today = await orgToday(ctx);
  if (kind !== "sick" && startsOn < today) throw new ApiError("Nur Krankheit kann rückwirkend gemeldet werden.");
  if (kind === "sick" && startsOn < addDays(today, -14))
    throw new ApiError("Krankheit kann höchstens 14 Tage rückwirkend gemeldet werden.");
  const overlap = (await sql`
    SELECT 1 FROM carecore_absences WHERE user_id = ${actor.id} AND status IN ('requested', 'approved')
      AND starts_on <= ${endsOn}::date AND ends_on >= ${startsOn}::date LIMIT 1`) as Row[];
  if (overlap[0]) throw new ApiError("Für diesen Zeitraum besteht bereits eine Abwesenheit.", 409);
  const substitute = body.substituteUserId ? await assertPerson(ctx, body.substituteUserId) : null;
  if (substitute?.id === actor.id) throw new ApiError("Du kannst dich nicht selbst vertreten.");

  const id = randomUUID();
  await sql`
    INSERT INTO carecore_absences (id, organization_id, user_id, kind, starts_on, ends_on, urgent, substitute_user_id, note)
    VALUES (${id}, ${actor.organizationId}, ${actor.id}, ${kind}, ${startsOn}, ${endsOn}, ${body.urgent === true},
      ${substitute?.id ?? null}, ${text(body.note, 2000) || null})`;
  await writeAudit(ctx, "absence", id, "requested", null, {
    kind,
    startsOn,
    endsOn,
    substituteUserId: substitute?.id ?? null,
  });
  // Sick leave is a notification, not a request: it takes effect immediately.
  if (kind === "sick") await applyAbsence(ctx, id, null);
  await notifyManagers(
    ctx,
    `${kind === "sick" ? "Krankmeldung" : "Abwesenheitsantrag"}: ${actor.display_name}`,
    `${ABSENCE_KINDS[kind]} ${dayLabel(startsOn)}–${dayLabel(endsOn)}${kind === "sick" ? " – betroffene Dienste sind jetzt offen." : ""}`,
    kind === "sick" || body.urgent === true ? "high" : "normal",
  );
  return id;
}

// Approves an absence: affected duties become open slots, a named substitute is planned in.
export async function applyAbsence(ctx: ApiContext, absenceId: string, decisionNote: string | null) {
  const { sql, actor } = ctx;
  const absence = (await selectAbsences(ctx, { id: absenceId }))[0];
  const substitute = ((await sql`SELECT substitute_user_id FROM carecore_absences WHERE id = ${absenceId}`) as Row[])[0]
    ?.substitute_user_id as string | null;
  const affected = (await sql`
    UPDATE carecore_shift_assignments a SET status = 'absent', absence_reason = ${ABSENCE_KINDS[absence.kind]}, absence_id = ${absenceId}
    FROM carecore_shifts s
    WHERE s.id = a.shift_id AND a.user_id = ${absence.userId} AND s.organization_id = ${actor.organizationId}
      AND s.status <> 'cancelled' AND a.checked_in_at IS NULL AND a.status <> 'absent'
      AND (s.starts_at AT TIME ZONE (SELECT timezone FROM carecore_organizations WHERE id = ${actor.organizationId}))::date
        BETWEEN ${absence.startsOn}::date AND ${absence.endsOn}::date
    RETURNING s.id AS shift_id, s.starts_at, s.ends_at, s.name, a.role, to_char(s.starts_at AT TIME ZONE (SELECT timezone FROM carecore_organizations WHERE id = s.organization_id), 'YYYY-MM-DD') AS day`) as Row[];
  await sql`
    UPDATE carecore_absences SET status = 'approved', decided_by = ${actor.id}, decided_at = NOW(),
      decision_note = ${decisionNote}, updated_at = NOW() WHERE id = ${absenceId}`;

  let covered = 0;
  if (substitute && affected.length) {
    const slots = affected.map((row) => ({
      day: String(row.day),
      startsAt: iso(row.starts_at) ?? "",
      endsAt: iso(row.ends_at) ?? "",
    }));
    slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const conflicts = await conflictsFor(ctx, substitute, slots);
    const statements = affected
      .filter((row) => !conflicts.has(String(row.day)))
      .map(
        (row) => sql`
          INSERT INTO carecore_shift_assignments (id, shift_id, user_id, role, status)
          VALUES (${randomUUID()}, ${String(row.shift_id)}, ${substitute}, ${(row.role as string | null) ?? null}, 'scheduled')
          ON CONFLICT (shift_id, user_id) DO NOTHING`,
      );
    covered = statements.length;
    if (statements.length) await sql.transaction(statements);
    if (covered)
      await notify(
        ctx,
        substitute,
        `Vertretung: ${covered} ${covered === 1 ? "Dienst" : "Dienste"} für ${absence.name}`,
        `${ABSENCE_KINDS[absence.kind]} ${dayLabel(absence.startsOn)}–${dayLabel(absence.endsOn)}. Bitte im Dienstplan bestätigen.`,
        "shift_assigned",
        "/c/betrieb/dienstplanung",
      );
  }
  return { affected: affected.length, covered };
}

export async function decideAbsence(ctx: ApiContext, idInput: unknown, body: Record<string, unknown>) {
  const id = assertUuid(idInput, "Abwesenheit");
  const absence = (await selectAbsences(ctx, { id }))[0];
  if (!absence) throw new ApiError("Abwesenheit nicht gefunden.", 404);
  const note = text(body.note, 1000) || null;
  const period = `${ABSENCE_KINDS[absence.kind]} ${dayLabel(absence.startsOn)}–${dayLabel(absence.endsOn)}`;

  if (body.action === "withdraw") {
    if (absence.userId !== ctx.actor.id) throw new ApiError("Nur die antragstellende Person kann zurückziehen.", 403);
    if (absence.status !== "requested") throw new ApiError("Nur offene Anträge können zurückgezogen werden.", 409);
    await ctx.sql`UPDATE carecore_absences SET status = 'withdrawn', updated_at = NOW() WHERE id = ${id}`;
    await writeAudit(ctx, "absence", id, "withdrawn", { status: absence.status }, { status: "withdrawn" });
    return { affected: 0, covered: 0 };
  }
  requireManage(ctx);
  if (body.action === "approve") {
    if (absence.status !== "requested") throw new ApiError("Der Antrag wurde bereits entschieden.", 409);
    const result = await applyAbsence(ctx, id, note);
    await writeAudit(
      ctx,
      "absence",
      id,
      "approved",
      { status: absence.status },
      { status: "approved", note, ...result },
    );
    await notify(ctx, absence.userId, `Abwesenheit bewilligt`, period, "absence_decided", "/c/betrieb/dienstplanung");
    return result;
  }
  if (body.action === "reject") {
    if (absence.status !== "requested") throw new ApiError("Der Antrag wurde bereits entschieden.", 409);
    if (!note) throw new ApiError("Bitte die Ablehnung begründen.");
    await ctx.sql`
      UPDATE carecore_absences SET status = 'rejected', decided_by = ${ctx.actor.id}, decided_at = NOW(), decision_note = ${note},
        updated_at = NOW() WHERE id = ${id}`;
    await writeAudit(ctx, "absence", id, "rejected", { status: absence.status }, { status: "rejected", note });
    await notify(
      ctx,
      absence.userId,
      `Abwesenheit abgelehnt`,
      `${period}: ${note}`,
      "absence_decided",
      "/c/betrieb/dienstplanung",
      "high",
    );
    return { affected: 0, covered: 0 };
  }
  if (body.action === "revoke") {
    if (absence.status !== "approved")
      throw new ApiError("Nur bewilligte Abwesenheiten können aufgehoben werden.", 409);
    if (!note) throw new ApiError("Bitte den Grund angeben.");
    // Future duties return to the person; past ones stay documented as absent.
    const restored = (await ctx.sql`
      UPDATE carecore_shift_assignments a SET status = 'scheduled', absence_reason = NULL, absence_id = NULL
      FROM carecore_shifts s WHERE s.id = a.shift_id AND a.absence_id = ${id} AND s.starts_at > NOW()
      RETURNING a.id`) as Row[];
    await ctx.sql`
      UPDATE carecore_absences SET status = 'revoked', decided_by = ${ctx.actor.id}, decided_at = NOW(), decision_note = ${note},
        updated_at = NOW() WHERE id = ${id}`;
    await writeAudit(
      ctx,
      "absence",
      id,
      "revoked",
      { status: absence.status },
      { status: "revoked", note, restored: restored.length },
    );
    await notify(
      ctx,
      absence.userId,
      `Abwesenheit aufgehoben`,
      `${period}: ${note}`,
      "absence_decided",
      "/c/betrieb/dienstplanung",
      "high",
    );
    return { affected: restored.length, covered: 0 };
  }
  throw new ApiError("Unbekannte Aktion.");
}

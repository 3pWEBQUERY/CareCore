import { randomUUID } from "node:crypto";
import {
  ApiError,
  assertResident,
  assertUuid,
  iso,
  text,
  auditStatement,
  type ApiContext,
  type Row,
} from "@/lib/api-context";
import { residentAudit } from "@/lib/resident-audit";
import { initials } from "@/lib/medication-shared";
import {
  RAI_ADMISSION_DAYS,
  RAI_DOMAINS,
  RAI_INSTRUMENTS,
  RAI_INTERVAL_MONTHS,
  raiProgress,
  type RaiAssessment,
  type RaiDomain,
  type RaiPerson,
  type RaiResidentDetail,
  type RaiResidentRow,
  type RaiState,
  type RaiWorkplace,
} from "@/lib/rai-shared";

// interRAI workplace: work basket, assessments with draft and completion, due dates.

const day = (value: unknown) => (value ? (iso(value) ?? "").slice(0, 10) : null);

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function addMonths(date: string, months: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}

function mapAssessment(row: Row): RaiAssessment {
  const data = (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>;
  const rawScores = (data.scores && typeof data.scores === "object" ? data.scores : {}) as Record<string, unknown>;
  const scores: Partial<Record<RaiDomain, number>> = {};
  for (const domain of RAI_DOMAINS) {
    const score = Number(rawScores[domain.id]);
    if (rawScores[domain.id] !== undefined && Number.isInteger(score) && score >= 0 && score <= 4)
      scores[domain.id] = score;
  }
  return {
    id: String(row.id),
    instrument: String(row.assessment_type),
    status: row.status as RaiAssessment["status"],
    assessedOn: typeof data.assessedOn === "string" ? data.assessedOn : (day(row.started_at ?? row.created_at) ?? ""),
    dueOn: day(row.due_on),
    progress: Number(row.progress ?? 0),
    scores,
    notes: typeof data.notes === "string" ? data.notes : "",
    assessorId: row.responsible_user_id ? String(row.responsible_user_id) : null,
    assessor: row.assessor ? String(row.assessor) : null,
    completedAt: iso(row.completed_at),
    updatedAt: iso(row.updated_at) ?? "",
  };
}

// Staff whose role may manage RAI, with their open (planned or draft) assessments.
async function raiPeople(ctx: ApiContext): Promise<RaiPerson[]> {
  const rows = (await ctx.sql`
    SELECT u.id, u.display_name, COALESCE(p.last_seen_at > NOW() - INTERVAL '15 minutes', FALSE) AS online,
      (SELECT COUNT(*) FROM carecore_rai_assessments a WHERE a.responsible_user_id = u.id
        AND a.status IN ('new', 'in_progress', 'overdue'))::int AS open
    FROM carecore_users u JOIN carecore_user_profiles p ON p.user_id = u.id
    JOIN carecore_roles ro ON ro.key = u.role
    WHERE p.organization_id = ${ctx.actor.organizationId} AND u.active AND u.archived_at IS NULL
      AND ro.permissions ? 'rai.manage'
    ORDER BY u.display_name`) as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.display_name),
    initials: initials(String(row.display_name)),
    openAssessments: Number(row.open),
    online: Boolean(row.online),
  }));
}

export async function raiWorkplace(ctx: ApiContext): Promise<RaiWorkplace> {
  const org = ctx.actor.organizationId;
  const [rows, people] = await Promise.all([
    ctx.sql`
      SELECT r.id, r.first_name, r.last_name, r.admitted_on, COALESCE(ro.name, '') AS room, COALESCE(cu.name, '') AS unit,
        cu.id AS care_unit_id, (NOW() AT TIME ZONE o.timezone)::date AS today,
        open.id AS open_id, open.status AS open_status, open.due_on AS open_due, open.progress AS open_progress,
        open.assessment_type AS open_type, open.responsible_user_id AS open_user, ou.display_name AS open_user_name,
        done.completed_at AS done_at, done.due_on AS done_due, done.assessment_type AS done_type, done.data AS done_data,
        done.responsible_user_id AS done_user, du.display_name AS done_user_name
      FROM carecore_residents r
      JOIN carecore_organizations o ON o.id = r.organization_id
      LEFT JOIN LATERAL (SELECT care_unit_id, room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL
        ORDER BY started_at DESC LIMIT 1) stay ON TRUE
      LEFT JOIN carecore_care_units cu ON cu.id = stay.care_unit_id
      LEFT JOIN carecore_rooms ro ON ro.id = stay.room_id
      LEFT JOIN LATERAL (SELECT * FROM carecore_rai_assessments WHERE resident_id = r.id AND status IN ('new', 'in_progress', 'overdue')
        ORDER BY (status = 'in_progress') DESC, updated_at DESC LIMIT 1) open ON TRUE
      LEFT JOIN carecore_users ou ON ou.id = open.responsible_user_id
      LEFT JOIN LATERAL (SELECT * FROM carecore_rai_assessments WHERE resident_id = r.id AND status = 'current'
        ORDER BY completed_at DESC NULLS LAST LIMIT 1) done ON TRUE
      LEFT JOIN carecore_users du ON du.id = done.responsible_user_id
      WHERE r.organization_id = ${org} AND r.status = 'active'
      ORDER BY cu.name NULLS LAST, ro.name NULLS LAST, r.last_name, r.first_name` as Promise<Row[]>,
    raiPeople(ctx),
  ]);

  const residents: RaiResidentRow[] = rows.map((row) => {
    const today = day(row.today) ?? new Date().toISOString().slice(0, 10);
    const completed = day(row.done_at);
    const draft = row.open_status === "in_progress";
    const firstDue = addDays(day(row.admitted_on) ?? today, RAI_ADMISSION_DAYS);
    const dueOn =
      day(row.open_due) ?? day(row.done_due) ?? (completed ? addMonths(completed, RAI_INTERVAL_MONTHS) : firstDue);
    let state: RaiState;
    if (draft) state = "in_progress";
    else if (dueOn < today) state = "overdue";
    else if (!completed) state = "new";
    else if (dueOn <= addDays(today, 14)) state = "due";
    else state = "current";
    const scores = mapAssessment({ id: "", assessment_type: "", status: "current", data: row.done_data }).scores;
    const values = Object.values(scores);
    const name = `${row.first_name} ${row.last_name}`;
    return {
      id: String(row.id),
      name,
      initials: initials(name),
      room: String(row.room),
      unit: String(row.unit),
      careUnitId: row.care_unit_id ? String(row.care_unit_id) : null,
      state,
      reason: draft
        ? "Offene Bereiche abschliessen"
        : completed
          ? `Folgeerfassung (alle ${RAI_INTERVAL_MONTHS} Monate)`
          : "Ersterfassung nach Eintritt",
      dueOn,
      progress: draft ? Number(row.open_progress ?? 0) : completed ? 100 : 0,
      instrument: row.open_type ? String(row.open_type) : row.done_type ? String(row.done_type) : null,
      assessorId: row.open_user ? String(row.open_user) : row.done_user ? String(row.done_user) : null,
      assessor: row.open_user_name
        ? String(row.open_user_name)
        : row.done_user_name
          ? String(row.done_user_name)
          : null,
      draftId: draft ? String(row.open_id) : null,
      lastCompletedOn: completed,
      averageScore: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    };
  });
  const current = residents.filter((row) => row.state === "current" || row.state === "due").length;
  return {
    residents,
    people,
    summary: {
      records: residents.filter((row) => row.lastCompletedOn || row.draftId).length,
      due: residents.filter((row) => row.state === "due" || row.state === "overdue" || row.state === "new").length,
      currentShare: residents.length ? Math.round((current / residents.length) * 100) : 0,
      responsible: people.length,
      drafts: residents.filter((row) => row.draftId).length,
    },
  };
}

export async function raiResidentDetail(ctx: ApiContext, residentIdInput: string): Promise<RaiResidentDetail> {
  const residentId = await assertResident(ctx, residentIdInput);
  const [residentRows, assessments, people] = await Promise.all([
    ctx.sql`
      SELECT r.first_name, r.last_name, COALESCE(ro.name, '') AS room, COALESCE(cu.name, '') AS unit
      FROM carecore_residents r
      LEFT JOIN LATERAL (SELECT care_unit_id, room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL
        ORDER BY started_at DESC LIMIT 1) stay ON TRUE
      LEFT JOIN carecore_care_units cu ON cu.id = stay.care_unit_id
      LEFT JOIN carecore_rooms ro ON ro.id = stay.room_id
      WHERE r.id = ${residentId}` as Promise<Row[]>,
    ctx.sql`
      SELECT a.*, u.display_name AS assessor FROM carecore_rai_assessments a
      LEFT JOIN carecore_users u ON u.id = a.responsible_user_id
      WHERE a.resident_id = ${residentId} AND a.status <> 'archived'
         OR a.resident_id = ${residentId} AND a.status = 'archived' AND a.completed_at IS NOT NULL
      ORDER BY a.completed_at DESC NULLS FIRST, a.updated_at DESC` as Promise<Row[]>,
    raiPeople(ctx),
  ]);
  const row = residentRows[0];
  const mapped = assessments.map(mapAssessment);
  return {
    resident: {
      id: residentId,
      name: `${row.first_name} ${row.last_name}`,
      room: String(row.room),
      unit: String(row.unit),
    },
    draft:
      mapped.find((item) => item.status === "in_progress") ??
      mapped.find((item) => item.status === "new" || item.status === "overdue") ??
      null,
    history: mapped.filter((item) => item.completedAt).slice(0, 10),
    people,
  };
}

// Heutiges Datum in der Zeitzone der Organisation.
async function orgToday(ctx: ApiContext) {
  const rows =
    (await ctx.sql`SELECT to_char(NOW() AT TIME ZONE timezone, 'YYYY-MM-DD') AS d FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}`) as Row[];
  return String(rows[0].d);
}

export async function saveRaiAssessment(ctx: ApiContext, residentIdInput: string, body: Record<string, unknown>) {
  const residentId = await assertResident(ctx, residentIdInput);
  const instrument = String(body.instrument ?? "");
  if (!RAI_INSTRUMENTS.includes(instrument)) throw new ApiError("Instrument ist ungültig.");
  const assessedOn = String(body.assessedOn ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(assessedOn)) throw new ApiError("Erfassungsdatum ist ungültig.");
  if (assessedOn > (await orgToday(ctx))) throw new ApiError("Das Erfassungsdatum liegt in der Zukunft.");
  const assessorId = body.assessorId ? assertUuid(body.assessorId, "RAI Verantwortliche") : null;
  if (assessorId && !(await raiPeople(ctx)).some((person) => person.id === assessorId))
    throw new ApiError("Die gewählte Person hat keine RAI-Berechtigung.");
  const rawScores = (body.scores && typeof body.scores === "object" ? body.scores : {}) as Record<string, unknown>;
  const scores: Partial<Record<RaiDomain, number>> = {};
  for (const domain of RAI_DOMAINS) {
    const value = rawScores[domain.id];
    if (value === undefined || value === null) continue;
    const score = Number(value);
    if (!Number.isInteger(score) || score < 0 || score > 4)
      throw new ApiError(`${domain.id}: Einschätzung ist ungültig.`);
    scores[domain.id] = score;
  }
  const notes = text(body.notes, 8000);
  const complete = body.complete === true;
  if (complete && RAI_DOMAINS.some((domain) => scores[domain.id] === undefined))
    throw new ApiError("Zum Abschliessen bitte alle Bereiche einschätzen.");

  const open = (await ctx.sql`
    SELECT * FROM carecore_rai_assessments WHERE resident_id = ${residentId} AND status IN ('new', 'in_progress', 'overdue')
    ORDER BY (status = 'in_progress') DESC, updated_at DESC LIMIT 1`) as Row[];
  const before = open[0] ?? null;
  const id = before ? String(before.id) : randomUUID();
  const data = JSON.stringify({ scores, notes, assessedOn });
  const progress = complete ? 100 : raiProgress(scores, notes);
  const status = complete ? "current" : "in_progress";
  const dueOn = complete ? addMonths(assessedOn, RAI_INTERVAL_MONTHS) : (day(before?.due_on) ?? null);
  const statements = [];
  if (complete)
    // Only the latest completed assessment counts; earlier ones stay in the history.
    statements.push(ctx.sql`
      UPDATE carecore_rai_assessments SET status = 'archived', updated_at = NOW()
      WHERE resident_id = ${residentId} AND id <> ${id} AND status IN ('current', 'new', 'overdue')`);
  statements.push(
    before
      ? ctx.sql`
          UPDATE carecore_rai_assessments SET assessment_type = ${instrument}, responsible_user_id = ${assessorId},
            status = ${status}, due_on = ${dueOn}, progress = ${progress}, data = ${data}::jsonb,
            started_at = COALESCE(started_at, NOW()), completed_at = ${complete ? new Date().toISOString() : null},
            updated_at = NOW()
          WHERE id = ${id}`
      : ctx.sql`
          INSERT INTO carecore_rai_assessments (id, resident_id, responsible_user_id, assessment_type, status, due_on,
            started_at, completed_at, progress, data)
          VALUES (${id}, ${residentId}, ${assessorId}, ${instrument}, ${status}, ${dueOn}, NOW(),
            ${complete ? new Date().toISOString() : null}, ${progress}, ${data}::jsonb)`,
  );
  statements.push(
    residentAudit(ctx.sql, ctx.actor, {
      residentId,
      entityType: "rai_assessment",
      entityId: id,
      action: complete ? "completed" : before ? "updated" : "created",
      before: before
        ? {
            instrument: before.assessment_type,
            status: before.status,
            progress: before.progress,
            assessorId: before.responsible_user_id,
          }
        : null,
      after: { instrument, assessedOn, progress, assessorId },
    }),
  );
  await ctx.sql.transaction(statements);
  return { id, status, dueOn };
}

// Plans assessments for residents that become due: one planned entry per resident
// without an open assessment, optionally notifying the RAI staff.
export async function refreshRaiDue(ctx: ApiContext, body: Record<string, unknown>) {
  const scope = String(body.scope ?? "all");
  const days = Math.min(Math.max(Number(body.days) || 30, 0), 120);
  const unitIds = Array.isArray(body.unitIds) ? body.unitIds.map(String) : null;
  const workplace = await raiWorkplace(ctx);
  const today = await orgToday(ctx);
  const limit = addDays(today, days);
  const candidates = workplace.residents.filter(
    (row) =>
      row.state !== "current" &&
      row.state !== "in_progress" &&
      row.dueOn !== null &&
      row.dueOn <= limit &&
      (!unitIds || (row.careUnitId !== null && unitIds.includes(row.careUnitId))) &&
      (scope === "overdue" ? row.state === "overdue" : scope === "new" ? !row.lastCompletedOn : true),
  );
  const existing = new Set(
    (
      (await ctx.sql`
        SELECT resident_id FROM carecore_rai_assessments
        WHERE status IN ('new', 'overdue') AND resident_id = ANY(${candidates.map((row) => row.id)})`) as Row[]
    ).map((row) => String(row.resident_id)),
  );
  const planned = candidates.filter((row) => !existing.has(row.id));
  const statements = planned.map(
    (row) => ctx.sql`
      INSERT INTO carecore_rai_assessments (id, resident_id, responsible_user_id, assessment_type, status, due_on, progress)
      VALUES (${randomUUID()}, ${row.id}, ${row.assessorId}, ${row.instrument ?? RAI_INSTRUMENTS[0]}, 'new', ${row.dueOn}, 0)`,
  );
  // Planned entries whose date has passed are marked overdue.
  statements.push(ctx.sql`
    UPDATE carecore_rai_assessments a SET status = 'overdue', updated_at = NOW()
    FROM carecore_residents r
    WHERE r.id = a.resident_id AND r.organization_id = ${ctx.actor.organizationId}
      AND a.status = 'new' AND a.due_on < ${today}::date`);
  let notified = 0;
  if (body.notify === true && candidates.length)
    for (const person of workplace.people.filter((person) => person.id !== ctx.actor.id)) {
      statements.push(ctx.sql`
        INSERT INTO carecore_notifications (id, user_id, title, body, type, priority, link_url)
        VALUES (${randomUUID()}, ${person.id}, ${`${candidates.length} RAI-Erfassung${candidates.length === 1 ? "" : "en"} fällig`},
          ${`${ctx.actor.display_name} hat die RAI-Fälligkeiten aktualisiert.`}, 'rai_due', 'normal', '/c/rai/faelligkeiten')`);
      notified += 1;
    }
  statements.push(
    auditStatement(ctx, "rai_due", ctx.actor.organizationId, "refreshed", null, {
      scope,
      days,
      planned: planned.length,
      due: candidates.length,
    }),
  );
  await ctx.sql.transaction(statements);
  return { due: candidates.length, planned: planned.length, notified };
}

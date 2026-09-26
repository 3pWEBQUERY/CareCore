import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, iso, num, text, writeAudit, type ApiContext, type Row } from "@/lib/api-context";
import { storeFile } from "@/lib/files";
import { hasPermission } from "@/lib/server-data";
import {
  CERTIFICATE_TYPES,
  DUE_SOON_DAYS,
  TRAINING_CATEGORIES,
  TRAINING_FORMATS,
  type ComplianceRow,
  type ComplianceState,
  type Enrollment,
  type LearningPayload,
  type LearningPerson,
  type Training,
  type TrainingFormat,
  type TrainingSession,
} from "@/lib/learning-shared";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const canManage = (ctx: ApiContext) => hasPermission(ctx.actor, "team.manage");
function requireManage(ctx: ApiContext) {
  if (!canManage(ctx)) throw new ApiError("Nur die Leitung darf Schulungen verwalten.", 403);
}
const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const dayLabel = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;

async function orgToday({ sql, actor }: ApiContext) {
  const rows = (await sql`
    SELECT to_char(NOW() AT TIME ZONE timezone, 'YYYY-MM-DD') AS today FROM carecore_organizations WHERE id = ${actor.organizationId}`) as Row[];
  return String(rows[0].today);
}

async function listPeople({ sql, actor }: ApiContext): Promise<LearningPerson[]> {
  const rows = (await sql`
    SELECT u.id, u.display_name, u.role, COALESCE(p.job_title, '') AS job_title FROM carecore_users u
    JOIN carecore_user_profiles p ON p.user_id = u.id
    WHERE p.organization_id = ${actor.organizationId} AND u.active ORDER BY u.display_name`) as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.display_name),
    role: String(row.role),
    jobTitle: String(row.job_title),
  }));
}

function mapEnrollment(row: Row): Enrollment {
  return {
    id: String(row.id),
    trainingId: String(row.training_id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    status: row.status === "completed" ? "completed" : row.status === "in_progress" ? "in_progress" : "assigned",
    progress: Number(row.progress),
    dueOn: (row.due_text as string | null) ?? null,
    sessionId: (row.session_id as string | null) ?? null,
    completedAt: iso(row.completed_at),
    validUntil: (row.valid_text as string | null) ?? null,
    verified: Boolean(row.verified_at),
    verifiedByName: (row.verified_name as string | null) ?? null,
    certificateFileId: (row.certificate_file_id as string | null) ?? null,
    certificateName: (row.cert_name as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    assignedByName: (row.assigned_name as string | null) ?? null,
  };
}

async function selectEnrollments(ctx: ApiContext, where: { userIds?: string[]; id?: string }) {
  const rows = (await ctx.sql`
    SELECT e.*, to_char(e.due_on, 'YYYY-MM-DD') AS due_text, to_char(e.valid_until, 'YYYY-MM-DD') AS valid_text,
      u.display_name AS user_name, v.display_name AS verified_name, a.display_name AS assigned_name, f.name AS cert_name
    FROM carecore_training_enrollments e
    JOIN carecore_trainings t ON t.id = e.training_id AND t.organization_id = ${ctx.actor.organizationId}
    JOIN carecore_users u ON u.id = e.user_id
    LEFT JOIN carecore_users v ON v.id = e.verified_by
    LEFT JOIN carecore_users a ON a.id = e.assigned_by
    LEFT JOIN carecore_cloud_files f ON f.id = e.certificate_file_id
    WHERE (${where.id ?? null}::uuid IS NULL OR e.id = ${where.id ?? null}::uuid)
      AND (${where.userIds ?? null}::uuid[] IS NULL OR e.user_id = ANY(${where.userIds ?? null}::uuid[]))`) as Row[];
  return rows.map(mapEnrollment);
}

function complianceState(enrollment: Enrollment | undefined, today: string): ComplianceState {
  if (!enrollment?.completedAt) return "missing";
  if (enrollment.validUntil && enrollment.validUntil < today) return "expired";
  if (!enrollment.verified) return "pending";
  if (enrollment.validUntil && enrollment.validUntil <= addDays(today, DUE_SOON_DAYS)) return "due_soon";
  return "valid";
}

export async function learningData(ctx: ApiContext, params: URLSearchParams): Promise<LearningPayload> {
  const { sql, actor } = ctx;
  const manager = canManage(ctx);
  const requested = params.get("userId");
  const today = await orgToday(ctx);
  const [people, trainingRows, roleRows] = await Promise.all([
    listPeople(ctx),
    sql`
      SELECT t.*, (SELECT COUNT(*) FROM carecore_training_enrollments e WHERE e.training_id = t.id)::int AS enrolled_count,
        COALESCE((
          SELECT json_agg(json_build_object('id', s.id, 'startsAt', s.starts_at, 'endsAt', s.ends_at, 'location', s.location,
            'capacity', s.capacity,
            'booked', (SELECT COUNT(*) FROM carecore_training_enrollments e WHERE e.session_id = s.id AND e.status IN ('assigned', 'in_progress')),
            'mine', EXISTS (SELECT 1 FROM carecore_training_enrollments e WHERE e.session_id = s.id AND e.user_id = ${actor.id}))
            ORDER BY s.starts_at)
          FROM carecore_training_sessions s
          WHERE s.training_id = t.id AND s.cancelled_at IS NULL AND s.ends_at > NOW() - INTERVAL '1 day'), '[]'::json) AS sessions
      FROM carecore_trainings t
      WHERE t.organization_id = ${actor.organizationId} AND t.active
      ORDER BY t.mandatory DESC, t.title` as Promise<Row[]>,
    sql`SELECT key, name FROM carecore_roles ORDER BY name` as Promise<Row[]>,
  ]);
  const targets =
    manager && requested === "all"
      ? people
      : manager && requested && people.some((p) => p.id === requested)
        ? people.filter((p) => p.id === requested)
        : people.filter((p) => p.id === actor.id);
  const enrollments = await selectEnrollments(ctx, {
    userIds: [...new Set([actor.id, ...targets.map((p) => p.id)])],
  });
  const byKey = new Map(enrollments.map((e) => [`${e.trainingId}:${e.userId}`, e]));

  const trainings: Training[] = trainingRows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    category: String(row.category),
    format: (row.format as TrainingFormat) in TRAINING_FORMATS ? (row.format as TrainingFormat) : "presence",
    durationMinutes: num(row.duration_minutes),
    mandatory: Boolean(row.mandatory),
    validForMonths: num(row.valid_for_months),
    requiredRoles: Array.isArray(row.required_roles) ? (row.required_roles as string[]) : [],
    linkUrl: (row.link_url as string | null) ?? null,
    sessions: (row.sessions as TrainingSession[]).map((s) => ({
      ...s,
      startsAt: iso(s.startsAt) ?? "",
      endsAt: iso(s.endsAt) ?? "",
      booked: Number(s.booked),
    })),
    enrollment: byKey.get(`${row.id}:${actor.id}`) ?? null,
    enrolledCount: Number(row.enrolled_count),
  }));

  const compliance: ComplianceRow[] = targets.flatMap((person) =>
    trainings
      .filter((t) => t.mandatory && (!t.requiredRoles.length || t.requiredRoles.includes(person.role)))
      .map((t) => {
        const enrollment = byKey.get(`${t.id}:${person.id}`);
        const state = complianceState(enrollment, today);
        return {
          key: `${t.id}:${person.id}`,
          trainingId: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          userId: person.id,
          userName: person.name,
          state,
          deadline: enrollment?.completedAt ? enrollment.validUntil : (enrollment?.dueOn ?? null),
          enrollment: enrollment ?? null,
        };
      }),
  );

  return {
    today,
    trainings,
    compliance,
    people: manager ? people : [],
    roles: roleRows.map((row) => ({ key: String(row.key), name: String(row.name) })),
    canManage: manager,
    currentUserId: actor.id,
  };
}

function parseTraining(body: Record<string, unknown>, roleKeys: string[]) {
  const title = text(body.title, 220);
  if (title.length < 3) throw new ApiError("Bitte einen Titel angeben.");
  const category =
    typeof body.category === "string" && (TRAINING_CATEGORIES as readonly string[]).includes(body.category)
      ? body.category
      : "Pflege";
  const format =
    typeof body.format === "string" && body.format in TRAINING_FORMATS ? (body.format as TrainingFormat) : "presence";
  const duration = num(body.durationMinutes);
  if (duration !== null && (!Number.isInteger(duration) || duration < 5 || duration > 2400))
    throw new ApiError("Die Dauer muss zwischen 5 und 2400 Minuten liegen.");
  const validFor = num(body.validForMonths);
  if (validFor !== null && (!Number.isInteger(validFor) || validFor < 1 || validFor > 120))
    throw new ApiError("Die Gültigkeit muss zwischen 1 und 120 Monaten liegen.");
  const link = text(body.linkUrl, 1000);
  if (link && !/^https:\/\/[^\s]+$/i.test(link)) throw new ApiError("Der Kurslink muss mit https:// beginnen.");
  const roles = Array.isArray(body.requiredRoles)
    ? [...new Set(body.requiredRoles.filter((r): r is string => typeof r === "string" && roleKeys.includes(r)))]
    : [];
  return {
    title,
    description: text(body.description, 5000) || null,
    category,
    format,
    duration,
    mandatory: body.mandatory === true,
    validFor,
    link: link || null,
    roles,
  };
}

async function roleKeys(ctx: ApiContext) {
  return ((await ctx.sql`SELECT key FROM carecore_roles`) as Row[]).map((row) => String(row.key));
}

async function loadTraining(ctx: ApiContext, idInput: unknown) {
  const id = assertUuid(idInput, "Schulung");
  const rows = (await ctx.sql`
    SELECT * FROM carecore_trainings WHERE id = ${id} AND organization_id = ${ctx.actor.organizationId}`) as Row[];
  if (!rows[0]) throw new ApiError("Schulung nicht gefunden.", 404);
  return rows[0];
}

export async function createTraining(ctx: ApiContext, body: Record<string, unknown>) {
  requireManage(ctx);
  const t = parseTraining(body, await roleKeys(ctx));
  const id = randomUUID();
  await ctx.sql`
    INSERT INTO carecore_trainings (id, organization_id, title, description, category, format, duration_minutes, mandatory,
      valid_for_months, link_url, required_roles, created_by)
    VALUES (${id}, ${ctx.actor.organizationId}, ${t.title}, ${t.description}, ${t.category}, ${t.format}, ${t.duration},
      ${t.mandatory}, ${t.validFor}, ${t.link}, ${JSON.stringify(t.roles)}::jsonb, ${ctx.actor.id})`;
  await writeAudit(ctx, "training", id, "created", null, t);
  return id;
}

export async function updateTraining(ctx: ApiContext, idInput: unknown, body: Record<string, unknown>) {
  requireManage(ctx);
  const before = await loadTraining(ctx, idInput);
  if (body.action === "archive") {
    await ctx.sql`UPDATE carecore_trainings SET active = FALSE, updated_at = NOW() WHERE id = ${before.id as string}`;
    await writeAudit(ctx, "training", String(before.id), "archived", null, null);
    return;
  }
  const t = parseTraining(body, await roleKeys(ctx));
  await ctx.sql`
    UPDATE carecore_trainings SET title = ${t.title}, description = ${t.description}, category = ${t.category},
      format = ${t.format}, duration_minutes = ${t.duration}, mandatory = ${t.mandatory}, valid_for_months = ${t.validFor},
      link_url = ${t.link}, required_roles = ${JSON.stringify(t.roles)}::jsonb, updated_at = NOW()
    WHERE id = ${before.id as string}`;
  await writeAudit(ctx, "training", String(before.id), "updated", before, t);
}

export async function addSession(ctx: ApiContext, trainingIdInput: unknown, body: Record<string, unknown>) {
  requireManage(ctx);
  const training = await loadTraining(ctx, trainingIdInput);
  if (typeof body.date !== "string" || !DATE.test(body.date)) throw new ApiError("Bitte das Datum wählen.");
  const start = typeof body.start === "string" && TIME.test(body.start) ? body.start : "";
  const end = typeof body.end === "string" && TIME.test(body.end) ? body.end : "";
  if (!start || !end || end <= start) throw new ApiError("Bitte gültige Anfangs- und Endzeiten angeben.");
  if (body.date < (await orgToday(ctx))) throw new ApiError("Termine können nicht in der Vergangenheit liegen.");
  const capacity = num(body.capacity);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 500))
    throw new ApiError("Die Platzzahl muss zwischen 1 und 500 liegen.");
  const id = randomUUID();
  await ctx.sql`
    INSERT INTO carecore_training_sessions (id, training_id, starts_at, ends_at, location, capacity)
    SELECT ${id}, ${training.id as string}, (${body.date}::date + ${start}::time) AT TIME ZONE timezone,
      (${body.date}::date + ${end}::time) AT TIME ZONE timezone, ${text(body.location, 180) || null}, ${capacity}
    FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}`;
  await writeAudit(ctx, "training_session", id, "created", null, {
    trainingId: training.id,
    date: body.date,
    start,
    end,
  });
  return id;
}

export async function cancelSession(ctx: ApiContext, sessionIdInput: unknown) {
  requireManage(ctx);
  const id = assertUuid(sessionIdInput, "Termin");
  const rows = (await ctx.sql`
    SELECT s.id, t.title, s.starts_at FROM carecore_training_sessions s JOIN carecore_trainings t ON t.id = s.training_id
    WHERE s.id = ${id} AND t.organization_id = ${ctx.actor.organizationId} AND s.cancelled_at IS NULL`) as Row[];
  if (!rows[0]) throw new ApiError("Termin nicht gefunden.", 404);
  const affected = (await ctx.sql`
    UPDATE carecore_training_enrollments SET session_id = NULL, updated_at = NOW() WHERE session_id = ${id} RETURNING user_id`) as Row[];
  await ctx.sql`UPDATE carecore_training_sessions SET cancelled_at = NOW() WHERE id = ${id}`;
  await writeAudit(ctx, "training_session", id, "cancelled", null, { affected: affected.length });
  for (const row of affected)
    await notify(
      ctx,
      String(row.user_id),
      `Kurstermin abgesagt: ${rows[0].title}`,
      "Bitte einen anderen Termin wählen.",
      "high",
    );
}

async function notify(ctx: ApiContext, userId: string, title: string, body: string, priority = "normal") {
  if (userId === ctx.actor.id) return;
  await ctx.sql`
    INSERT INTO carecore_notifications (id, user_id, title, body, type, priority, link_url)
    VALUES (${randomUUID()}, ${userId}, ${title}, ${body}, 'learning', ${priority}, '/c/personal/schulungen')`;
}

async function checkSession(ctx: ApiContext, trainingId: string, sessionIdInput: unknown) {
  if (!sessionIdInput) return null;
  const sessionId = assertUuid(sessionIdInput, "Termin");
  const rows = (await ctx.sql`
    SELECT s.capacity, s.starts_at,
      (SELECT COUNT(*) FROM carecore_training_enrollments e WHERE e.session_id = s.id AND e.status IN ('assigned', 'in_progress') AND e.user_id <> ${ctx.actor.id})::int AS booked
    FROM carecore_training_sessions s WHERE s.id = ${sessionId} AND s.training_id = ${trainingId} AND s.cancelled_at IS NULL`) as Row[];
  if (!rows[0]) throw new ApiError("Termin nicht gefunden.", 404);
  if (Date.parse(String(iso(rows[0].starts_at))) < Date.now())
    throw new ApiError("Dieser Termin hat bereits begonnen.", 409);
  if (rows[0].capacity !== null && Number(rows[0].booked) >= Number(rows[0].capacity))
    throw new ApiError("Dieser Termin ist ausgebucht.", 409);
  return sessionId;
}

export async function enroll(ctx: ApiContext, body: Record<string, unknown>) {
  const training = await loadTraining(ctx, body.trainingId);
  if (!training.active) throw new ApiError("Diese Schulung wird nicht mehr angeboten.", 409);
  const sessionId = await checkSession(ctx, String(training.id), body.sessionId);
  await ctx.sql`
    INSERT INTO carecore_training_enrollments (id, training_id, user_id, status, session_id)
    VALUES (${randomUUID()}, ${training.id as string}, ${ctx.actor.id}, 'assigned', ${sessionId})
    ON CONFLICT (training_id, user_id) DO UPDATE SET session_id = EXCLUDED.session_id,
      status = CASE WHEN carecore_training_enrollments.status = 'completed' THEN 'assigned' ELSE carecore_training_enrollments.status END,
      progress = CASE WHEN carecore_training_enrollments.status = 'completed' THEN 0 ELSE carecore_training_enrollments.progress END,
      updated_at = NOW()`;
  await writeAudit(ctx, "training_enrollment", String(training.id), "enrolled", null, { sessionId });
}

export async function assignTraining(ctx: ApiContext, trainingIdInput: unknown, body: Record<string, unknown>) {
  requireManage(ctx);
  const training = await loadTraining(ctx, trainingIdInput);
  const dueOn = typeof body.dueOn === "string" && DATE.test(body.dueOn) ? body.dueOn : null;
  if (dueOn && dueOn < (await orgToday(ctx))) throw new ApiError("Die Frist liegt in der Vergangenheit.");
  const people = new Set((await listPeople(ctx)).map((p) => p.id));
  const userIds = Array.isArray(body.userIds)
    ? [...new Set(body.userIds.filter((id): id is string => typeof id === "string" && people.has(id)))]
    : [];
  if (!userIds.length) throw new ApiError("Bitte mindestens eine Person wählen.");
  await ctx.sql.transaction(
    userIds.map(
      (userId) => ctx.sql`
        INSERT INTO carecore_training_enrollments (id, training_id, user_id, status, due_on, assigned_by)
        VALUES (${randomUUID()}, ${training.id as string}, ${userId}, 'assigned', ${dueOn}, ${ctx.actor.id})
        ON CONFLICT (training_id, user_id) DO UPDATE SET due_on = EXCLUDED.due_on, assigned_by = EXCLUDED.assigned_by,
          status = CASE WHEN carecore_training_enrollments.status = 'completed' THEN 'assigned' ELSE carecore_training_enrollments.status END,
          progress = CASE WHEN carecore_training_enrollments.status = 'completed' THEN 0 ELSE carecore_training_enrollments.progress END,
          updated_at = NOW()`,
    ),
  );
  await writeAudit(ctx, "training", String(training.id), "assigned", null, { userIds, dueOn });
  for (const userId of userIds)
    await notify(
      ctx,
      userId,
      `Schulung zugewiesen: ${training.title}`,
      dueOn ? `Bitte bis ${dayLabel(dueOn)} abschliessen.` : "Bitte im Kurskatalog anmelden.",
    );
  return userIds.length;
}

export async function enrollmentAction(ctx: ApiContext, idInput: unknown, body: Record<string, unknown>) {
  const id = assertUuid(idInput, "Anmeldung");
  const enrollment = (await selectEnrollments(ctx, { id }))[0];
  if (!enrollment) throw new ApiError("Anmeldung nicht gefunden.", 404);
  const own = enrollment.userId === ctx.actor.id;
  if (body.action === "progress") {
    if (!own) throw new ApiError("Nur die angemeldete Person kann den Fortschritt melden.", 403);
    const progress = num(body.progress);
    if (progress === null || !Number.isInteger(progress) || progress < 0 || progress > 100)
      throw new ApiError("Der Fortschritt muss zwischen 0 und 100 % liegen.");
    await ctx.sql`
      UPDATE carecore_training_enrollments SET progress = ${progress},
        status = CASE WHEN status = 'completed' THEN status WHEN ${progress} > 0 THEN 'in_progress' ELSE 'assigned' END,
        updated_at = NOW() WHERE id = ${id}`;
    return;
  }
  if (body.action === "withdraw") {
    if (!own && !canManage(ctx)) throw new ApiError("Nur die angemeldete Person oder die Leitung kann abmelden.", 403);
    if (own && enrollment.assignedByName && !canManage(ctx))
      throw new ApiError("Zugewiesene Schulungen kann nur die Leitung zurücknehmen.", 403);
    if (enrollment.completedAt)
      await ctx.sql`
        UPDATE carecore_training_enrollments SET status = 'completed', session_id = NULL, progress = 100, due_on = NULL, updated_at = NOW()
        WHERE id = ${id}`;
    else await ctx.sql`DELETE FROM carecore_training_enrollments WHERE id = ${id}`;
    await writeAudit(ctx, "training_enrollment", id, "withdrawn", enrollment, null);
    return;
  }
  if (body.action === "verify") {
    requireManage(ctx);
    if (!enrollment.completedAt) throw new ApiError("Es liegt noch kein Nachweis vor.", 409);
    await ctx.sql`
      UPDATE carecore_training_enrollments SET verified_by = ${ctx.actor.id}, verified_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
    await writeAudit(ctx, "training_enrollment", id, "verified", null, null);
    await notify(ctx, enrollment.userId, "Nachweis bestätigt", "Dein Schulungsnachweis wurde von der Leitung geprüft.");
    return;
  }
  throw new ApiError("Unbekannte Aktion.");
}

// Records completion evidence (optionally with a certificate). Entries by the leadership count as verified.
export async function recordEvidence(ctx: ApiContext, form: FormData) {
  const training = await loadTraining(ctx, form.get("trainingId"));
  const manager = canManage(ctx);
  const userId = form.get("userId") ? assertUuid(form.get("userId"), "Person") : ctx.actor.id;
  if (userId !== ctx.actor.id && !manager) throw new ApiError("Nachweise für andere erfasst nur die Leitung.", 403);
  if (!(await listPeople(ctx)).some((p) => p.id === userId)) throw new ApiError("Person nicht gefunden.", 404);
  const completedOn = String(form.get("completedOn") ?? "");
  const today = await orgToday(ctx);
  if (!DATE.test(completedOn)) throw new ApiError("Bitte das Abschlussdatum angeben.");
  if (completedOn > today) throw new ApiError("Das Abschlussdatum liegt in der Zukunft.");
  if (completedOn < addDays(today, -365 * 5)) throw new ApiError("Nachweise älter als 5 Jahre werden nicht erfasst.");
  const file = form.get("certificate");
  const certificate =
    file instanceof File && file.size > 0 ? await storeFile(ctx, file, "certificate", CERTIFICATE_TYPES) : null;
  const note = text(form.get("note"), 1000) || null;
  const validFor = num(training.valid_for_months);
  await ctx.sql`
    INSERT INTO carecore_training_enrollments (id, training_id, user_id, status, progress, completed_at, valid_until,
      certificate_file_id, verified_by, verified_at, note)
    VALUES (${randomUUID()}, ${training.id as string}, ${userId}, 'completed', 100, (${completedOn}::date + TIME '12:00'),
      CASE WHEN ${validFor}::int IS NULL THEN NULL ELSE (${completedOn}::date + make_interval(months => ${validFor}::int))::date END,
      ${certificate?.id ?? null}, ${manager ? ctx.actor.id : null}, ${manager ? new Date().toISOString() : null}, ${note})
    ON CONFLICT (training_id, user_id) DO UPDATE SET status = 'completed', progress = 100, session_id = NULL, due_on = NULL,
      completed_at = EXCLUDED.completed_at, valid_until = EXCLUDED.valid_until,
      certificate_file_id = COALESCE(EXCLUDED.certificate_file_id, carecore_training_enrollments.certificate_file_id),
      verified_by = EXCLUDED.verified_by, verified_at = EXCLUDED.verified_at, note = EXCLUDED.note,
      reminded_at = NULL, updated_at = NOW()`;
  await writeAudit(ctx, "training_evidence", String(training.id), "recorded", null, {
    userId,
    completedOn,
    certificate: certificate?.name ?? null,
    verified: manager,
  });
  if (!manager && training.mandatory) {
    const managers = (await ctx.sql`
      SELECT u.id FROM carecore_users u JOIN carecore_user_profiles p ON p.user_id = u.id JOIN carecore_roles r ON r.key = u.role
      WHERE p.organization_id = ${ctx.actor.organizationId} AND u.active AND r.permissions ? 'team.manage'`) as Row[];
    for (const m of managers)
      await ctx.sql`
        INSERT INTO carecore_notifications (id, user_id, title, body, type, priority, link_url)
        VALUES (${randomUUID()}, ${String(m.id)}, ${`Nachweis zur Prüfung: ${training.title}`},
          ${`${ctx.actor.display_name} hat einen Nachweis erfasst.`}, 'learning', 'normal', '/c/personal/schulungen/pflichtnachweise')`;
  }
}

// Reminders for own evidence that expires within 30 days or assigned courses due within 7 days.
export async function createLearningReminders(ctx: ApiContext) {
  await ctx.sql`
    WITH today AS (SELECT (NOW() AT TIME ZONE timezone)::date AS d FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}),
    due AS (
      UPDATE carecore_training_enrollments e SET reminded_at = NOW()
      FROM carecore_trainings t, today
      WHERE t.id = e.training_id AND t.organization_id = ${ctx.actor.organizationId} AND t.active AND e.user_id = ${ctx.actor.id}
        AND e.reminded_at IS NULL
        AND ((t.mandatory AND e.valid_until BETWEEN today.d AND today.d + 30)
          OR (e.status <> 'completed' AND e.due_on BETWEEN today.d AND today.d + 7))
      RETURNING t.title, e.valid_until, e.due_on, e.status
    )
    INSERT INTO carecore_notifications (id, user_id, title, body, type, priority, link_url)
    SELECT gen_random_uuid(), ${ctx.actor.id},
      CASE WHEN status = 'completed' THEN 'Nachweis läuft ab: ' ELSE 'Schulung fällig: ' END || title,
      CASE WHEN status = 'completed' THEN 'Gültig bis ' || to_char(valid_until, 'DD.MM.YYYY') || '. Auffrischung planen.'
        ELSE 'Frist ' || to_char(due_on, 'DD.MM.YYYY') || '.' END,
      'learning', 'normal', '/c/personal/schulungen/pflichtnachweise'
    FROM due`;
}

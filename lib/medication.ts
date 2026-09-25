import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  carecoreActor,
  carecoreDb,
  forbidden,
  hasPermission,
  type CarecoreActor,
  type Permission,
} from "@/lib/server-data";
import {
  ADMINISTRATION_STATUSES,
  ROUNDS,
  initials,
  type AdministrationStatus,
  type MedOrder,
  type MedResident,
  type OrderInput,
  type RoundDose,
  type RoundKey,
  type StockItem,
  type StockMovement,
} from "@/lib/medication-shared";

type Sql = ReturnType<typeof carecoreDb>;
type Row = Record<string, unknown>;
export type MedicationContext = { actor: CarecoreActor & { organizationId: string }; sql: Sql };

// Thrown for invalid input or violated safety rules; routes turn it into a 4xx response.
export class MedicationError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function medicationContext(permission: Permission): Promise<MedicationContext | NextResponse> {
  const actor = await carecoreActor();
  if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!actor.organizationId) return NextResponse.json({ error: "Keine Organisation zugeordnet." }, { status: 400 });
  if (!hasPermission(actor, permission)) return forbidden();
  return { actor: actor as MedicationContext["actor"], sql: carecoreDb() };
}

export function medicationErrorResponse(error: unknown, fallback: string) {
  if (error instanceof MedicationError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : value ? String(value) : null);
const num = (value: unknown) => (value === null || value === undefined || value === "" ? null : Number(value));

export function assertUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new MedicationError(`${label} ist ungültig.`);
  return value;
}

export function parseOrderInput(body: Record<string, unknown>): OrderInput {
  const isPrn = body.isPrn === true;
  const input: OrderInput = {
    name: text(body.name, 220),
    strength: text(body.strength, 80),
    form: text(body.form, 80),
    route: text(body.route, 80) || "oral",
    amount: text(body.amount, 120),
    times: Array.isArray(body.times)
      ? [...new Set(body.times.filter((t): t is string => typeof t === "string" && TIME.test(t)))].sort()
      : [],
    weekdays: Array.isArray(body.weekdays)
      ? [...new Set(body.weekdays.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7))].sort()
      : [],
    isPrn,
    maxDosesPer24h: Number.isInteger(body.maxDosesPer24h) ? (body.maxDosesPer24h as number) : null,
    minIntervalHours: typeof body.minIntervalHours === "number" ? body.minIntervalHours : null,
    prnInstructions: text(body.prnInstructions, 2000),
    indication: text(body.indication, 240),
    prescribedBy: text(body.prescribedBy, 160),
    startOn: typeof body.startOn === "string" && DATE.test(body.startOn) ? body.startOn : "",
    endOn: typeof body.endOn === "string" && DATE.test(body.endOn) ? body.endOn : null,
  };
  if (!input.name) throw new MedicationError("Bitte das Präparat angeben.");
  if (!input.amount) throw new MedicationError("Bitte die Dosis angeben, z. B. „1 Tablette“.");
  if (!input.prescribedBy)
    throw new MedicationError("Bitte die verordnende Ärztin oder den verordnenden Arzt angeben.");
  if (!input.startOn) throw new MedicationError("Bitte ein gültiges Startdatum angeben.");
  if (input.endOn && input.endOn < input.startOn) throw new MedicationError("Das Enddatum liegt vor dem Startdatum.");
  if (isPrn) {
    if (!input.maxDosesPer24h || input.maxDosesPer24h < 1 || input.maxDosesPer24h > 24)
      throw new MedicationError("Für eine Reserve ist die maximale Anzahl Gaben pro 24 Stunden (1–24) erforderlich.");
    if (!input.minIntervalHours || input.minIntervalHours < 0.5 || input.minIntervalHours > 72)
      throw new MedicationError("Für eine Reserve ist ein Mindestabstand zwischen 0,5 und 72 Stunden erforderlich.");
    if (!input.indication) throw new MedicationError("Für eine Reserve ist die Indikation erforderlich.");
    input.times = [];
    input.weekdays = [];
  } else {
    if (!input.times.length) throw new MedicationError("Bitte mindestens eine Einnahmezeit angeben.");
    if (input.times.length > 12) throw new MedicationError("Höchstens 12 Einnahmezeiten pro Verordnung.");
    input.maxDosesPer24h = null;
    input.minIntervalHours = null;
  }
  return input;
}

async function audit(
  ctx: MedicationContext,
  entityType: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown,
) {
  await ctx.sql`
    INSERT INTO carecore_audit_log (id, organization_id, actor_user_id, entity_type, entity_id, action, before_data, after_data)
    VALUES (${randomUUID()}, ${ctx.actor.organizationId}, ${ctx.actor.id}, ${entityType}, ${entityId}, ${action},
      ${before === null ? null : JSON.stringify(before)}::jsonb, ${after === null ? null : JSON.stringify(after)}::jsonb)
  `;
}

async function assertResident({ sql, actor }: MedicationContext, residentId: unknown) {
  const id = assertUuid(residentId, "Bewohner");
  const rows =
    await sql`SELECT id FROM carecore_residents WHERE id = ${id} AND organization_id = ${actor.organizationId} LIMIT 1`;
  if (!rows[0]) throw new MedicationError("Bewohner nicht gefunden.", 404);
  return id;
}

async function medicationId({ sql, actor }: MedicationContext, name: string, strength: string, form: string) {
  const existing = await sql`
    SELECT id FROM carecore_medications
    WHERE organization_id = ${actor.organizationId} AND LOWER(name) = LOWER(${name})
      AND COALESCE(strength, '') = ${strength}
    LIMIT 1`;
  if (existing[0]) {
    if (form)
      await sql`UPDATE carecore_medications SET form = ${form}, updated_at = NOW() WHERE id = ${existing[0].id} AND form IS NULL`;
    return existing[0].id as string;
  }
  const id = randomUUID();
  await sql`
    INSERT INTO carecore_medications (id, organization_id, name, active_ingredient, form, strength)
    VALUES (${id}, ${actor.organizationId}, ${name}, ${name}, ${form || null}, ${strength || null})`;
  return id;
}

// ---------------------------------------------------------------- residents

export async function listMedicationResidents({ sql, actor }: MedicationContext): Promise<MedResident[]> {
  const rows = (await sql`
    SELECT r.id, r.first_name, r.last_name, r.medication_allergies,
      COALESCE(ro.name, '') AS room, COALESCE(cu.name, '') AS care_unit,
      (SELECT COUNT(*)::int FROM carecore_medication_orders o WHERE o.resident_id = r.id AND o.status = 'active' AND NOT o.is_prn) AS regular_count,
      (SELECT COUNT(*)::int FROM carecore_medication_orders o WHERE o.resident_id = r.id AND o.status = 'active' AND o.is_prn) AS prn_count
    FROM carecore_residents r
    LEFT JOIN LATERAL (SELECT care_unit_id, room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) stay ON TRUE
    LEFT JOIN carecore_care_units cu ON cu.id = stay.care_unit_id
    LEFT JOIN carecore_rooms ro ON ro.id = stay.room_id
    WHERE r.organization_id = ${actor.organizationId} AND r.status = 'active'
    ORDER BY r.last_name, r.first_name`) as Row[];
  return rows.map((row) => {
    const name = `${row.first_name} ${row.last_name}`;
    return {
      id: String(row.id),
      name,
      initials: initials(name),
      room: String(row.room),
      careUnit: String(row.care_unit),
      allergies: (row.medication_allergies as string | null) ?? null,
      regularCount: Number(row.regular_count),
      prnCount: Number(row.prn_count),
    };
  });
}

export async function updateMedicationAllergies(ctx: MedicationContext, residentId: unknown, allergies: unknown) {
  const id = await assertResident(ctx, residentId);
  const value = text(allergies, 1000);
  const before = await ctx.sql`SELECT medication_allergies FROM carecore_residents WHERE id = ${id}`;
  await ctx.sql`UPDATE carecore_residents SET medication_allergies = ${value || null}, updated_at = NOW() WHERE id = ${id}`;
  await audit(ctx, "resident", id, "medication_allergies_updated", before[0] ?? null, {
    medication_allergies: value || null,
  });
  return value || null;
}

// ------------------------------------------------------------------- orders

export async function listOrders(ctx: MedicationContext, residentIdInput: unknown): Promise<MedOrder[]> {
  const residentId = await assertResident(ctx, residentIdInput);
  const rows = (await ctx.sql`
    SELECT o.id, o.resident_id, o.medication_id, COALESCE(m.name, 'Unbekanntes Präparat') AS name,
      COALESCE(m.strength, '') AS strength, COALESCE(m.form, '') AS form, COALESCE(o.route, '') AS route,
      o.dosage, o.schedule, o.is_prn, COALESCE(o.prn_instructions, '') AS prn_instructions,
      COALESCE(o.indication, '') AS indication, COALESCE(o.prescribed_by, '') AS prescribed_by,
      to_char(o.start_on, 'YYYY-MM-DD') AS start_on, to_char(o.end_on, 'YYYY-MM-DD') AS end_on,
      o.status, o.updated_at, prn.last_at, COALESCE(prn.count_24h, 0) AS count_24h,
      own.quantity AS resident_stock, own.unit AS resident_unit, ward.quantity AS ward_stock, ward.unit AS ward_unit
    FROM carecore_medication_orders o
    LEFT JOIN carecore_medications m ON m.id = o.medication_id
    LEFT JOIN LATERAL (
      SELECT MAX(administered_at) AS last_at,
        COUNT(*) FILTER (WHERE administered_at > NOW() - INTERVAL '24 hours')::int AS count_24h
      FROM carecore_medication_administrations
      WHERE medication_order_id = o.id AND status = 'administered'
    ) prn ON o.is_prn
    LEFT JOIN LATERAL (
      SELECT SUM(quantity) AS quantity, MIN(unit) AS unit FROM carecore_medication_stock
      WHERE resident_id = o.resident_id AND medication_id = o.medication_id
    ) own ON o.is_prn
    LEFT JOIN LATERAL (
      SELECT SUM(st.quantity) AS quantity, MIN(st.unit) AS unit FROM carecore_medication_stock st
      WHERE st.resident_id IS NULL AND st.medication_id = o.medication_id
        AND st.care_unit_id = (SELECT care_unit_id FROM carecore_resident_stays WHERE resident_id = o.resident_id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1)
    ) ward ON o.is_prn
    WHERE o.resident_id = ${residentId} AND o.status IN ('active', 'paused')
    ORDER BY o.is_prn, m.name`) as Row[];
  return rows.map((row) => {
    const dosage = (row.dosage ?? {}) as Record<string, unknown>;
    const schedule = (row.schedule ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id),
      residentId: String(row.resident_id),
      medicationId: (row.medication_id as string | null) ?? null,
      name: String(row.name),
      strength: String(row.strength),
      form: String(row.form),
      route: String(row.route),
      amount: typeof dosage.amount === "string" ? dosage.amount : "",
      times: Array.isArray(schedule.times)
        ? (schedule.times as unknown[]).filter((t): t is string => typeof t === "string")
        : [],
      weekdays: Array.isArray(schedule.weekdays)
        ? (schedule.weekdays as unknown[]).filter((d): d is number => typeof d === "number")
        : [],
      isPrn: Boolean(row.is_prn),
      maxDosesPer24h: num(dosage.maxDosesPer24h),
      minIntervalHours: num(dosage.minIntervalHours),
      prnInstructions: String(row.prn_instructions),
      indication: String(row.indication),
      prescribedBy: String(row.prescribed_by),
      startOn: (row.start_on as string | null) ?? null,
      endOn: (row.end_on as string | null) ?? null,
      status: row.status === "paused" ? "paused" : "active",
      updatedAt: iso(row.updated_at) ?? "",
      lastAdministeredAt: iso(row.last_at),
      administeredLast24h: Number(row.count_24h),
      residentStock: num(row.resident_stock),
      wardStock: num(row.ward_stock),
      stockUnit: (row.resident_unit as string | null) ?? (row.ward_unit as string | null) ?? null,
    };
  });
}

function orderJson(input: OrderInput) {
  return {
    dosage: JSON.stringify(
      input.isPrn
        ? { amount: input.amount, maxDosesPer24h: input.maxDosesPer24h, minIntervalHours: input.minIntervalHours }
        : { amount: input.amount },
    ),
    schedule: JSON.stringify(input.isPrn ? { type: "prn" } : { times: input.times, weekdays: input.weekdays }),
  };
}

export async function createOrder(ctx: MedicationContext, residentIdInput: unknown, input: OrderInput) {
  const residentId = await assertResident(ctx, residentIdInput);
  const medId = await medicationId(ctx, input.name, input.strength, input.form);
  const { dosage, schedule } = orderJson(input);
  const id = randomUUID();
  await ctx.sql`
    INSERT INTO carecore_medication_orders (id, resident_id, medication_id, prescribed_by, indication, dosage, route, schedule, is_prn, prn_instructions, start_on, end_on, status, created_by)
    VALUES (${id}, ${residentId}, ${medId}, ${input.prescribedBy}, ${input.indication || null}, ${dosage}::jsonb, ${input.route}, ${schedule}::jsonb,
      ${input.isPrn}, ${input.prnInstructions || null}, ${input.startOn}, ${input.endOn}, 'active', ${ctx.actor.id})`;
  await audit(ctx, "medication_order", id, "created", null, { residentId, ...input });
  return id;
}

async function loadOrderForUpdate({ sql, actor }: MedicationContext, orderId: unknown) {
  const id = assertUuid(orderId, "Verordnung");
  const rows = (await sql`
    SELECT o.* FROM carecore_medication_orders o
    JOIN carecore_residents r ON r.id = o.resident_id AND r.organization_id = ${actor.organizationId}
    WHERE o.id = ${id} LIMIT 1`) as Row[];
  if (!rows[0]) throw new MedicationError("Verordnung nicht gefunden.", 404);
  return rows[0];
}

export async function updateOrder(ctx: MedicationContext, orderId: unknown, input: OrderInput) {
  const before = await loadOrderForUpdate(ctx, orderId);
  if (before.status === "stopped" || before.status === "completed")
    throw new MedicationError("Abgesetzte Verordnungen können nicht geändert werden.", 409);
  if (Boolean(before.is_prn) !== input.isPrn)
    throw new MedicationError("Regel- und Reservemedikation können nicht ineinander umgewandelt werden.");
  const medId = await medicationId(ctx, input.name, input.strength, input.form);
  const { dosage, schedule } = orderJson(input);
  await ctx.sql`
    UPDATE carecore_medication_orders SET medication_id = ${medId}, prescribed_by = ${input.prescribedBy}, indication = ${input.indication || null},
      dosage = ${dosage}::jsonb, route = ${input.route}, schedule = ${schedule}::jsonb, prn_instructions = ${input.prnInstructions || null},
      start_on = ${input.startOn}, end_on = ${input.endOn}, updated_at = NOW()
    WHERE id = ${before.id}`;
  await audit(ctx, "medication_order", String(before.id), "updated", before, input);
}

export async function setOrderStatus(ctx: MedicationContext, orderId: unknown, status: unknown, reason: unknown) {
  if (status !== "active" && status !== "paused" && status !== "stopped")
    throw new MedicationError("Ungültiger Status.");
  const note = text(reason, 1000);
  if (status !== "active" && !note)
    throw new MedicationError("Bitte einen Grund für das Pausieren oder Absetzen angeben.");
  const before = await loadOrderForUpdate(ctx, orderId);
  if (before.status === "stopped" || before.status === "completed")
    throw new MedicationError("Die Verordnung ist bereits abgesetzt.", 409);
  await ctx.sql`
    UPDATE carecore_medication_orders
    SET status = ${status}, end_on = CASE WHEN ${status} = 'stopped' THEN LEAST(COALESCE(end_on, CURRENT_DATE), CURRENT_DATE) ELSE end_on END, updated_at = NOW()
    WHERE id = ${before.id}`;
  await audit(
    ctx,
    "medication_order",
    String(before.id),
    `status_${status}`,
    { status: before.status },
    { status, reason: note || null },
  );
}

// -------------------------------------------------------------------- round

export async function listRound(
  ctx: MedicationContext,
  round: RoundKey,
  dateInput: unknown,
): Promise<{ date: string; doses: RoundDose[] }> {
  const { sql, actor } = ctx;
  const today = (
    await sql`SELECT to_char(NOW() AT TIME ZONE timezone, 'YYYY-MM-DD') AS d FROM carecore_organizations WHERE id = ${actor.organizationId}`
  )[0]?.d as string;
  const date = typeof dateInput === "string" && DATE.test(dateInput) ? dateInput : today;
  const segments = JSON.stringify(
    ROUNDS[round].segments.map((s) => ({ day_offset: s.dayOffset, from_time: s.from, to_time: s.to })),
  );
  const rows = (await sql`
    SELECT o.id AS order_id, r.id AS resident_id, r.first_name, r.last_name, r.medication_allergies,
      COALESCE(ro.name, '') AS room, COALESCE(cu.name, '') AS care_unit,
      TRIM(CONCAT_WS(' ', m.name, m.strength)) AS medication, COALESCE(o.dosage->>'amount', '') AS amount, COALESCE(o.route, '') AS route,
      o.updated_at > NOW() - INTERVAL '48 hours' AS changed_recently,
      slot.scheduled_at, to_char(slot.scheduled_at AT TIME ZONE org.tz, 'HH24:MI') AS time,
      COALESCE(a.status, 'scheduled') AS status, a.administered_at, a.note, u.display_name AS administered_by
    FROM jsonb_to_recordset(${segments}::jsonb) AS seg(day_offset int, from_time text, to_time text)
    CROSS JOIN (SELECT timezone AS tz FROM carecore_organizations WHERE id = ${actor.organizationId}) org
    CROSS JOIN LATERAL (SELECT ${date}::date + seg.day_offset AS d) day
    JOIN carecore_medication_orders o ON o.status = 'active' AND NOT o.is_prn
    JOIN carecore_residents r ON r.id = o.resident_id AND r.organization_id = ${actor.organizationId} AND r.status = 'active'
    CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(o.schedule->'times') = 'array' THEN o.schedule->'times' ELSE '[]'::jsonb END) AS t(value)
    CROSS JOIN LATERAL (SELECT CASE WHEN t.value ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN t.value::time END AS tm) parsed
    CROSS JOIN LATERAL (SELECT (day.d + parsed.tm) AT TIME ZONE org.tz AS scheduled_at) slot
    LEFT JOIN carecore_medications m ON m.id = o.medication_id
    LEFT JOIN LATERAL (SELECT care_unit_id, room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) stay ON TRUE
    LEFT JOIN carecore_care_units cu ON cu.id = stay.care_unit_id
    LEFT JOIN carecore_rooms ro ON ro.id = stay.room_id
    LEFT JOIN carecore_medication_administrations a ON a.medication_order_id = o.id AND a.scheduled_at = slot.scheduled_at
    LEFT JOIN carecore_users u ON u.id = a.administered_by
    WHERE parsed.tm IS NOT NULL AND parsed.tm BETWEEN seg.from_time::time AND seg.to_time::time
      AND (o.start_on IS NULL OR o.start_on <= day.d) AND (o.end_on IS NULL OR o.end_on >= day.d)
      AND (jsonb_typeof(o.schedule->'weekdays') IS DISTINCT FROM 'array' OR jsonb_array_length(o.schedule->'weekdays') = 0
        OR o.schedule->'weekdays' @> to_jsonb(EXTRACT(ISODOW FROM day.d)::int))
    ORDER BY cu.name NULLS LAST, ro.name NULLS LAST, r.last_name, r.first_name, slot.scheduled_at, m.name`) as Row[];
  return {
    date,
    doses: rows.map((row) => {
      const residentName = `${row.first_name} ${row.last_name}`;
      return {
        orderId: String(row.order_id),
        residentId: String(row.resident_id),
        residentName,
        initials: initials(residentName),
        room: String(row.room),
        careUnit: String(row.care_unit),
        allergies: (row.medication_allergies as string | null) ?? null,
        medication: String(row.medication) || "Unbekanntes Präparat",
        amount: String(row.amount),
        route: String(row.route),
        scheduledAt: iso(row.scheduled_at) ?? "",
        time: String(row.time),
        status: row.status as RoundDose["status"],
        administeredAt: iso(row.administered_at),
        administeredBy: (row.administered_by as string | null) ?? null,
        note: (row.note as string | null) ?? null,
        orderChangedRecently: Boolean(row.changed_recently),
      };
    }),
  };
}

export async function documentScheduledDose(ctx: MedicationContext, body: Record<string, unknown>) {
  const orderId = assertUuid(body.orderId, "Verordnung");
  const status = body.status as AdministrationStatus;
  if (!ADMINISTRATION_STATUSES.includes(status)) throw new MedicationError("Ungültiger Dokumentationsstatus.");
  const note = text(body.note, 2000);
  if (status !== "administered" && !note) throw new MedicationError("Bitte eine Begründung dokumentieren.");
  const scheduledAt =
    typeof body.scheduledAt === "string" && !Number.isNaN(Date.parse(body.scheduledAt))
      ? new Date(body.scheduledAt).toISOString()
      : null;
  if (!scheduledAt) throw new MedicationError("Ungültiger Zeitpunkt.");
  // The slot must be a real scheduled time of an active order of this organization.
  const valid = (await ctx.sql`
    SELECT o.id, o.resident_id FROM carecore_medication_orders o
    JOIN carecore_residents r ON r.id = o.resident_id AND r.organization_id = ${ctx.actor.organizationId}
    CROSS JOIN (SELECT timezone AS tz FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}) org
    CROSS JOIN LATERAL (SELECT (${scheduledAt}::timestamptz AT TIME ZONE org.tz) AS local) l
    WHERE o.id = ${orderId} AND o.status = 'active' AND NOT o.is_prn
      AND date_trunc('minute', ${scheduledAt}::timestamptz) = ${scheduledAt}::timestamptz
      AND ${scheduledAt}::timestamptz <= NOW() + INTERVAL '12 hours'
      AND o.schedule->'times' ? to_char(l.local, 'HH24:MI')
      AND (o.start_on IS NULL OR o.start_on <= l.local::date) AND (o.end_on IS NULL OR o.end_on >= l.local::date)
      AND (jsonb_typeof(o.schedule->'weekdays') IS DISTINCT FROM 'array' OR jsonb_array_length(o.schedule->'weekdays') = 0
        OR o.schedule->'weekdays' @> to_jsonb(EXTRACT(ISODOW FROM l.local)::int))
    LIMIT 1`) as Row[];
  if (!valid[0])
    throw new MedicationError(
      "Für diesen Zeitpunkt ist keine Gabe verordnet oder sie liegt zu weit in der Zukunft.",
      409,
    );
  const before =
    await ctx.sql`SELECT id, status, administered_at, administered_by, note FROM carecore_medication_administrations WHERE medication_order_id = ${orderId} AND scheduled_at = ${scheduledAt}`;
  const rows = await ctx.sql`
    INSERT INTO carecore_medication_administrations (id, medication_order_id, resident_id, scheduled_at, administered_at, administered_by, status, note)
    VALUES (${randomUUID()}, ${orderId}, ${valid[0].resident_id}, ${scheduledAt}, ${status === "administered" ? new Date().toISOString() : null}, ${ctx.actor.id}, ${status}, ${note || null})
    ON CONFLICT (medication_order_id, scheduled_at) DO UPDATE
      SET status = EXCLUDED.status, administered_at = EXCLUDED.administered_at, administered_by = EXCLUDED.administered_by, note = EXCLUDED.note, updated_at = NOW()
    RETURNING id`;
  await audit(
    ctx,
    "medication_administration",
    String(rows[0].id),
    before[0] ? "corrected" : "documented",
    before[0] ?? null,
    { status, note: note || null, scheduledAt },
  );
}

// ---------------------------------------------------------------- reserves

export async function administerPrn(ctx: MedicationContext, body: Record<string, unknown>) {
  const orderId = assertUuid(body.orderId, "Verordnung");
  const note = text(body.note, 2000);
  if (!note) throw new MedicationError("Bitte den Anlass der Reservegabe dokumentieren, z. B. „Schmerzen NRS 5“.");
  const quantity = typeof body.quantity === "number" && body.quantity > 0 && body.quantity <= 100 ? body.quantity : 1;
  const orders = (await ctx.sql`
    SELECT o.id, o.resident_id, o.medication_id, o.dosage, o.status, o.start_on <= CURRENT_DATE AS started,
      (o.end_on IS NULL OR o.end_on >= CURRENT_DATE) AS not_ended
    FROM carecore_medication_orders o
    JOIN carecore_residents r ON r.id = o.resident_id AND r.organization_id = ${ctx.actor.organizationId}
    WHERE o.id = ${orderId} AND o.is_prn LIMIT 1`) as Row[];
  const order = orders[0];
  if (!order) throw new MedicationError("Reserveverordnung nicht gefunden.", 404);
  if (order.status !== "active" || order.started === false || !order.not_ended)
    throw new MedicationError("Die Reserveverordnung ist nicht gültig oder pausiert.", 409);
  const dosage = (order.dosage ?? {}) as Record<string, unknown>;
  const maxDoses = num(dosage.maxDosesPer24h);
  const minInterval = num(dosage.minIntervalHours);
  if (!maxDoses || !minInterval)
    throw new MedicationError(
      "Der Verordnung fehlen Maximaldosis oder Mindestabstand. Bitte zuerst die Verordnung ergänzen.",
      409,
    );

  const recent = (await ctx.sql`
    SELECT COUNT(*) FILTER (WHERE administered_at > NOW() - INTERVAL '24 hours')::int AS count_24h, MAX(administered_at) AS last_at,
      MAX(administered_at) + make_interval(mins => ${Math.round(minInterval * 60)}) AS next_allowed
    FROM carecore_medication_administrations WHERE medication_order_id = ${orderId} AND status = 'administered'`) as Row[];
  if (Number(recent[0].count_24h) >= maxDoses)
    throw new MedicationError(
      `Maximaldosis erreicht: bereits ${recent[0].count_24h} von ${maxDoses} Gaben in 24 Stunden. Bitte ärztliche Rücksprache halten.`,
      409,
    );
  const nextAllowed = recent[0].next_allowed ? new Date(String(iso(recent[0].next_allowed))) : null;
  if (nextAllowed && nextAllowed > new Date())
    throw new MedicationError(
      `Mindestabstand von ${String(minInterval).replace(".", ",")} Stunden noch nicht erreicht. Nächste Gabe frühestens ${nextAllowed.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" })} Uhr.`,
      409,
    );

  // Resident-owned stock first, then the ward stock of the resident's care unit.
  const stock = (await ctx.sql`
    SELECT st.id FROM carecore_medication_stock st
    WHERE st.organization_id = ${ctx.actor.organizationId} AND st.medication_id = ${order.medication_id} AND st.quantity >= ${quantity}
      AND (st.resident_id = ${order.resident_id}
        OR (st.resident_id IS NULL AND st.care_unit_id = (SELECT care_unit_id FROM carecore_resident_stays WHERE resident_id = ${order.resident_id} AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1)))
    ORDER BY (st.resident_id IS NULL), st.expires_on NULLS LAST
    LIMIT 1`) as Row[];
  if (!stock[0])
    throw new MedicationError(
      "Kein ausreichender Bestand im Bewohner- oder Stationsbestand. Bitte zuerst einen Eingang buchen.",
      409,
    );

  // One statement so stock, administration and journal stay consistent; the limit
  // checks are repeated here to guard against simultaneous documentation.
  const administrationId = randomUUID();
  const result = (await ctx.sql`
    WITH s AS (
      UPDATE carecore_medication_stock SET quantity = quantity - ${quantity}, updated_at = NOW()
      WHERE id = ${stock[0].id} AND quantity >= ${quantity}
        AND (SELECT COUNT(*) FROM carecore_medication_administrations WHERE medication_order_id = ${orderId} AND status = 'administered' AND administered_at > NOW() - INTERVAL '24 hours') < ${maxDoses}
        AND NOT EXISTS (SELECT 1 FROM carecore_medication_administrations WHERE medication_order_id = ${orderId} AND status = 'administered' AND administered_at > NOW() - make_interval(mins => ${Math.round(minInterval * 60)}))
      RETURNING id, medication_id
    ), a AS (
      INSERT INTO carecore_medication_administrations (id, medication_order_id, resident_id, scheduled_at, administered_at, administered_by, status, note)
      SELECT ${administrationId}, ${orderId}, ${order.resident_id}, date_trunc('second', NOW()), NOW(), ${ctx.actor.id}, 'administered', ${note} FROM s
      RETURNING id
    )
    INSERT INTO carecore_medication_stock_movements (id, organization_id, stock_id, medication_id, resident_id, administration_id, delta, reason, note, created_by)
    SELECT ${randomUUID()}, ${ctx.actor.organizationId}, s.id, s.medication_id, ${order.resident_id}, a.id, ${-quantity}, 'administration', ${note}, ${ctx.actor.id}
    FROM s CROSS JOIN a
    RETURNING id`) as Row[];
  if (!result[0])
    throw new MedicationError(
      "Die Gabe wurde gerade anderweitig dokumentiert oder der Bestand hat sich geändert. Bitte neu laden.",
      409,
    );
  await audit(ctx, "medication_administration", administrationId, "prn_administered", null, {
    orderId,
    quantity,
    note,
  });
}

// -------------------------------------------------------------------- stock

export async function listStock({
  sql,
  actor,
}: MedicationContext): Promise<{ items: StockItem[]; movements: StockMovement[] }> {
  const [items, movements] = (await Promise.all([
    sql`
      SELECT st.id, st.medication_id, m.name, COALESCE(m.strength, '') AS strength, COALESCE(m.form, '') AS form,
        CASE WHEN st.resident_id IS NOT NULL THEN r.first_name || ' ' || r.last_name ELSE COALESCE(cu.name, 'Ohne Wohnbereich') END AS owner,
        (st.resident_id IS NOT NULL) AS is_resident, COALESCE(st.storage_location, '') AS location, st.quantity, st.unit,
        st.minimum_quantity, to_char(st.expires_on, 'YYYY-MM-DD') AS expires_on, COALESCE(st.batch_number, '') AS batch, st.updated_at
      FROM carecore_medication_stock st
      JOIN carecore_medications m ON m.id = st.medication_id
      LEFT JOIN carecore_care_units cu ON cu.id = st.care_unit_id
      LEFT JOIN carecore_residents r ON r.id = st.resident_id
      WHERE st.organization_id = ${actor.organizationId}
      ORDER BY m.name, m.strength, owner`,
    sql`
      SELECT mv.id, mv.created_at, TRIM(CONCAT_WS(' ', m.name, m.strength)) AS medication,
        CASE WHEN r.id IS NULL THEN NULL ELSE r.first_name || ' ' || r.last_name END AS resident_name,
        mv.delta, mv.reason, mv.note, u.display_name AS user_name
      FROM carecore_medication_stock_movements mv
      JOIN carecore_medications m ON m.id = mv.medication_id
      LEFT JOIN carecore_residents r ON r.id = mv.resident_id
      LEFT JOIN carecore_users u ON u.id = mv.created_by
      WHERE mv.organization_id = ${actor.organizationId}
      ORDER BY mv.created_at DESC LIMIT 30`,
  ])) as [Row[], Row[]];
  return {
    items: items.map((row) => ({
      id: String(row.id),
      medicationId: String(row.medication_id),
      name: String(row.name),
      strength: String(row.strength),
      form: String(row.form),
      owner: String(row.owner),
      ownerKind: row.is_resident ? "resident" : "unit",
      location: String(row.location),
      quantity: Number(row.quantity),
      unit: String(row.unit),
      minimum: num(row.minimum_quantity),
      expiresOn: (row.expires_on as string | null) ?? null,
      batch: String(row.batch),
      updatedAt: iso(row.updated_at) ?? "",
    })),
    movements: movements.map(mapMovement),
  };
}

function mapMovement(row: Row): StockMovement {
  return {
    id: String(row.id),
    createdAt: iso(row.created_at) ?? "",
    medication: String(row.medication),
    residentName: (row.resident_name as string | null) ?? null,
    delta: Number(row.delta),
    reason: row.reason as StockMovement["reason"],
    note: (row.note as string | null) ?? null,
    userName: (row.user_name as string | null) ?? null,
  };
}

export async function listResidentMovements(
  ctx: MedicationContext,
  residentIdInput: unknown,
): Promise<StockMovement[]> {
  const residentId = await assertResident(ctx, residentIdInput);
  const rows = (await ctx.sql`
    SELECT mv.id, mv.created_at, TRIM(CONCAT_WS(' ', m.name, m.strength)) AS medication, NULL AS resident_name,
      mv.delta, mv.reason, mv.note, u.display_name AS user_name
    FROM carecore_medication_stock_movements mv
    JOIN carecore_medications m ON m.id = mv.medication_id
    LEFT JOIN carecore_users u ON u.id = mv.created_by
    WHERE mv.organization_id = ${ctx.actor.organizationId} AND mv.resident_id = ${residentId}
    ORDER BY mv.created_at DESC LIMIT 15`) as Row[];
  return rows.map(mapMovement);
}

async function recordMovement(
  ctx: MedicationContext,
  stockId: string,
  medId: string,
  residentId: string | null,
  delta: number,
  reason: StockMovement["reason"],
  note: string,
) {
  await ctx.sql`
    INSERT INTO carecore_medication_stock_movements (id, organization_id, stock_id, medication_id, resident_id, delta, reason, note, created_by)
    VALUES (${randomUUID()}, ${ctx.actor.organizationId}, ${stockId}, ${medId}, ${residentId}, ${delta}, ${reason}, ${note || null}, ${ctx.actor.id})`;
}

const quantityValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100000 ? value : null;

// Receipt into an existing stock row or a new one (ward stock or resident-owned).
export async function receiveStock(ctx: MedicationContext, body: Record<string, unknown>) {
  const quantity = quantityValue(body.quantity);
  if (!quantity) throw new MedicationError("Bitte eine Menge größer als 0 angeben.");
  const note = text(body.note, 1000);
  if (typeof body.stockId === "string") {
    const stockId = assertUuid(body.stockId, "Bestand");
    const rows = (await ctx.sql`
      UPDATE carecore_medication_stock SET quantity = quantity + ${quantity}, updated_at = NOW()
      WHERE id = ${stockId} AND organization_id = ${ctx.actor.organizationId}
      RETURNING id, medication_id, resident_id`) as Row[];
    if (!rows[0]) throw new MedicationError("Bestand nicht gefunden.", 404);
    await recordMovement(
      ctx,
      stockId,
      String(rows[0].medication_id),
      (rows[0].resident_id as string | null) ?? null,
      quantity,
      "receipt",
      note,
    );
    return stockId;
  }
  const name = text(body.name, 220);
  const unit = text(body.unit, 32);
  if (!name || !unit) throw new MedicationError("Präparat und Einheit sind erforderlich.");
  let careUnitId: string | null = null;
  let residentId: string | null = null;
  if (typeof body.residentId === "string" && body.residentId) residentId = await assertResident(ctx, body.residentId);
  else {
    careUnitId = assertUuid(body.careUnitId, "Wohnbereich");
    const unitRows =
      await ctx.sql`SELECT cu.id FROM carecore_care_units cu JOIN carecore_sites si ON si.id = cu.site_id WHERE cu.id = ${careUnitId} AND si.organization_id = ${ctx.actor.organizationId} LIMIT 1`;
    if (!unitRows[0]) throw new MedicationError("Wohnbereich nicht gefunden.", 404);
  }
  const expiresOn = typeof body.expiresOn === "string" && DATE.test(body.expiresOn) ? body.expiresOn : null;
  const minimum = typeof body.minimum === "number" && body.minimum >= 0 ? body.minimum : null;
  const medId = await medicationId(ctx, name, text(body.strength, 80), text(body.form, 80));
  const batch = text(body.batch, 100) || null;
  // Same medication, owner, batch and unit: add to the existing row instead of creating a duplicate.
  const existing = (await ctx.sql`
    UPDATE carecore_medication_stock SET quantity = quantity + ${quantity}, updated_at = NOW()
    WHERE id = (
      SELECT id FROM carecore_medication_stock
      WHERE organization_id = ${ctx.actor.organizationId} AND medication_id = ${medId} AND unit = ${unit}
        AND care_unit_id IS NOT DISTINCT FROM ${careUnitId}::uuid AND resident_id IS NOT DISTINCT FROM ${residentId}::uuid
        AND batch_number IS NOT DISTINCT FROM ${batch}::varchar
      LIMIT 1)
    RETURNING id`) as Row[];
  if (existing[0]) {
    await recordMovement(ctx, String(existing[0].id), medId, residentId, quantity, "receipt", note);
    return String(existing[0].id);
  }
  const id = randomUUID();
  await ctx.sql`
    INSERT INTO carecore_medication_stock (id, organization_id, care_unit_id, resident_id, medication_id, quantity, unit, minimum_quantity, expires_on, batch_number, storage_location)
    VALUES (${id}, ${ctx.actor.organizationId}, ${careUnitId}, ${residentId}, ${medId}, ${quantity}, ${unit}, ${minimum}, ${expiresOn}, ${batch}, ${text(body.location, 160) || null})`;
  await recordMovement(ctx, id, medId, residentId, quantity, "receipt", note || "Neuer Bestand angelegt");
  return id;
}

// Correction or disposal: sets the counted quantity and journals the difference.
export async function correctStock(ctx: MedicationContext, stockIdInput: unknown, body: Record<string, unknown>) {
  const stockId = assertUuid(stockIdInput, "Bestand");
  const note = text(body.note, 1000);
  const reason = body.reason === "disposal" ? "disposal" : "correction";
  if (typeof body.quantity !== "number" || !Number.isFinite(body.quantity) || body.quantity < 0)
    throw new MedicationError("Bitte den gezählten Bestand angeben.");
  const rows =
    (await ctx.sql`SELECT id, medication_id, resident_id, quantity FROM carecore_medication_stock WHERE id = ${stockId} AND organization_id = ${ctx.actor.organizationId}`) as Row[];
  if (!rows[0]) throw new MedicationError("Bestand nicht gefunden.", 404);
  const delta = body.quantity - Number(rows[0].quantity);
  if (delta !== 0 && !note) throw new MedicationError("Bitte einen Grund für die Bestandsänderung angeben.");
  const expiresOn = typeof body.expiresOn === "string" && DATE.test(body.expiresOn) ? body.expiresOn : null;
  const minimum = typeof body.minimum === "number" && body.minimum >= 0 ? body.minimum : null;
  await ctx.sql`
    UPDATE carecore_medication_stock SET quantity = ${body.quantity}, minimum_quantity = ${minimum}, expires_on = ${expiresOn},
      storage_location = ${text(body.location, 160) || null}, updated_at = NOW()
    WHERE id = ${stockId}`;
  if (delta !== 0)
    await recordMovement(
      ctx,
      stockId,
      String(rows[0].medication_id),
      (rows[0].resident_id as string | null) ?? null,
      delta,
      reason,
      note,
    );
}

export async function listCareUnits({ sql, actor }: MedicationContext) {
  return (await sql`
    SELECT cu.id, cu.name FROM carecore_care_units cu JOIN carecore_sites si ON si.id = cu.site_id
    WHERE si.organization_id = ${actor.organizationId} AND cu.active = TRUE ORDER BY cu.name`) as Array<{
    id: string;
    name: string;
  }>;
}

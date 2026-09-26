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
import { staffOf } from "@/lib/care-planning";
import { DOCUMENT_TYPES } from "@/lib/documents-shared";
import { storeFile } from "@/lib/files";
import { listRound } from "@/lib/medication-round";
import { ROUNDS, type RoundKey } from "@/lib/medication-shared";
import {
  LANGUAGES,
  MARITAL_STATUSES,
  RESIDENT_DOCUMENT_CATEGORIES,
  type MasterData,
  type RecordSummary,
  type ResidentFile,
  type TimelineEntry,
} from "@/lib/resident-record-shared";
import { hasPermission } from "@/lib/server-data";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function medsToday(ctx: ApiContext, residentId: string) {
  const rounds = await Promise.all((Object.keys(ROUNDS) as RoundKey[]).map((round) => listRound(ctx, round, null)));
  const doses = rounds.flatMap((round) => round.doses).filter((dose) => dose.residentId === residentId);
  return { given: doses.filter((dose) => dose.status === "administered").length, total: doses.length };
}

// Master data, key figures and completeness of the record.
export async function recordSummary(ctx: ApiContext, residentIdInput: unknown): Promise<RecordSummary> {
  const residentId = await assertResident(ctx, residentIdInput);
  const [rows, vitals, documents, meds, staff] = await Promise.all([
    ctx.sql`
      SELECT r.*, to_char(r.date_of_birth, 'YYYY-MM-DD') AS birth_day, to_char(r.admitted_on, 'YYYY-MM-DD') AS admitted_day,
        nurse.display_name AS nurse_name, checker.display_name AS checker_name,
        plan.care_level, owner.display_name AS plan_owner,
        EXISTS (SELECT 1 FROM carecore_resident_contacts c WHERE c.resident_id = r.id AND c.is_emergency_contact) AS has_emergency_contact,
        EXISTS (SELECT 1 FROM carecore_resident_biographies b WHERE b.resident_id = r.id AND b.life_story <> '') AS has_biography
      FROM carecore_residents r
      LEFT JOIN carecore_users nurse ON nurse.id = r.primary_care_user_id
      LEFT JOIN carecore_users checker ON checker.id = r.master_data_checked_by
      LEFT JOIN LATERAL (SELECT care_level, owner_user_id FROM carecore_care_plans
        WHERE resident_id = r.id AND status IN ('draft', 'active', 'review') LIMIT 1) plan ON TRUE
      LEFT JOIN carecore_users owner ON owner.id = plan.owner_user_id
      WHERE r.id = ${residentId}` as Promise<Row[]>,
    ctx.sql`
      SELECT measured_at, metric, status FROM carecore_vital_measurements
      WHERE resident_id = ${residentId} ORDER BY measured_at DESC LIMIT 1` as Promise<Row[]>,
    ctx.sql`
      SELECT COUNT(*)::int AS n FROM carecore_documents
      WHERE resident_id = ${residentId} AND organization_id = ${ctx.actor.organizationId} AND status <> 'archived'` as Promise<
      Row[]
    >,
    medsToday(ctx, residentId),
    staffOf(ctx),
  ]);
  const r = rows[0];
  const master: MasterData = {
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    dateOfBirth: (r.birth_day as string | null) ?? null,
    gender: String(r.gender ?? "unspecified"),
    maritalStatus: (r.marital_status as string | null) ?? null,
    language: String(r.language ?? "de-CH"),
    socialSecurityNumber: (r.social_security_number as string | null) ?? null,
    religion: (r.religion as string | null) ?? null,
    externalNumber: (r.external_number as string | null) ?? null,
    admittedOn: (r.admitted_day as string | null) ?? null,
    admissionReason: (r.admission_reason as string | null) ?? null,
    primaryNurseId: (r.primary_care_user_id as string | null) ?? null,
    gpName: (r.gp_name as string | null) ?? null,
    gpPractice: (r.gp_practice as string | null) ?? null,
    gpPhone: (r.gp_phone as string | null) ?? null,
    pharmacy: (r.pharmacy as string | null) ?? null,
    insurer: (r.insurer as string | null) ?? null,
    insuranceNumber: (r.insurance_number as string | null) ?? null,
  };
  const missing = [
    !master.dateOfBirth && "Geburtsdatum",
    !master.admittedOn && "Eintrittsdatum",
    !master.primaryNurseId && "Bezugspflege",
    !master.gpName && "Hausarzt",
    !r.has_emergency_contact && "Notfallkontakt",
    !r.medication_allergies && "Allergien",
    !r.has_biography && "Biografie",
  ].filter((item): item is string => Boolean(item));
  const vital = vitals[0];
  return {
    master,
    primaryNurse: (r.nurse_name as string | null) ?? null,
    planOwner: (r.plan_owner as string | null) ?? null,
    careLevel: (r.care_level as string | null) ?? null,
    checkedAt: iso(r.master_data_checked_at),
    checkedBy: (r.checker_name as string | null) ?? null,
    missing,
    lastVital: vital
      ? { measuredAt: iso(vital.measured_at) ?? "", metric: String(vital.metric), status: String(vital.status) }
      : null,
    medsToday: meds,
    documentsCount: Number(documents[0]?.n ?? 0),
    staff,
    canWrite: hasPermission(ctx.actor, "residents.write"),
  };
}

const optional = (value: unknown, max: number) => text(value, max) || null;

export async function updateMasterData(ctx: ApiContext, residentIdInput: unknown, body: Record<string, unknown>) {
  const residentId = await assertResident(ctx, residentIdInput);
  const firstName = text(body.firstName, 100);
  const lastName = text(body.lastName, 100);
  if (!firstName || !lastName) throw new ApiError("Vor- und Nachname sind Pflichtfelder.");
  const dateOf = (value: unknown, label: string) => {
    if (!value) return null;
    if (typeof value !== "string" || !DATE.test(value)) throw new ApiError(`${label} ist ungültig.`);
    return value;
  };
  const gender = ["male", "female", "diverse", "unspecified"].includes(String(body.gender))
    ? String(body.gender)
    : "unspecified";
  const maritalStatus = body.maritalStatus ? String(body.maritalStatus) : null;
  if (maritalStatus && !MARITAL_STATUSES.includes(maritalStatus)) throw new ApiError("Ungültiger Zivilstand.");
  const language = String(body.language ?? "de-CH") in LANGUAGES ? String(body.language ?? "de-CH") : "de-CH";
  const ssn = optional(body.socialSecurityNumber, 20);
  if (ssn && !/^756\.?\d{4}\.?\d{4}\.?\d{2}$/.test(ssn))
    throw new ApiError("Die AHV-Nummer hat das Format 756.XXXX.XXXX.XX.");
  let nurseId: string | null = null;
  if (body.primaryNurseId) {
    nurseId = assertUuid(body.primaryNurseId, "Bezugspflege");
    const staff =
      await ctx.sql`SELECT 1 FROM carecore_user_profiles WHERE user_id = ${nurseId} AND organization_id = ${ctx.actor.organizationId}`;
    if (!staff[0]) throw new ApiError("Die Bezugspflege gehört nicht zu dieser Organisation.");
  }
  const data = {
    firstName,
    lastName,
    dateOfBirth: dateOf(body.dateOfBirth, "Geburtsdatum"),
    gender,
    maritalStatus,
    language,
    socialSecurityNumber: ssn,
    religion: optional(body.religion, 80),
    externalNumber: optional(body.externalNumber, 80),
    admittedOn: dateOf(body.admittedOn, "Eintrittsdatum"),
    admissionReason: optional(body.admissionReason, 160),
    primaryNurseId: nurseId,
    gpName: optional(body.gpName, 160),
    gpPractice: optional(body.gpPractice, 200),
    gpPhone: optional(body.gpPhone, 60),
    pharmacy: optional(body.pharmacy, 200),
    insurer: optional(body.insurer, 160),
    insuranceNumber: optional(body.insuranceNumber, 40),
  };
  const before = (await ctx.sql`SELECT * FROM carecore_residents WHERE id = ${residentId}`) as Row[];
  try {
    await ctx.sql`
      UPDATE carecore_residents SET first_name = ${data.firstName}, last_name = ${data.lastName},
        date_of_birth = ${data.dateOfBirth}, gender = ${data.gender}, marital_status = ${data.maritalStatus},
        language = ${data.language}, social_security_number = ${data.socialSecurityNumber}, religion = ${data.religion},
        external_number = ${data.externalNumber}, admitted_on = ${data.admittedOn}, admission_reason = ${data.admissionReason},
        primary_care_user_id = ${data.primaryNurseId}, gp_name = ${data.gpName}, gp_practice = ${data.gpPractice},
        gp_phone = ${data.gpPhone}, pharmacy = ${data.pharmacy}, insurer = ${data.insurer},
        insurance_number = ${data.insuranceNumber},
        master_data_checked_at = NOW(), master_data_checked_by = ${ctx.actor.id}, updated_at = NOW()
      WHERE id = ${residentId}`;
  } catch (error) {
    if (String(error).includes("external_number"))
      throw new ApiError("Diese Bewohnernummer ist bereits vergeben.", 409);
    throw error;
  }
  const b = before[0];
  await writeAudit(
    ctx,
    "resident",
    residentId,
    "master_data_updated",
    { firstName: b.first_name, lastName: b.last_name, primaryNurseId: b.primary_care_user_id, gpName: b.gp_name },
    // Social security and insurance numbers are not written to the audit trail.
    {
      ...data,
      socialSecurityNumber: data.socialSecurityNumber ? "geändert" : null,
      insuranceNumber: data.insuranceNumber ? "geändert" : null,
    },
  );
}

const IMPORTANCE_TONES: Record<string, TimelineEntry["tone"]> = {
  critical: "critical",
  important: "attention",
  observation: "attention",
  visit: "info",
};
const ADMINISTRATION_LABELS: Record<string, string> = {
  administered: "verabreicht",
  declined: "abgelehnt",
  omitted: "ausgelassen",
  delayed: "verschoben",
};

// Documentation, vital signs, medication and appointments of the last 60 days in one list.
export async function recordTimeline(ctx: ApiContext, residentIdInput: unknown): Promise<TimelineEntry[]> {
  const residentId = await assertResident(ctx, residentIdInput);
  const [docs, vitals, meds, appointments] = (await Promise.all([
    ctx.sql`
      SELECT d.id, d.title, d.category, d.body, d.importance, d.occurred_at, u.display_name AS author
      FROM carecore_documentation_entries d LEFT JOIN carecore_users u ON u.id = d.author_user_id
      WHERE d.resident_id = ${residentId} AND d.occurred_at > NOW() - INTERVAL '60 days'
      ORDER BY d.occurred_at DESC LIMIT 150`,
    ctx.sql`
      SELECT v.id, v.metric, v.value, v.secondary_value, v.unit, v.status, v.note, v.measured_at, u.display_name AS author
      FROM carecore_vital_measurements v LEFT JOIN carecore_users u ON u.id = v.measured_by
      WHERE v.resident_id = ${residentId} AND v.measured_at > NOW() - INTERVAL '60 days'
      ORDER BY v.measured_at DESC LIMIT 150`,
    ctx.sql`
      SELECT a.id, a.status, a.note, COALESCE(a.administered_at, a.updated_at) AS at,
        TRIM(CONCAT_WS(' ', m.name, m.strength)) AS medication, o.is_prn, u.display_name AS author
      FROM carecore_medication_administrations a
      JOIN carecore_medication_orders o ON o.id = a.medication_order_id
      LEFT JOIN carecore_medications m ON m.id = o.medication_id
      LEFT JOIN carecore_users u ON u.id = a.administered_by
      WHERE a.resident_id = ${residentId} AND a.status <> 'scheduled'
        AND COALESCE(a.administered_at, a.updated_at) > NOW() - INTERVAL '60 days'
      ORDER BY at DESC LIMIT 150`,
    ctx.sql`
      SELECT a.id, a.title, a.category, a.location, a.notes, a.status, a.starts_at, u.display_name AS author
      FROM carecore_resident_appointments a LEFT JOIN carecore_users u ON u.id = a.created_by
      WHERE a.resident_id = ${residentId} AND a.starts_at > NOW() - INTERVAL '60 days' AND a.starts_at < NOW() + INTERVAL '14 days'
      ORDER BY a.starts_at DESC LIMIT 100`,
  ])) as Row[][];
  const number = (value: unknown) => Number(value).toLocaleString("de-CH", { maximumFractionDigits: 1 });
  const entries: TimelineEntry[] = [
    ...docs.map((row) => ({
      id: `doc-${row.id}`,
      category: "Pflege" as const,
      occurredAt: iso(row.occurred_at) ?? "",
      title: String(row.title ?? row.category),
      description: String(row.body),
      author: (row.author as string | null) ?? null,
      tone: IMPORTANCE_TONES[String(row.importance)] ?? "stable",
      documentationId: String(row.id),
    })),
    ...vitals.map((row) => ({
      id: `vital-${row.id}`,
      category: "Vitalwerte" as const,
      occurredAt: iso(row.measured_at) ?? "",
      title: String(row.metric),
      description: `${number(row.value)}${row.secondary_value !== null ? `/${number(row.secondary_value)}` : ""} ${row.unit}${row.note ? ` · ${row.note}` : ""}`,
      author: (row.author as string | null) ?? null,
      tone: (row.status === "critical"
        ? "critical"
        : row.status === "attention"
          ? "attention"
          : "stable") as TimelineEntry["tone"],
      documentationId: null,
    })),
    ...meds.map((row) => ({
      id: `med-${row.id}`,
      category: "Medikation" as const,
      occurredAt: iso(row.at) ?? "",
      title: `${row.medication || "Medikament"} ${ADMINISTRATION_LABELS[String(row.status)] ?? String(row.status)}`,
      description: `${row.is_prn ? "Reservegabe" : "Geplante Gabe"}${row.note ? ` · ${row.note}` : ""}`,
      author: (row.author as string | null) ?? null,
      tone: (row.status === "administered" ? "stable" : "attention") as TimelineEntry["tone"],
      documentationId: null,
    })),
    ...appointments.map((row) => ({
      id: `appointment-${row.id}`,
      category: "Termine" as const,
      occurredAt: iso(row.starts_at) ?? "",
      title: String(row.title),
      description: [row.category, row.location, row.status === "cancelled" ? "abgesagt" : null, row.notes]
        .filter(Boolean)
        .join(" · "),
      author: (row.author as string | null) ?? null,
      tone: (row.status === "cancelled" ? "attention" : "info") as TimelineEntry["tone"],
      documentationId: null,
    })),
  ];
  return entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function mapFile(row: Row): ResidentFile {
  return {
    id: String(row.id),
    title: String(row.title),
    category: String(row.category ?? "Administration"),
    description: (row.description as string | null) ?? null,
    fileId: (row.file_id as string | null) ?? null,
    mimeType: (row.mime_type as string | null) ?? null,
    sizeBytes: row.size_bytes === null || row.size_bytes === undefined ? null : Number(row.size_bytes),
    createdAt: iso(row.created_at) ?? "",
    uploadedBy: (row.uploaded_by_name as string | null) ?? null,
  };
}

export async function residentFiles(ctx: ApiContext, residentIdInput: unknown) {
  const residentId = await assertResident(ctx, residentIdInput);
  const rows = (await ctx.sql`
    SELECT d.*, u.display_name AS uploaded_by_name FROM carecore_documents d
    LEFT JOIN carecore_users u ON u.id = d.uploaded_by
    WHERE d.resident_id = ${residentId} AND d.organization_id = ${ctx.actor.organizationId} AND d.status <> 'archived'
    ORDER BY d.created_at DESC`) as Row[];
  return rows.map(mapFile);
}

export async function uploadResidentFile(ctx: ApiContext, residentIdInput: unknown, form: FormData) {
  const residentId = await assertResident(ctx, residentIdInput);
  const title = text(form.get("title"), 220);
  if (title.length < 3) throw new ApiError("Bitte einen Titel mit mindestens 3 Zeichen angeben.");
  const category = String(form.get("category") ?? "");
  if (!(RESIDENT_DOCUMENT_CATEGORIES as readonly string[]).includes(category))
    throw new ApiError("Bitte eine Kategorie wählen.");
  const file = await storeFile(ctx, form.get("file"), "document", DOCUMENT_TYPES);
  const id = randomUUID();
  await ctx.sql`
    INSERT INTO carecore_documents (id, organization_id, resident_id, kind, title, category, description, file_id, storage_key,
      mime_type, size_bytes, version, version_no, status, uploaded_by)
    VALUES (${id}, ${ctx.actor.organizationId}, ${residentId}, 'document', ${title}, ${category},
      ${text(form.get("description"), 2000) || null}, ${file.id}, ${`cloud:${file.id}`}, ${file.type}, ${file.size}, '1', 1,
      'active', ${ctx.actor.id})`;
  await writeAudit(ctx, "resident_document", id, "uploaded", null, { residentId, title, category, file: file.name });
  return id;
}

export async function archiveResidentFile(ctx: ApiContext, residentIdInput: unknown, documentIdInput: unknown) {
  const residentId = await assertResident(ctx, residentIdInput);
  const documentId = assertUuid(documentIdInput, "Dokument");
  const rows = await ctx.sql`
    UPDATE carecore_documents SET status = 'archived', archived_at = NOW(), archived_by = ${ctx.actor.id}, updated_at = NOW()
    WHERE id = ${documentId} AND resident_id = ${residentId} AND status <> 'archived' RETURNING title`;
  if (!rows[0]) throw new ApiError("Dokument nicht gefunden.", 404);
  await writeAudit(ctx, "resident_document", documentId, "archived", null, { residentId });
  return String(rows[0].title);
}

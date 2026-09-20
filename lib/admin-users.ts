import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export type ManagedUser = { id: string; username: string; displayName: string; role: string; jobTitle: string; phone: string; primaryCareUnitId: string | null; primaryCareUnitName: string | null; active: boolean; archivedAt: string | null; createdAt: string; lastSeenAt: string | null };
export type AdminCareUnit = { id: string; name: string; detail: string };

function database() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  return neon(connectionString);
}

let schemaPromise: Promise<void> | null = null;
async function ensureAdminUsersSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    const sql = database();
    await sql`ALTER TABLE carecore_users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
    await sql`ALTER TABLE carecore_users ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE carecore_users ADD COLUMN IF NOT EXISTS archive_reason TEXT`;
    await sql`CREATE INDEX IF NOT EXISTS carecore_users_archived_idx ON carecore_users (archived_at DESC) WHERE archived_at IS NOT NULL`;
  })().catch((error) => { schemaPromise = null; throw error; });
  await schemaPromise;
}

export async function listManagedUsers(): Promise<{ users: ManagedUser[]; careUnits: AdminCareUnit[] }> {
  await ensureAdminUsersSchema();
  const sql = database();
  const users = await sql`SELECT u.id, u.username, u.display_name, u.role, u.active, u.archived_at, u.created_at, p.job_title, p.phone, p.primary_care_unit_id, p.last_seen_at, cu.name AS primary_care_unit_name FROM carecore_users u LEFT JOIN carecore_user_profiles p ON p.user_id = u.id LEFT JOIN carecore_care_units cu ON cu.id = p.primary_care_unit_id ORDER BY u.archived_at NULLS FIRST, u.active DESC, u.display_name ASC` as unknown as Array<{ id: string; username: string; display_name: string; role: string; active: boolean; archived_at: string | null; created_at: string; job_title: string | null; phone: string | null; primary_care_unit_id: string | null; last_seen_at: string | null; primary_care_unit_name: string | null }>;
  const careUnits = await sql`SELECT id, name, COALESCE(floor, '') AS floor FROM carecore_care_units WHERE active = TRUE ORDER BY name` as unknown as Array<{ id: string; name: string; floor: string }>;
  return { users: users.map((user) => ({ id: user.id, username: user.username, displayName: user.display_name, role: user.role, jobTitle: user.job_title ?? "Noch nicht angegeben", phone: user.phone ?? "", primaryCareUnitId: user.primary_care_unit_id, primaryCareUnitName: user.primary_care_unit_name, active: user.active, archivedAt: user.archived_at, createdAt: user.created_at, lastSeenAt: user.last_seen_at })), careUnits: careUnits.map((unit) => ({ id: unit.id, name: unit.name, detail: unit.floor || "Wohnbereich" })) };
}

export async function updateManagedUser(actorId: string, userId: string, input: { displayName?: string; username?: string; role?: string; jobTitle?: string; phone?: string; primaryCareUnitId?: string | null; action?: "lock" | "restore" }) {
  await ensureAdminUsersSchema();
  const sql = database();
  if (input.action === "lock") {
    if (userId === actorId) throw new Error("CANNOT_LOCK_SELF");
    await sql`UPDATE carecore_users SET active = FALSE, archived_at = NOW(), archived_by = ${actorId}, archive_reason = 'Zugriff durch Administration gesperrt', updated_at = NOW() WHERE id = ${userId}`;
    await sql`DELETE FROM carecore_sessions WHERE user_id = ${userId}`;
  } else if (input.action === "restore") {
    await sql`UPDATE carecore_users SET active = TRUE, archived_at = NULL, archived_by = NULL, archive_reason = NULL, updated_at = NOW() WHERE id = ${userId}`;
  } else {
    const name = input.displayName?.trim().slice(0, 120); const username = input.username?.trim().slice(0, 80); const role = input.role?.trim().slice(0, 40);
    if (!name || !username || !role) throw new Error("INVALID_USER_INPUT");
    if (input.primaryCareUnitId) {
      const unit = await sql`SELECT id FROM carecore_care_units WHERE id = ${input.primaryCareUnitId} AND active = TRUE LIMIT 1` as unknown as Array<{ id: string }>;
      if (!unit[0]) throw new Error("CARE_UNIT_NOT_FOUND");
    }
    await sql`UPDATE carecore_users SET display_name = ${name}, username = ${username}, role = ${role}, updated_at = NOW() WHERE id = ${userId}`;
    await sql`INSERT INTO carecore_user_profiles (user_id, job_title, phone, primary_care_unit_id) VALUES (${userId}, ${input.jobTitle?.trim().slice(0, 140) || null}, ${input.phone?.trim().slice(0, 60) || null}, ${input.primaryCareUnitId ?? null}) ON CONFLICT (user_id) DO UPDATE SET job_title = EXCLUDED.job_title, phone = EXCLUDED.phone, primary_care_unit_id = EXCLUDED.primary_care_unit_id, updated_at = NOW()`;
    if (input.primaryCareUnitId) {
      await sql`UPDATE carecore_user_unit_assignments SET is_primary = FALSE WHERE user_id = ${userId}`;
      await sql`INSERT INTO carecore_user_unit_assignments (user_id, care_unit_id, assignment_role, is_primary) VALUES (${userId}, ${input.primaryCareUnitId}, 'Mitarbeitende:r', TRUE) ON CONFLICT (user_id, care_unit_id) DO UPDATE SET is_primary = TRUE, ends_on = NULL`;
    }
  }
  await audit(actorId, userId, input.action ?? "updated", input);
  return listManagedUsers();
}

export async function deleteManagedUser(actorId: string, userId: string) {
  await ensureAdminUsersSchema();
  if (userId === actorId) throw new Error("CANNOT_DELETE_SELF");
  const sql = database();
  await audit(actorId, userId, "deleted", { permanentlyDeleted: true });
  await sql`DELETE FROM carecore_users WHERE id = ${userId}`;
  return listManagedUsers();
}

async function audit(actorId: string, userId: string, action: string, afterData: unknown) {
  const sql = database();
  await sql`INSERT INTO carecore_audit_log (id, actor_user_id, entity_type, entity_id, action, after_data) VALUES (${randomUUID()}, ${actorId}, 'user', ${userId}, ${action}, ${JSON.stringify(afterData)}::jsonb)`;
}

import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "@/lib/auth";

export type ManagedUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  jobTitle: string;
  phone: string;
  primaryCareUnitId: string | null;
  primaryCareUnitName: string | null;
  active: boolean;
  archivedAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
};
export type AdminCareUnit = { id: string; name: string; detail: string };
export type ManagedRole = {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: string[];
  systemRole: boolean;
  userCount: number;
  createdAt: string;
};
export type AdminUserStats = {
  activeEmployees: number;
  archivedEmployees: number;
  roleCount: number;
  customRoleCount: number;
  unassignedActiveEmployees: number;
  auditEntriesLast30Days: number;
  lastAuditAt: string | null;
};
const roleKeys = [
  "residents.read",
  "residents.write",
  "documentation.write",
  "medication.manage",
  "schedule.manage",
  "team.manage",
  "quality.manage",
  "insights.read",
  "administration.manage",
  "rai.manage",
  "ai.use",
];

function database() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  return neon(connectionString);
}

export async function listManagedUsers(): Promise<{
  users: ManagedUser[];
  careUnits: AdminCareUnit[];
  roles: ManagedRole[];
  stats: AdminUserStats;
}> {
  const sql = database();
  const users =
    (await sql`SELECT u.id, u.username, u.display_name, u.role, u.active, u.archived_at, u.created_at, p.job_title, p.phone, p.primary_care_unit_id, p.last_seen_at, cu.name AS primary_care_unit_name FROM carecore_users u LEFT JOIN carecore_user_profiles p ON p.user_id = u.id LEFT JOIN carecore_care_units cu ON cu.id = p.primary_care_unit_id ORDER BY u.archived_at NULLS FIRST, u.active DESC, u.display_name ASC`) as unknown as Array<{
      id: string;
      username: string;
      display_name: string;
      role: string;
      active: boolean;
      archived_at: string | null;
      created_at: string;
      job_title: string | null;
      phone: string | null;
      primary_care_unit_id: string | null;
      last_seen_at: string | null;
      primary_care_unit_name: string | null;
    }>;
  const careUnits =
    (await sql`SELECT id, name, COALESCE(floor, '') AS floor FROM carecore_care_units WHERE active = TRUE ORDER BY name`) as unknown as Array<{
      id: string;
      name: string;
      floor: string;
    }>;
  const roles = await listManagedRoles();
  const audit =
    (await sql`SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recent_count, MAX(created_at) AS last_audit_at FROM carecore_audit_log WHERE entity_type IN ('user', 'role')`) as unknown as Array<{
      recent_count: number;
      last_audit_at: string | null;
    }>;
  const activeEmployees = users.filter((user) => user.active).length;
  const archivedEmployees = users.filter((user) => !user.active).length;
  const unassignedActiveEmployees = users.filter((user) => user.active && !user.primary_care_unit_id).length;
  return {
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      jobTitle: user.job_title ?? "Noch nicht angegeben",
      phone: user.phone ?? "",
      primaryCareUnitId: user.primary_care_unit_id,
      primaryCareUnitName: user.primary_care_unit_name,
      active: user.active,
      archivedAt: user.archived_at,
      createdAt: user.created_at,
      lastSeenAt: user.last_seen_at,
    })),
    careUnits: careUnits.map((unit) => ({ id: unit.id, name: unit.name, detail: unit.floor || "Wohnbereich" })),
    roles,
    stats: {
      activeEmployees,
      archivedEmployees,
      roleCount: roles.length,
      customRoleCount: roles.filter((role) => !role.systemRole).length,
      unassignedActiveEmployees,
      auditEntriesLast30Days: Number(audit[0]?.recent_count ?? 0),
      lastAuditAt: audit[0]?.last_audit_at ?? null,
    },
  };
}

export async function listManagedRoles(): Promise<ManagedRole[]> {
  const sql = database();
  const rows =
    (await sql`SELECT r.id, r.key, r.name, r.description, r.permissions, r.system_role, r.created_at, COUNT(u.id)::int AS user_count FROM carecore_roles r LEFT JOIN carecore_users u ON u.role = r.key GROUP BY r.id ORDER BY r.system_role DESC, r.name`) as unknown as Array<{
      id: string;
      key: string;
      name: string;
      description: string;
      permissions: string[];
      system_role: boolean;
      created_at: string;
      user_count: number;
    }>;
  return rows.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: Array.isArray(role.permissions) ? role.permissions : [],
    systemRole: role.system_role,
    userCount: Number(role.user_count),
    createdAt: role.created_at,
  }));
}

async function assertRole(sql: ReturnType<typeof database>, role: string) {
  const found = (await sql`SELECT key FROM carecore_roles WHERE key = ${role} LIMIT 1`) as unknown as Array<{
    key: string;
  }>;
  if (!found[0]) throw new Error("ROLE_NOT_FOUND");
}

export async function updateManagedUser(
  actorId: string,
  userId: string,
  input: {
    displayName?: string;
    username?: string;
    role?: string;
    jobTitle?: string;
    phone?: string;
    primaryCareUnitId?: string | null;
    action?: "lock" | "restore";
  },
) {
  const sql = database();
  if (input.action === "lock") {
    if (userId === actorId) throw new Error("CANNOT_LOCK_SELF");
    await sql`UPDATE carecore_users SET active = FALSE, archived_at = NOW(), archived_by = ${actorId}, archive_reason = 'Zugriff durch Administration gesperrt', updated_at = NOW() WHERE id = ${userId}`;
    await sql`DELETE FROM carecore_sessions WHERE user_id = ${userId}`;
  } else if (input.action === "restore") {
    await sql`UPDATE carecore_users SET active = TRUE, archived_at = NULL, archived_by = NULL, archive_reason = NULL, updated_at = NOW() WHERE id = ${userId}`;
  } else {
    const name = input.displayName?.trim().slice(0, 120);
    const username = input.username?.trim().slice(0, 80);
    const role = input.role?.trim().slice(0, 40);
    if (!name || !username || !role) throw new Error("INVALID_USER_INPUT");
    await assertRole(sql, role);
    if (input.primaryCareUnitId) {
      const unit =
        (await sql`SELECT id FROM carecore_care_units WHERE id = ${input.primaryCareUnitId} AND active = TRUE LIMIT 1`) as unknown as Array<{
          id: string;
        }>;
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

export async function createManagedUser(
  actorId: string,
  input: {
    displayName: string;
    username: string;
    password: string;
    role: string;
    jobTitle?: string;
    phone?: string;
    primaryCareUnitId?: string | null;
  },
) {
  const displayName = input.displayName.trim().slice(0, 120);
  const username = input.username.trim().slice(0, 80);
  const role = input.role.trim().slice(0, 40);
  if (!displayName || !username || !role || input.password.length < 10) throw new Error("INVALID_EMPLOYEE_INPUT");
  const sql = database();
  await assertRole(sql, role);
  if (input.primaryCareUnitId) {
    const unit =
      (await sql`SELECT id FROM carecore_care_units WHERE id = ${input.primaryCareUnitId} AND active = TRUE LIMIT 1`) as unknown as Array<{
        id: string;
      }>;
    if (!unit[0]) throw new Error("CARE_UNIT_NOT_FOUND");
  }
  const id = randomUUID();
  const passwordHash = await hashPassword(input.password);
  await sql`INSERT INTO carecore_users (id, username, display_name, role, password_hash) VALUES (${id}, ${username}, ${displayName}, ${role}, ${passwordHash})`;
  await sql`INSERT INTO carecore_user_profiles (user_id, job_title, phone, primary_care_unit_id) VALUES (${id}, ${input.jobTitle?.trim().slice(0, 140) || null}, ${input.phone?.trim().slice(0, 60) || null}, ${input.primaryCareUnitId ?? null})`;
  if (input.primaryCareUnitId)
    await sql`INSERT INTO carecore_user_unit_assignments (user_id, care_unit_id, assignment_role, is_primary) VALUES (${id}, ${input.primaryCareUnitId}, 'Mitarbeitende:r', TRUE)`;
  await audit(actorId, id, "created", {
    displayName,
    username,
    role,
    primaryCareUnitId: input.primaryCareUnitId ?? null,
  });
  return listManagedUsers();
}

export async function deleteManagedUser(actorId: string, userId: string) {
  if (userId === actorId) throw new Error("CANNOT_DELETE_SELF");
  const sql = database();
  await audit(actorId, userId, "deleted", { permanentlyDeleted: true });
  await sql`DELETE FROM carecore_users WHERE id = ${userId}`;
  return listManagedUsers();
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && roleKeys.includes(item)))];
}

export async function createManagedRole(
  actorId: string,
  input: { key: string; name: string; description?: string; permissions?: unknown },
) {
  const sql = database();
  const key = input.key.trim().toLowerCase().slice(0, 40);
  const name = input.name.trim().slice(0, 100);
  if (!name || !/^[a-z0-9:_-]+$/.test(key) || ["admin", "leitung", "pflege", "arzt", "mitarbeitende:r"].includes(key))
    throw new Error("INVALID_ROLE_INPUT");
  const id = randomUUID();
  const permissions = normalizePermissions(input.permissions);
  await sql`INSERT INTO carecore_roles (id, key, name, description, permissions, created_by) VALUES (${id}, ${key}, ${name}, ${input.description?.trim().slice(0, 500) ?? ""}, ${JSON.stringify(permissions)}::jsonb, ${actorId})`;
  await auditRole(actorId, id, "created", { key, name, permissions });
  return listManagedRoles();
}

export async function updateManagedRole(
  actorId: string,
  roleId: string,
  input: { name: string; description?: string; permissions?: unknown },
) {
  const sql = database();
  const name = input.name.trim().slice(0, 100);
  if (!name) throw new Error("INVALID_ROLE_INPUT");
  const permissions = normalizePermissions(input.permissions);
  // The admin role always keeps every permission so administrators cannot lock themselves out.
  const updated =
    (await sql`UPDATE carecore_roles SET name = ${name}, description = ${input.description?.trim().slice(0, 500) ?? ""}, permissions = CASE WHEN key = 'admin' THEN ${JSON.stringify(roleKeys)}::jsonb ELSE ${JSON.stringify(permissions)}::jsonb END, updated_at = NOW() WHERE id = ${roleId} RETURNING id`) as unknown as Array<{
      id: string;
    }>;
  if (!updated[0]) throw new Error("ROLE_NOT_FOUND");
  await auditRole(actorId, roleId, "updated", { name, permissions });
  return listManagedRoles();
}

export async function deleteManagedRole(actorId: string, roleId: string) {
  const sql = database();
  const role =
    (await sql`SELECT key, system_role FROM carecore_roles WHERE id = ${roleId} LIMIT 1`) as unknown as Array<{
      key: string;
      system_role: boolean;
    }>;
  if (!role[0]) throw new Error("ROLE_NOT_FOUND");
  if (role[0].system_role) throw new Error("SYSTEM_ROLE_PROTECTED");
  const users =
    (await sql`SELECT COUNT(*)::int AS count FROM carecore_users WHERE role = ${role[0].key}`) as unknown as Array<{
      count: number;
    }>;
  if (Number(users[0]?.count) > 0) throw new Error("ROLE_IN_USE");
  await sql`DELETE FROM carecore_roles WHERE id = ${roleId}`;
  await auditRole(actorId, roleId, "deleted", { key: role[0].key });
  return listManagedRoles();
}

async function audit(actorId: string, userId: string, action: string, afterData: unknown) {
  const sql = database();
  await sql`INSERT INTO carecore_audit_log (id, actor_user_id, entity_type, entity_id, action, after_data) VALUES (${randomUUID()}, ${actorId}, 'user', ${userId}, ${action}, ${JSON.stringify(afterData)}::jsonb)`;
}
async function auditRole(actorId: string, roleId: string, action: string, afterData: unknown) {
  const sql = database();
  await sql`INSERT INTO carecore_audit_log (id, actor_user_id, entity_type, entity_id, action, after_data) VALUES (${randomUUID()}, ${actorId}, 'role', ${roleId}, ${action}, ${JSON.stringify(afterData)}::jsonb)`;
}

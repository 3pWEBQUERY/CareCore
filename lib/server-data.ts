import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

// Keep in sync with roleKeys in lib/admin-users.ts and the seeded roles in database/schema.sql.
export type Permission =
  | "residents.read"
  | "residents.write"
  | "documentation.write"
  | "medication.manage"
  | "schedule.manage"
  | "team.manage"
  | "quality.manage"
  | "insights.read"
  | "administration.manage"
  | "rai.manage"
  | "ai.use";

export function carecoreDb() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  return neon(url);
}

export async function carecoreActor() {
  const store = await cookies();
  const user = await getSessionUser(store.get(SESSION_COOKIE)?.value);
  if (!user) return null;
  const sql = carecoreDb();
  const rows = await sql`
    SELECT
      (SELECT organization_id FROM carecore_user_profiles WHERE user_id = ${user.id} LIMIT 1) AS organization_id,
      (SELECT permissions FROM carecore_roles WHERE key = ${user.role} LIMIT 1) AS permissions
  `;
  const permissions = Array.isArray(rows[0]?.permissions) ? (rows[0].permissions as string[]) : [];
  return { ...user, organizationId: rows[0]?.organization_id as string | undefined, permissions };
}

export type CarecoreActor = NonNullable<Awaited<ReturnType<typeof carecoreActor>>>;

export function hasPermission(actor: CarecoreActor | null | undefined, permission: Permission) {
  return !!actor?.permissions.includes(permission);
}

export function forbidden(message = "Keine Berechtigung für diese Aktion.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

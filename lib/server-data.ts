import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

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
  const rows = await sql`SELECT organization_id FROM carecore_user_profiles WHERE user_id = ${user.id} LIMIT 1`;
  return { ...user, organizationId: rows[0]?.organization_id as string | undefined };
}

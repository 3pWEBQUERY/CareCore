import { neon } from "@neondatabase/serverless";

export type DashboardLayout = { order: string[]; hidden: string[] };

let schemaPromise: Promise<void> | null = null;

function database() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  return neon(connectionString);
}

export function normalizeDashboardLayout(input: unknown): DashboardLayout | null {
  if (!input || typeof input !== "object") return null;
  const value = input as { order?: unknown; hidden?: unknown };
  if (!Array.isArray(value.order) || !Array.isArray(value.hidden)) return null;
  const isValidList = (items: unknown[]) => items.every((item) => typeof item === "string" && item.length > 0 && item.length <= 80);
  if (!isValidList(value.order) || !isValidList(value.hidden)) return null;
  return { order: [...new Set(value.order as string[])], hidden: [...new Set(value.hidden as string[])] };
}

async function ensureDashboardLayoutSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = database();
      await sql`
        CREATE TABLE IF NOT EXISTS carecore_user_dashboard_layouts (
          user_id UUID PRIMARY KEY REFERENCES carecore_users(id) ON DELETE CASCADE,
          layout JSONB NOT NULL DEFAULT '{"order":[],"hidden":[]}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export async function getDashboardLayout(userId: string): Promise<DashboardLayout | null> {
  await ensureDashboardLayoutSchema();
  const sql = database();
  const rows = await sql`SELECT layout FROM carecore_user_dashboard_layouts WHERE user_id = ${userId} LIMIT 1` as unknown as Array<{ layout: unknown }>;
  return rows[0] ? normalizeDashboardLayout(rows[0].layout) : null;
}

export async function saveDashboardLayout(userId: string, layout: DashboardLayout) {
  await ensureDashboardLayoutSchema();
  const sql = database();
  await sql`
    INSERT INTO carecore_user_dashboard_layouts (user_id, layout, updated_at)
    VALUES (${userId}, ${JSON.stringify(layout)}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE SET layout = EXCLUDED.layout, updated_at = NOW()
  `;
}

export async function deleteDashboardLayout(userId: string) {
  await ensureDashboardLayoutSchema();
  const sql = database();
  await sql`DELETE FROM carecore_user_dashboard_layouts WHERE user_id = ${userId}`;
}

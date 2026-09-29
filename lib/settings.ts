import { ApiError, iso, auditStatement, type ApiContext } from "@/lib/api-context";
import { SETTING_DEFINITIONS, resolveSettings, type AppSettings, type SettingKey } from "@/lib/settings-shared";

// Organisation-wide settings (see settings-shared.ts).

export async function readSettings(ctx: ApiContext): Promise<AppSettings> {
  const rows =
    await ctx.sql`SELECT settings->'app' AS app FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}`;
  return resolveSettings(rows[0]?.app);
}

export async function saveSetting(ctx: ApiContext, key: unknown, body: Record<string, unknown>) {
  if (typeof key !== "string" || !(key in SETTING_DEFINITIONS)) throw new ApiError("Einstellung ist unbekannt.");
  const settingKey = key as SettingKey;
  const definition = SETTING_DEFINITIONS[settingKey];
  const before = await readSettings(ctx);
  const enabled = typeof body.enabled === "boolean" ? body.enabled : before[settingKey].enabled;
  let value = before[settingKey].value;
  if (definition.unit && body.value !== undefined) {
    const number = Number(body.value);
    if (!Number.isInteger(number) || number < (definition.min ?? 0) || number > (definition.max ?? Infinity))
      throw new ApiError(
        `Bitte einen Wert zwischen ${definition.min} und ${definition.max} ${definition.unit} angeben.`,
      );
    value = number;
  }
  if (enabled && definition.unit && value === null)
    throw new ApiError(`Bitte zuerst einen Wert in ${definition.unit} festlegen.`);
  const next = { ...before, [settingKey]: { enabled, value } };
  await ctx.sql.transaction([
    ctx.sql`
    UPDATE carecore_organizations
    SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{app}', ${JSON.stringify(next)}::jsonb), updated_at = NOW()
    WHERE id = ${ctx.actor.organizationId}`,
    auditStatement(ctx, "setting", ctx.actor.organizationId, settingKey, before[settingKey], next[settingKey]),
  ]);
  return next;
}

export type SystemStatus = {
  databaseMs: number;
  schemaVersion: string | null;
  migrations: number;
  lastMigrationAt: string | null;
  auditEntries30Days: number;
  lastAuditAt: string | null;
};

// Live state of the installation for the "Systemstatus" card.
export async function systemStatus(ctx: ApiContext): Promise<SystemStatus> {
  const started = performance.now();
  await ctx.sql`SELECT 1`;
  const databaseMs = Math.round(performance.now() - started);
  const [migrations, audit] = await Promise.all([
    ctx.sql`SELECT COUNT(*)::int AS count, MAX(version) AS version, MAX(applied_at) AS applied_at FROM carecore_schema_migrations`,
    ctx.sql`
      SELECT COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS recent, MAX(created_at) AS last_at
      FROM carecore_audit_log WHERE organization_id = ${ctx.actor.organizationId}`,
  ]);
  return {
    databaseMs,
    schemaVersion: migrations[0]?.version ? String(migrations[0].version).slice(0, 4) : null,
    migrations: Number(migrations[0]?.count ?? 0),
    lastMigrationAt: iso(migrations[0]?.applied_at),
    auditEntries30Days: Number(audit[0]?.recent ?? 0),
    lastAuditAt: iso(audit[0]?.last_at),
  };
}

import { ApiError, auditStatement, type ApiContext, type Row } from "@/lib/api-context";
import { COUNTRIES, COUNTRY_CODES, countryCode, type CountryCode } from "@/lib/country";
import { hasPermission } from "@/lib/server-data";

// Land der Einrichtung lesen und (Administration) festlegen.
export async function organizationCountry(ctx: Pick<ApiContext, "sql" | "actor">): Promise<CountryCode> {
  const rows = (await ctx.sql`
    SELECT country FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}`) as Row[];
  return countryCode(rows[0]?.country);
}

export async function countrySettings(ctx: ApiContext) {
  const rows = (await ctx.sql`
    SELECT country, country_set_at FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}`) as Row[];
  return { country: countryCode(rows[0]?.country), confirmed: Boolean(rows[0]?.country_set_at) };
}

// Speichert das Land und ergänzt die üblichen Qualifikationen des Landes (bestehende bleiben unverändert).
export async function saveOrganizationCountry(ctx: ApiContext, value: unknown) {
  if (!hasPermission(ctx.actor, "administration.manage"))
    throw new ApiError("Das Land der Einrichtung legt die Administration fest.", 403);
  if (!COUNTRY_CODES.includes(value as CountryCode))
    throw new ApiError("Bitte Schweiz, Deutschland oder Österreich wählen.");
  const country = value as CountryCode;
  const before = await countrySettings(ctx);
  const org = ctx.actor.organizationId;
  await ctx.sql.transaction([
    ctx.sql`UPDATE carecore_organizations SET country = ${country}, country_set_at = NOW(), updated_at = NOW()
      WHERE id = ${org}`,
    ...COUNTRIES[country].qualifications.map(
      (q) => ctx.sql`INSERT INTO carecore_qualifications (organization_id, code, name, grants_medication)
        VALUES (${org}, ${q.code}, ${q.name}, ${q.grantsMedication}) ON CONFLICT (organization_id, code) DO NOTHING`,
    ),
    auditStatement(ctx, "organization", org, "country_updated", { country: before.country }, { country }),
  ]);
  return { country, confirmed: true };
}

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

// Shared helpers for the module APIs (medication, vital signs, ...).

export type Sql = ReturnType<typeof carecoreDb>;
export type Row = Record<string, unknown>;
export type ApiContext = { actor: CarecoreActor & { organizationId: string }; sql: Sql };

// Thrown for invalid input or violated rules; routes turn it into a 4xx response.
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// Signed-in actor with an organization and the given permission, or the error response to return.
export async function apiContext(permission: Permission): Promise<ApiContext | NextResponse> {
  const actor = await carecoreActor();
  if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!actor.organizationId) return NextResponse.json({ error: "Keine Organisation zugeordnet." }, { status: 400 });
  if (!hasPermission(actor, permission)) return forbidden();
  return { actor: actor as ApiContext["actor"], sql: carecoreDb() };
}

export function apiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

const UUID = /^[0-9a-f-]{36}$/i;

export function assertUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new ApiError(`${label} ist ungültig.`);
  return value;
}

export async function assertResident({ sql, actor }: ApiContext, residentId: unknown) {
  const id = assertUuid(residentId, "Bewohner");
  const rows =
    await sql`SELECT id FROM carecore_residents WHERE id = ${id} AND organization_id = ${actor.organizationId} LIMIT 1`;
  if (!rows[0]) throw new ApiError("Bewohner nicht gefunden.", 404);
  return id;
}

export async function writeAudit(
  ctx: ApiContext,
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

export const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
export const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : value ? String(value) : null);
export const num = (value: unknown) => (value === null || value === undefined || value === "" ? null : Number(value));

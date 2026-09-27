import { cookies } from "next/headers";
import { hashPassword, hashSessionToken, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { ApiError, iso, type Row } from "@/lib/api-context";
import { carecoreDb, type CarecoreActor } from "@/lib/server-data";
import {
  NOTIFY_CATEGORIES,
  START_PAGES,
  resolvePreferences,
  type NotifyCategory,
  type UserPreferences,
  type UserSettings,
} from "@/lib/user-settings-shared";

// Personal settings of the signed-in person: profile, notifications, appearance,
// password and sessions.

async function currentTokenHash() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashSessionToken(token) : null;
}

// Short device description from the browser's user agent, e.g. "Safari · iPhone".
function device(userAgent: unknown) {
  const ua = typeof userAgent === "string" ? userAgent : "";
  if (!ua) return "Unbekanntes Gerät";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const system = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  return [browser, system].filter(Boolean).join(" · ");
}

export async function readPreferences(userId: string): Promise<UserPreferences> {
  const rows = await carecoreDb()`SELECT preferences FROM carecore_user_profiles WHERE user_id = ${userId}`;
  return resolvePreferences(rows[0]?.preferences);
}

export async function userSettings(actor: CarecoreActor): Promise<UserSettings> {
  const sql = carecoreDb();
  const [profileRows, sessions, tokenHash] = await Promise.all([
    sql`
      SELECT u.display_name, u.username, u.password_changed_at, COALESCE(p.job_title, '') AS job_title,
        COALESCE(p.phone, '') AS phone, p.preferences, cu.name AS care_unit, COALESCE(r.name, u.role) AS role_name
      FROM carecore_users u
      LEFT JOIN carecore_user_profiles p ON p.user_id = u.id
      LEFT JOIN carecore_care_units cu ON cu.id = p.primary_care_unit_id
      LEFT JOIN carecore_roles r ON r.key = u.role
      WHERE u.id = ${actor.id}`,
    sql`
      SELECT id, token_hash, user_agent, created_at, expires_at FROM carecore_sessions
      WHERE user_id = ${actor.id} AND expires_at > NOW() ORDER BY created_at DESC`,
    currentTokenHash(),
  ]);
  const row = (profileRows[0] ?? {}) as Row;
  return {
    profile: {
      displayName: String(row.display_name ?? actor.display_name),
      username: String(row.username ?? actor.username),
      jobTitle: String(row.job_title ?? ""),
      phone: String(row.phone ?? ""),
      roleName: String(row.role_name ?? actor.role),
      permissions: actor.permissions,
      careUnit: row.care_unit ? String(row.care_unit) : null,
    },
    preferences: resolvePreferences(row.preferences),
    security: {
      passwordChangedAt: iso(row.password_changed_at),
      sessions: (sessions as Row[]).map((session) => ({
        id: String(session.id),
        device: device(session.user_agent),
        createdAt: iso(session.created_at) ?? "",
        expiresAt: iso(session.expires_at) ?? "",
        current: session.token_hash === tokenHash,
      })),
    },
  };
}

export async function savePreferences(actor: CarecoreActor, body: Record<string, unknown>) {
  const current = await readPreferences(actor.id);
  const notifyInput = body.notify && typeof body.notify === "object" ? (body.notify as Record<string, unknown>) : {};
  const next = resolvePreferences({
    notify: Object.fromEntries(
      (Object.keys(NOTIFY_CATEGORIES) as NotifyCategory[]).map((key) => [
        key,
        typeof notifyInput[key] === "boolean" ? notifyInput[key] : current.notify[key],
      ]),
    ),
    textSize: body.textSize ?? current.textSize,
    contrast: body.contrast ?? current.contrast,
    startPage: typeof body.startPage === "string" && body.startPage in START_PAGES ? body.startPage : current.startPage,
  });
  await carecoreDb()`
    UPDATE carecore_user_profiles
    SET preferences = COALESCE(preferences, '{}'::jsonb) || ${JSON.stringify(next)}::jsonb, updated_at = NOW()
    WHERE user_id = ${actor.id}`;
  return next;
}

// A new password ends every other session, so a leaked password cannot stay in use elsewhere.
export async function changePassword(actor: CarecoreActor, body: Record<string, unknown>) {
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (newPassword.length < 10) throw new ApiError("Das neue Passwort muss mindestens 10 Zeichen lang sein.");
  if (newPassword.length > 200) throw new ApiError("Das neue Passwort ist zu lang.");
  if (newPassword === currentPassword) throw new ApiError("Das neue Passwort muss sich vom bisherigen unterscheiden.");
  const sql = carecoreDb();
  const rows = await sql`SELECT password_hash FROM carecore_users WHERE id = ${actor.id} AND active`;
  if (!rows[0] || !(await verifyPassword(currentPassword, String(rows[0].password_hash))))
    throw new ApiError("Das aktuelle Passwort ist nicht korrekt.", 403);
  const tokenHash = await currentTokenHash();
  await sql.transaction([
    sql`UPDATE carecore_users SET password_hash = ${await hashPassword(newPassword)}, password_changed_at = NOW(), updated_at = NOW()
      WHERE id = ${actor.id}`,
    sql`DELETE FROM carecore_sessions WHERE user_id = ${actor.id} AND token_hash IS DISTINCT FROM ${tokenHash}`,
    sql`INSERT INTO carecore_audit_log (id, organization_id, actor_user_id, entity_type, entity_id, action)
      VALUES (gen_random_uuid(), ${actor.organizationId ?? null}, ${actor.id}, 'user', ${actor.id}, 'password_changed')`,
  ]);
}

// Signs out other devices: one session by id, or all but the current one.
export async function endSessions(actor: CarecoreActor, sessionId: string | null) {
  const tokenHash = await currentTokenHash();
  const sql = carecoreDb();
  const rows = sessionId
    ? await sql`DELETE FROM carecore_sessions WHERE id = ${sessionId} AND user_id = ${actor.id}
        AND token_hash IS DISTINCT FROM ${tokenHash} RETURNING id`
    : await sql`DELETE FROM carecore_sessions WHERE user_id = ${actor.id} AND token_hash IS DISTINCT FROM ${tokenHash} RETURNING id`;
  return rows.length;
}

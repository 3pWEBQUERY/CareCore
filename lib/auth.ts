import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

export const SESSION_COOKIE = "carecore_session";
const SESSION_DAYS = 7;
const ADMIN_PASSWORD_HASH = "scrypt:01a0fdc66a4455589c11381adeb7f306:653cb4f3ad74171c86dd33e71582ab3cca7c7f75734302e64fac4cc60c99033911bb3f981397df4e0049ccbc72a1d40adf5824bcb710ee1e4c8c4ea537ba372f";
const scrypt = promisify(scryptCallback);

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  password_hash: string;
};

export type AuthenticatedUser = Omit<UserRow, "password_hash">;

let schemaPromise: Promise<void> | null = null;

function database() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  return neon(connectionString);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, salt, storedHash] = encodedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !storedHash) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function ensureAuthSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = database();
      await sql`
        CREATE TABLE IF NOT EXISTS carecore_users (
          id UUID PRIMARY KEY,
          username VARCHAR(80) NOT NULL UNIQUE,
          display_name VARCHAR(120) NOT NULL,
          role VARCHAR(40) NOT NULL DEFAULT 'user',
          password_hash TEXT NOT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS carecore_users_username_lower_idx ON carecore_users (LOWER(username))`;
      await sql`
        CREATE TABLE IF NOT EXISTS carecore_sessions (
          id UUID PRIMARY KEY,
          token_hash CHAR(64) NOT NULL UNIQUE,
          user_id UUID NOT NULL REFERENCES carecore_users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS carecore_sessions_expiry_idx ON carecore_sessions (expires_at)`;
      await sql`
        INSERT INTO carecore_users (id, username, display_name, role, password_hash)
        VALUES ('00000000-0000-4000-8000-000000000001', 'Admin', 'CareCore Administrator', 'admin', ${ADMIN_PASSWORD_HASH})
        ON CONFLICT DO NOTHING
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export async function authenticate(username: string, password: string): Promise<AuthenticatedUser | null> {
  await ensureAuthSchema();
  const sql = database();
  const rows = await sql`
    SELECT id, username, display_name, role, password_hash
    FROM carecore_users
    WHERE LOWER(username) = LOWER(${username.trim()}) AND active = TRUE
    LIMIT 1
  ` as unknown as UserRow[];
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) return null;
  const { password_hash: _passwordHash, ...safeUser } = user;
  void _passwordHash;
  return safeUser;
}

export async function createSession(userId: string) {
  await ensureAuthSchema();
  const sql = database();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`DELETE FROM carecore_sessions WHERE expires_at <= NOW()`;
  await sql`
    INSERT INTO carecore_sessions (id, token_hash, user_id, expires_at)
    VALUES (${randomUUID()}, ${hashSessionToken(token)}, ${userId}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt };
}

export async function getSessionUser(token: string | undefined): Promise<AuthenticatedUser | null> {
  if (!token) return null;
  await ensureAuthSchema();
  const sql = database();
  const rows = await sql`
    SELECT u.id, u.username, u.display_name, u.role
    FROM carecore_sessions s
    JOIN carecore_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashSessionToken(token)}
      AND s.expires_at > NOW()
      AND u.active = TRUE
    LIMIT 1
  ` as unknown as AuthenticatedUser[];
  return rows[0] ?? null;
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;
  await ensureAuthSchema();
  const sql = database();
  await sql`DELETE FROM carecore_sessions WHERE token_hash = ${hashSessionToken(token)}`;
}

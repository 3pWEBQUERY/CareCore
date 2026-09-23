import { neon } from "@neondatabase/serverless";

export type CareUnit = { id: string; name: string; detail: string; residentCount: number; primary: boolean };
export type ContextResident = { id: string; initials: string; name: string; room: string; careUnitId: string; group: string; status: string; tone: "stable" | "attention" | "critical" | "info" };
export type WorkContext = {
  profile: { displayName: string; jobTitle: string; phone: string; role: string; primaryCareUnitId: string | null; primaryCareUnitName: string | null; organizationName: string };
  careUnits: CareUnit[];
  residents: ContextResident[];
};

let schemaPromise: Promise<void> | null = null;

function database() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  return neon(connectionString);
}

async function ensureWorkContextSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = database();
      await sql`CREATE TABLE IF NOT EXISTS carecore_organizations (id UUID PRIMARY KEY, name VARCHAR(180) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`CREATE TABLE IF NOT EXISTS carecore_sites (id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE, name VARCHAR(180) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (organization_id, name))`;
      await sql`CREATE TABLE IF NOT EXISTS carecore_care_units (id UUID PRIMARY KEY, site_id UUID NOT NULL REFERENCES carecore_sites(id) ON DELETE CASCADE, name VARCHAR(160) NOT NULL, floor VARCHAR(80), capacity SMALLINT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (site_id, name))`;
      await sql`CREATE TABLE IF NOT EXISTS carecore_rooms (id UUID PRIMARY KEY, care_unit_id UUID NOT NULL REFERENCES carecore_care_units(id) ON DELETE CASCADE, name VARCHAR(80) NOT NULL, room_number VARCHAR(32), beds SMALLINT NOT NULL DEFAULT 1, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (care_unit_id, name))`;
      await sql`CREATE TABLE IF NOT EXISTS carecore_user_profiles (user_id UUID PRIMARY KEY REFERENCES carecore_users(id) ON DELETE CASCADE, organization_id UUID REFERENCES carecore_organizations(id) ON DELETE SET NULL, job_title VARCHAR(140), phone VARCHAR(60), primary_care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL, locale VARCHAR(16) NOT NULL DEFAULT 'de-CH', preferences JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`ALTER TABLE carecore_user_profiles ADD COLUMN IF NOT EXISTS primary_care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL`;
      await sql`CREATE TABLE IF NOT EXISTS carecore_user_unit_assignments (user_id UUID NOT NULL REFERENCES carecore_users(id) ON DELETE CASCADE, care_unit_id UUID NOT NULL REFERENCES carecore_care_units(id) ON DELETE CASCADE, assignment_role VARCHAR(80) NOT NULL DEFAULT 'member', is_primary BOOLEAN NOT NULL DEFAULT FALSE, starts_on DATE, ends_on DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (user_id, care_unit_id))`;
      await sql`CREATE TABLE IF NOT EXISTS carecore_residents (id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE RESTRICT, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'active', risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`CREATE TABLE IF NOT EXISTS carecore_resident_stays (id UUID PRIMARY KEY, resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE, care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL, room_id UUID REFERENCES carecore_rooms(id) ON DELETE SET NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ended_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`CREATE INDEX IF NOT EXISTS carecore_work_context_stays_idx ON carecore_resident_stays (care_unit_id, started_at DESC) WHERE ended_at IS NULL`;
    })().catch((error) => { schemaPromise = null; throw error; });
  }
  await schemaPromise;
}

async function seedDemoContext(userId: string) {
  const sql = database();
  const organizationId = "00000000-0000-4000-8000-000000000101";
  const siteId = "00000000-0000-4000-8000-000000000102";
  const unitRows = [
    ["00000000-0000-4000-8000-000000000201", "Wohnbereich 1", "EG"],
    ["00000000-0000-4000-8000-000000000202", "Wohnbereich 2", "1. OG"],
    ["00000000-0000-4000-8000-000000000203", "Wohnbereich 3", "2. OG"],
    ["00000000-0000-4000-8000-000000000204", "Pflegewohngruppe", "EG"],
  ] as const;
  await sql`INSERT INTO carecore_organizations (id, name) VALUES (${organizationId}, 'Alterszentrum Sonnengarten') ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO carecore_sites (id, organization_id, name) VALUES (${siteId}, ${organizationId}, 'Alterszentrum Sonnengarten') ON CONFLICT (id) DO NOTHING`;
  for (const [id, name, floor] of unitRows) await sql`INSERT INTO carecore_care_units (id, site_id, name, floor, capacity) VALUES (${id}, ${siteId}, ${name}, ${floor}, 12) ON CONFLICT (id) DO NOTHING`;
  const rooms = [["00000000-0000-4000-8000-000000000301", unitRows[0][0], "Zimmer 101"], ["00000000-0000-4000-8000-000000000302", unitRows[1][0], "Zimmer 207"], ["00000000-0000-4000-8000-000000000303", unitRows[1][0], "Zimmer 204"], ["00000000-0000-4000-8000-000000000304", unitRows[2][0], "Zimmer 301"], ["00000000-0000-4000-8000-000000000305", unitRows[3][0], "Zimmer 12"]] as const;
  for (const [id, careUnitId, name] of rooms) await sql`INSERT INTO carecore_rooms (id, care_unit_id, name, room_number) VALUES (${id}, ${careUnitId}, ${name}, ${name.replace('Zimmer ', '')}) ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO carecore_user_profiles (user_id, organization_id, job_title, phone, primary_care_unit_id) VALUES (${userId}, ${organizationId}, 'Pflegefachfrau HF', '+41 79 555 12 34', ${unitRows[1][0]}) ON CONFLICT (user_id) DO UPDATE SET organization_id = COALESCE(carecore_user_profiles.organization_id, EXCLUDED.organization_id), job_title = COALESCE(NULLIF(carecore_user_profiles.job_title, ''), EXCLUDED.job_title), phone = COALESCE(NULLIF(carecore_user_profiles.phone, ''), EXCLUDED.phone), updated_at = NOW()`;
  await sql`INSERT INTO carecore_user_unit_assignments (user_id, care_unit_id, assignment_role, is_primary) VALUES (${userId}, ${unitRows[1][0]}, 'Pflegefachperson', TRUE) ON CONFLICT (user_id, care_unit_id) DO UPDATE SET is_primary = TRUE`;
  const residentRows = [
    ["00000000-0000-4000-8000-000000000401", "00000000-0000-4000-8000-000000000501", "Hans", "Müller", unitRows[1][0], rooms[1][0], "Sturzrisiko", "critical"],
    ["00000000-0000-4000-8000-000000000402", "00000000-0000-4000-8000-000000000502", "Maria", "Keller", unitRows[1][0], rooms[2][0], "Diabetes", "attention"],
    ["00000000-0000-4000-8000-000000000403", "00000000-0000-4000-8000-000000000503", "Erika", "Meier", unitRows[1][0], rooms[1][0], "Stabil", "stable"],
    ["00000000-0000-4000-8000-000000000404", "00000000-0000-4000-8000-000000000504", "Peter", "Aebischer", unitRows[0][0], rooms[0][0], "Beobachtung", "info"],
    ["00000000-0000-4000-8000-000000000405", "00000000-0000-4000-8000-000000000505", "Walter", "Brunner", unitRows[2][0], rooms[3][0], "Stabil", "stable"],
    ["00000000-0000-4000-8000-000000000406", "00000000-0000-4000-8000-000000000506", "Anna", "Berger", unitRows[3][0], rooms[4][0], "Stabil", "stable"],
  ] as const;
  for (const [id, stayId, firstName, lastName, careUnitId, roomId, flag, tone] of residentRows) {
    await sql`INSERT INTO carecore_residents (id, organization_id, first_name, last_name, status, risk_flags) VALUES (${id}, ${organizationId}, ${firstName}, ${lastName}, 'active', ${JSON.stringify([{ label: flag, tone }])}::jsonb) ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO carecore_resident_stays (id, resident_id, care_unit_id, room_id) VALUES (${stayId}, ${id}, ${careUnitId}, ${roomId}) ON CONFLICT (id) DO NOTHING`;
  }
}

export async function getWorkContext(userId: string): Promise<WorkContext> {
  await ensureWorkContextSchema();
  await seedDemoContext(userId);
  const sql = database();
  const profileRows = await sql`SELECT u.display_name, u.role, COALESCE(p.job_title, 'Mitarbeitende:r') AS job_title, COALESCE(p.phone, '') AS phone, p.primary_care_unit_id, cu.name AS primary_care_unit_name, COALESCE(o.name, 'CareCore') AS organization_name FROM carecore_users u LEFT JOIN carecore_user_profiles p ON p.user_id = u.id LEFT JOIN carecore_care_units cu ON cu.id = p.primary_care_unit_id LEFT JOIN carecore_organizations o ON o.id = p.organization_id WHERE u.id = ${userId} LIMIT 1` as unknown as Array<{ display_name: string; role: string; job_title: string; phone: string; primary_care_unit_id: string | null; primary_care_unit_name: string | null; organization_name: string }>;
  const unitRows = await sql`SELECT cu.id, cu.name, COALESCE(cu.floor, '') AS floor, COUNT(rs.id)::int AS resident_count FROM carecore_care_units cu LEFT JOIN carecore_resident_stays rs ON rs.care_unit_id = cu.id AND rs.ended_at IS NULL LEFT JOIN carecore_residents r ON r.id = rs.resident_id AND r.status = 'active' WHERE cu.active = TRUE GROUP BY cu.id, cu.name, cu.floor ORDER BY cu.name` as unknown as Array<{ id: string; name: string; floor: string; resident_count: number }>;
  const residentRows = await sql`SELECT r.id, r.first_name, r.last_name, r.status, cu.id AS care_unit_id, cu.name AS care_unit_name, COALESCE(room.name, 'Ohne Zimmer') AS room, COALESCE(r.risk_flags->0->>'label', 'Stabil') AS flag, COALESCE(r.risk_flags->0->>'tone', 'stable') AS tone FROM carecore_residents r JOIN LATERAL (SELECT * FROM carecore_resident_stays WHERE resident_id = r.id ORDER BY started_at DESC LIMIT 1) rs ON TRUE LEFT JOIN carecore_care_units cu ON cu.id = rs.care_unit_id LEFT JOIN carecore_rooms room ON room.id = rs.room_id WHERE r.status = 'active' ORDER BY cu.name, r.last_name, r.first_name` as unknown as Array<{ id: string; first_name: string; last_name: string; status: string; care_unit_id: string; care_unit_name: string; room: string; flag: string; tone: ContextResident["tone"] }>;
  const profile = profileRows[0];
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  return {
    profile: { displayName: profile.display_name, jobTitle: profile.job_title, phone: profile.phone, role: profile.role, primaryCareUnitId: profile.primary_care_unit_id, primaryCareUnitName: profile.primary_care_unit_name, organizationName: profile.organization_name },
    careUnits: unitRows.map((unit) => ({ id: unit.id, name: unit.name, detail: `${unit.floor || 'Wohnbereich'} · ${unit.resident_count} Bewohner`, residentCount: Number(unit.resident_count), primary: unit.id === profile.primary_care_unit_id })),
    residents: residentRows.map((resident) => ({ id: resident.id, initials: `${resident.first_name[0] ?? ''}${resident.last_name[0] ?? ''}`.toUpperCase(), name: `${resident.first_name} ${resident.last_name}`, room: resident.room, careUnitId: resident.care_unit_id, group: resident.care_unit_name, status: resident.flag, tone: ["stable", "attention", "critical", "info"].includes(resident.tone) ? resident.tone : "info" })),
  };
}

export async function updateWorkContext(userId: string, input: { primaryCareUnitId?: string; jobTitle?: string; phone?: string }) {
  await ensureWorkContextSchema();
  await seedDemoContext(userId);
  const sql = database();
  if (input.primaryCareUnitId !== undefined) {
    const units = await sql`SELECT id FROM carecore_care_units WHERE id = ${input.primaryCareUnitId} AND active = TRUE LIMIT 1` as unknown as Array<{ id: string }>;
    if (!units[0]) throw new Error("CARE_UNIT_NOT_FOUND");
    await sql`UPDATE carecore_user_profiles SET primary_care_unit_id = ${input.primaryCareUnitId}, updated_at = NOW() WHERE user_id = ${userId}`;
    await sql`UPDATE carecore_user_unit_assignments SET is_primary = FALSE WHERE user_id = ${userId}`;
    await sql`INSERT INTO carecore_user_unit_assignments (user_id, care_unit_id, assignment_role, is_primary) VALUES (${userId}, ${input.primaryCareUnitId}, 'Mitarbeitende:r', TRUE) ON CONFLICT (user_id, care_unit_id) DO UPDATE SET is_primary = TRUE, ends_on = NULL`;
  }
  if (input.jobTitle !== undefined || input.phone !== undefined) await sql`UPDATE carecore_user_profiles SET job_title = COALESCE(${input.jobTitle ?? null}, job_title), phone = COALESCE(${input.phone ?? null}, phone), updated_at = NOW() WHERE user_id = ${userId}`;
  return getWorkContext(userId);
}

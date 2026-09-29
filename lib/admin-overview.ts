import { iso, type ApiContext, type Row } from "@/lib/api-context";
import { SERVICES } from "@/lib/organization-shared";
import { readSettings } from "@/lib/settings";
import { SETTING_DEFINITIONS, type SettingKey } from "@/lib/settings-shared";

// Lower part of the administration pages: development of the last six weeks,
// open administrative to-dos and the change log.

export type AdminView = "organization" | "users" | "configuration";
type Tone = "stable" | "attention" | "critical" | "info";

export type AdminPriority = { id: string; title: string; detail: string; tone: Tone; href: string };
export type AdminLogEntry = {
  id: string;
  at: string;
  actor: string;
  area: string;
  action: string;
  subject: string;
  changes: Array<{ field: string; before: string; after: string }>;
  href: string | null;
};
export type AdminOverview = {
  trend: { title: string; subtitle: string; labels: [string, string, string]; series: number[][]; weeks: string[] };
  priorities: AdminPriority[];
  log: AdminLogEntry[];
};

const ENTITY: Record<string, { area: string; href: string | null }> = {
  site: { area: "Standort", href: "/leitung/administration" },
  care_unit: { area: "Wohnbereich", href: "/leitung/administration" },
  user: { area: "Mitarbeiter", href: "/leitung/administration/mitarbeiter" },
  role: { area: "Rolle", href: "/leitung/administration/mitarbeiter" },
  setting: { area: "Einstellung", href: "/leitung/administration/konfiguration" },
  support_request: { area: "Problemmeldung", href: null },
  care_supply_product: { area: "Pflegeprodukt", href: "/leitung/administration/pflegebedarf" },
  resident: { area: "Bewohner", href: "/bewohner" },
  resident_document: { area: "Dokument", href: "/bewohner" },
  shared_file: { area: "Ablage", href: "/carecore-one/ablage" },
  documentation_entry: { area: "Pflegebericht", href: "/pflegedokumentation" },
  care_plan: { area: "Pflegeplan", href: "/pflegeplanung" },
  care_goal: { area: "Pflegeziel", href: "/pflegeplanung" },
  intervention: { area: "Massnahme", href: "/pflegeplanung" },
  medication_order: { area: "Verordnung", href: "/medikation" },
  medication_administration: { area: "Medikamentengabe", href: "/medikation/runde" },
  vital_measurements: { area: "Vitalwerte", href: "/vitalwerte/entwicklung" },
  vital_threshold: { area: "Vitalwert-Grenze", href: "/vitalwerte/entwicklung" },
  wound: { area: "Wunde", href: "/wundmanagement" },
  wound_entry: { area: "Wundverlauf", href: "/wundmanagement" },
  wound_photo: { area: "Wundfoto", href: "/wundmanagement" },
  quality_event: { area: "Ereignis", href: "/leitung/qualitaet" },
  quality_action: { area: "Qualitätsmassnahme", href: "/leitung/qualitaet/massnahmen" },
  task: { area: "Aufgabe", href: "/betrieb/aufgaben" },
  handover: { area: "Übergabe", href: "/betrieb/uebergabe" },
  shift: { area: "Dienst", href: "/dienstplan" },
  shift_plan: { area: "Dienstplan", href: "/dienstplan" },
  shift_assignment: { area: "Diensteinteilung", href: "/dienstplan" },
  absence: { area: "Abwesenheit", href: "/dienstplan" },
  training: { area: "Schulung", href: "/personal/schulungen" },
  training_enrollment: { area: "Schulung", href: "/personal/schulungen" },
  training_session: { area: "Schulungstermin", href: "/personal/schulungen" },
  training_evidence: { area: "Schulungsnachweis", href: "/personal/schulungen" },
  team_post: { area: "Teambeitrag", href: "/personal/team" },
  team_channel: { area: "Teamkanal", href: "/personal/team" },
  assessment_record: { area: "Einschätzung", href: "/einschaetzungen" },
  fluid_entry: { area: "Trinkprotokoll", href: "/ernaehrung/trinkprotokoll" },
  meal_entry: { area: "Mahlzeit", href: "/ernaehrung" },
};

const ACTIONS: Record<string, string> = {
  create: "erstellt",
  created: "erstellt",
  update: "geändert",
  updated: "geändert",
  edited: "bearbeitet",
  archived: "archiviert",
  cancelled: "abgesagt",
  completed: "abgeschlossen",
  removed: "entfernt",
  uploaded: "hochgeladen",
  shared: "geteilt",
  deleted: "gelöscht",
  reported: "gemeldet",
  recorded: "erfasst",
  documented: "dokumentiert",
  saved: "gespeichert",
  assigned: "zugewiesen",
  confirmed: "bestätigt",
  requested: "beantragt",
  rejected: "abgelehnt",
  withdrawn: "zurückgezogen",
  planned: "geplant",
  verified: "bestätigt",
  enrolled: "angemeldet",
  acknowledged: "gelesen",
  hidden: "ausgeblendet",
  checked_in: "eingestempelt",
  checked_out: "ausgestempelt",
  prn_administered: "Reservegabe",
  medication_allergies_updated: "Allergien geändert",
  master_data_updated: "Stammdaten geändert",
  resuscitation_updated: "Reanimationsstatus geändert",
  admitted: "aufgenommen",
  master_data_checked: "Stammdaten geprüft",
  stay_discharged: "Austritt",
  stay_returned: "Rückkehr",
  stay_transferred: "Verlegung",
  stay_deceased: "Todesfall",
  stay_hospital: "Spitalaufenthalt",
  stay_absent: "Abwesenheit",
};

const STATUS: Record<string, string> = {
  active: "aktiv",
  open: "offen",
  in_progress: "in Bearbeitung",
  done: "erledigt",
  completed: "abgeschlossen",
  resolved: "erledigt",
  closed: "geschlossen",
  paused: "pausiert",
  stopped: "abgesetzt",
  cancelled: "abgebrochen",
  healed: "abgeheilt",
  healing: "in Heilung",
  review: "zur Überprüfung",
  archived: "archiviert",
  achieved: "erreicht",
};

function actionLabel(action: string) {
  if (ACTIONS[action]) return ACTIONS[action];
  if (action.startsWith("status_")) {
    const status = action.slice(7);
    return `Status: ${STATUS[status] ?? status.replaceAll("_", " ")}`;
  }
  if (action.startsWith("stay_")) return `Aufenthalt: ${action.slice(5).replaceAll("_", " ")}`;
  return action.replaceAll("_", " ");
}

const FIELDS: Record<string, string> = {
  name: "Bezeichnung",
  code: "Kürzel",
  floor: "Etage",
  capacity: "Kapazität",
  services: "Dienste",
  notes: "Hinweis",
  active: "Aktiv",
  leadId: "Leitung",
  lead_user_id: "Leitung",
  managerId: "Leitung",
  manager_user_id: "Leitung",
  siteType: "Standorttyp",
  site_type: "Standorttyp",
  country: "Land",
  addressLine1: "Adresse",
  address_line1: "Adresse",
  postalCode: "PLZ",
  postal_code: "PLZ",
  city: "Ort",
  status: "Status",
  enabled: "Eingeschaltet",
  value: "Wert",
  role: "Rolle",
  category: "Kategorie",
  unit: "Einheit",
  stock: "Bestand",
  minStock: "Mindestbestand",
  title: "Titel",
  displayName: "Name",
  jobTitle: "Funktion",
  permissions: "Berechtigungen",
};

const SKIP = new Set([
  "id",
  "site_id",
  "siteId",
  "organization_id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
]);

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  if (typeof value === "string" && value in SERVICES) return SERVICES[value as keyof typeof SERVICES];
  if (typeof value === "boolean") return value ? "ja" : "nein";
  if (Array.isArray(value)) return value.map(show).join(", ") || "–";
  if (typeof value === "object") return JSON.stringify(value).slice(0, 60);
  return String(value).slice(0, 80);
}

// Normalises snake_case and camelCase keys so before (row) and after (input) can be compared.
const norm = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

function changes(before: unknown, after: unknown) {
  const b = before && typeof before === "object" ? (before as Record<string, unknown>) : null;
  const a = after && typeof after === "object" ? (after as Record<string, unknown>) : null;
  if (!a) return [];
  const previous = new Map(Object.entries(b ?? {}).map(([key, value]) => [norm(key), value]));
  return Object.entries(a)
    .filter(([key]) => !SKIP.has(key))
    .filter(([key, value]) => !b || show(previous.get(norm(key))) !== show(value))
    .slice(0, 8)
    .map(([key, value]) => ({
      field: FIELDS[key] ?? FIELDS[norm(key)] ?? key,
      before: b ? show(previous.get(norm(key))) : "–",
      after: show(value),
    }));
}

function subject(row: Row) {
  if (row.entity_type === "setting") return SETTING_DEFINITIONS[row.action as SettingKey]?.title ?? String(row.action);
  for (const data of [row.after_data, row.before_data])
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      const value = record.name ?? record.title ?? record.displayName ?? record.display_name ?? record.username;
      if (typeof value === "string" && value) return value;
    }
  return "";
}

const VIEW_TYPES: Record<AdminView, string[] | null> = {
  organization: ["site", "care_unit"],
  users: ["user", "role"],
  configuration: null,
};

export async function adminOverview(ctx: ApiContext, view: AdminView): Promise<AdminOverview> {
  const org = ctx.actor.organizationId;
  const types = VIEW_TYPES[view];
  const [weeks, logRows, todo, settings] = await Promise.all([
    trendRows(ctx, view),
    ctx.sql`
      SELECT a.id, a.created_at, a.entity_type, a.action, a.before_data, a.after_data, COALESCE(u.display_name, 'System') AS actor
      FROM carecore_audit_log a LEFT JOIN carecore_users u ON u.id = a.actor_user_id
      LEFT JOIN carecore_user_profiles p ON p.user_id = a.actor_user_id
      WHERE (a.organization_id = ${org} OR (a.organization_id IS NULL AND p.organization_id = ${org}))
        AND (${types === null} OR a.entity_type = ANY(${types ?? []}))
      ORDER BY a.created_at DESC LIMIT 40` as Promise<Row[]>,
    ctx.sql`
      SELECT
        (SELECT COUNT(*) FROM carecore_care_units cu JOIN carecore_sites si ON si.id = cu.site_id
          WHERE si.organization_id = ${org} AND cu.active AND cu.lead_user_id IS NULL)::int AS units_without_lead,
        (SELECT COUNT(*) FROM carecore_care_units cu JOIN carecore_sites si ON si.id = cu.site_id
          WHERE si.organization_id = ${org} AND cu.active AND cu.capacity IS NOT NULL AND cu.capacity < (
            SELECT COUNT(*) FROM carecore_resident_stays st JOIN carecore_residents r ON r.id = st.resident_id
            WHERE st.care_unit_id = cu.id AND st.ended_at IS NULL AND r.status = 'active'))::int AS overbooked,
        (SELECT COUNT(*) FROM carecore_users u JOIN carecore_user_profiles p ON p.user_id = u.id
          WHERE p.organization_id = ${org} AND u.active AND u.archived_at IS NULL AND p.primary_care_unit_id IS NULL
            AND NOT EXISTS (SELECT 1 FROM carecore_user_unit_assignments a WHERE a.user_id = u.id))::int AS staff_without_unit,
        (SELECT COUNT(*) FROM carecore_users u JOIN carecore_user_profiles p ON p.user_id = u.id
          WHERE p.organization_id = ${org} AND u.active AND u.archived_at IS NULL AND p.last_seen_at IS NULL
            AND u.created_at < NOW() - INTERVAL '7 days')::int AS never_signed_in,
        (SELECT COUNT(*) FROM carecore_residents r WHERE r.organization_id = ${org} AND r.status = 'active'
          AND NOT EXISTS (SELECT 1 FROM carecore_resident_stays st WHERE st.resident_id = r.id AND st.ended_at IS NULL
            AND st.care_unit_id IS NOT NULL))::int AS residents_without_unit,
        (SELECT COUNT(*) FROM carecore_care_supply_products WHERE organization_id = ${org} AND status = 'active'
          AND min_stock_quantity > 0 AND current_stock_quantity <= min_stock_quantity)::int AS supplies_low` as Promise<
      Row[]
    >,
    readSettings(ctx),
  ]);

  const counts = todo[0] ?? {};
  const priorities: AdminPriority[] = [];
  const add = (count: unknown, item: Omit<AdminPriority, "id" | "detail"> & { detail: (n: number) => string }) => {
    const n = Number(count ?? 0);
    if (n) priorities.push({ ...item, id: item.title, detail: item.detail(n), href: `/c${item.href}` });
  };
  add(counts.overbooked, {
    title: "Überbelegung prüfen",
    detail: (n) => `${n} Wohnbereich${n === 1 ? "" : "e"} über der Kapazität`,
    tone: "critical",
    href: "/leitung/administration",
  });
  add(counts.residents_without_unit, {
    title: "Bewohner ohne Wohnbereich",
    detail: (n) => `${n} Bewohner einem Wohnbereich zuteilen`,
    tone: "critical",
    href: "/bewohner",
  });
  add(counts.supplies_low, {
    title: "Pflegebedarf nachbestellen",
    detail: (n) => `${n} Produkt${n === 1 ? "" : "e"} am Mindestbestand`,
    tone: "attention",
    href: "/leitung/administration/pflegebedarf",
  });
  add(counts.units_without_lead, {
    title: "Bereichsleitung festlegen",
    detail: (n) => `${n} Wohnbereich${n === 1 ? "" : "e"} ohne Leitung`,
    tone: "attention",
    href: "/leitung/administration",
  });
  add(counts.staff_without_unit, {
    title: "Mitarbeitende zuteilen",
    detail: (n) => `${n} Profil${n === 1 ? "" : "e"} ohne Arbeitsbereich`,
    tone: "attention",
    href: "/leitung/administration/mitarbeiter",
  });
  add(counts.never_signed_in, {
    title: "Zugang nie genutzt",
    detail: (n) => `${n} Profil${n === 1 ? "" : "e"} seit über 7 Tagen ohne Anmeldung`,
    tone: "info",
    href: "/leitung/administration/mitarbeiter",
  });
  const off = (["documentationReminder", "vitalsReminder", "medicationOverdue"] as SettingKey[]).filter(
    (key) => !settings[key].enabled,
  );
  if (off.length)
    priorities.push({
      id: "settings",
      title: "Erinnerungen ausgeschaltet",
      detail: off.map((key) => SETTING_DEFINITIONS[key].title).join(", "),
      tone: "attention",
      href: "/c/leitung/administration/konfiguration",
    });

  const log = logRows.map((row) => {
    const entity = ENTITY[String(row.entity_type)] ?? { area: String(row.entity_type), href: null };
    return {
      id: String(row.id),
      at: iso(row.created_at) ?? "",
      actor: String(row.actor),
      area: entity.area,
      action: row.entity_type === "setting" ? "geändert" : actionLabel(String(row.action)),
      subject: subject(row),
      changes: changes(row.before_data, row.after_data),
      href: entity.href ? `/c${entity.href}` : null,
    };
  });
  // Person ids (e.g. the lead of a care unit) are shown by name.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ids = [
    ...new Set(log.flatMap((entry) => entry.changes.flatMap((change) => [change.before, change.after]))),
  ].filter((value) => UUID.test(value));
  if (ids.length) {
    const people = (await ctx.sql`SELECT id, display_name FROM carecore_users WHERE id = ANY(${ids})`) as Row[];
    const names = new Map(people.map((person) => [String(person.id), String(person.display_name)]));
    for (const change of log.flatMap((entry) => entry.changes)) {
      change.before = names.get(change.before) ?? change.before;
      change.after = names.get(change.after) ?? change.after;
    }
  }
  return { trend: weeks, priorities, log };
}

// Six calendar weeks up to the current one; three series per page.
async function trendRows(ctx: ApiContext, view: AdminView): Promise<AdminOverview["trend"]> {
  const org = ctx.actor.organizationId;
  const rows = (
    view === "organization"
      ? ctx.sql`
          WITH weeks AS (SELECT generate_series(date_trunc('week', NOW()) - INTERVAL '5 weeks', date_trunc('week', NOW()), INTERVAL '1 week') AS start),
          stays AS (SELECT st.* FROM carecore_resident_stays st JOIN carecore_residents r ON r.id = st.resident_id WHERE r.organization_id = ${org})
          SELECT w.start,
            (SELECT COUNT(*) FROM stays s WHERE s.started_at < LEAST(w.start + INTERVAL '1 week', NOW())
              AND (s.ended_at IS NULL OR s.ended_at >= LEAST(w.start + INTERVAL '1 week', NOW())))::int AS a,
            (SELECT COUNT(*) FROM stays s WHERE s.started_at >= w.start AND s.started_at < w.start + INTERVAL '1 week')::int AS b,
            (SELECT COUNT(*) FROM stays s WHERE s.ended_at >= w.start AND s.ended_at < w.start + INTERVAL '1 week')::int AS c
          FROM weeks w ORDER BY w.start`
      : view === "users"
        ? ctx.sql`
          WITH weeks AS (SELECT generate_series(date_trunc('week', NOW()) - INTERVAL '5 weeks', date_trunc('week', NOW()), INTERVAL '1 week') AS start),
          staff AS (SELECT u.* FROM carecore_users u JOIN carecore_user_profiles p ON p.user_id = u.id WHERE p.organization_id = ${org})
          SELECT w.start,
            (SELECT COUNT(*) FROM staff u WHERE u.created_at < w.start + INTERVAL '1 week'
              AND (u.archived_at IS NULL OR u.archived_at >= w.start + INTERVAL '1 week'))::int AS a,
            (SELECT COUNT(*) FROM staff u WHERE u.created_at >= w.start AND u.created_at < w.start + INTERVAL '1 week')::int AS b,
            (SELECT COUNT(*) FROM carecore_audit_log l WHERE l.entity_type IN ('user', 'role')
              AND l.actor_user_id IN (SELECT id FROM staff)
              AND l.created_at >= w.start AND l.created_at < w.start + INTERVAL '1 week')::int AS c
          FROM weeks w ORDER BY w.start`
        : ctx.sql`
          WITH weeks AS (SELECT generate_series(date_trunc('week', NOW()) - INTERVAL '5 weeks', date_trunc('week', NOW()), INTERVAL '1 week') AS start),
          log AS (SELECT * FROM carecore_audit_log WHERE organization_id = ${org})
          SELECT w.start,
            (SELECT COUNT(*) FROM log l WHERE l.created_at >= w.start AND l.created_at < w.start + INTERVAL '1 week')::int AS a,
            (SELECT COUNT(*) FROM log l WHERE l.entity_type IN ('site', 'care_unit', 'user', 'role', 'setting')
              AND l.created_at >= w.start AND l.created_at < w.start + INTERVAL '1 week')::int AS b,
            (SELECT COUNT(*) FROM log l WHERE l.entity_type = 'setting'
              AND l.created_at >= w.start AND l.created_at < w.start + INTERVAL '1 week')::int AS c
          FROM weeks w ORDER BY w.start`
  ) as Promise<Row[]>;
  const data = await rows;
  const meta: Record<AdminView, { title: string; subtitle: string; labels: [string, string, string] }> = {
    organization: {
      title: "Belegung im Zeitraum",
      subtitle: "Belegte Plätze, Eintritte und Austritte pro Woche",
      labels: ["Belegung", "Eintritte", "Austritte"],
    },
    users: {
      title: "Personal im Zeitraum",
      subtitle: "Aktive Profile, neue Profile und Zugriffsänderungen pro Woche",
      labels: ["Aktiv", "Neu", "Änderungen"],
    },
    configuration: {
      title: "Änderungen im Zeitraum",
      subtitle: "Protokollierte Änderungen pro Woche",
      labels: ["Gesamt", "Verwaltung", "Einstellungen"],
    },
  };
  return {
    ...meta[view],
    weeks: data.map((row) => {
      const start = new Date(iso(row.start) ?? "");
      return `KW ${isoWeek(start)}`;
    }),
    series: ["a", "b", "c"].map((key) => data.map((row) => Number(row[key] ?? 0))),
  };
}

function isoWeek(date: Date) {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  return Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

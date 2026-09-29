// Personal settings of "Einstellungen", stored in carecore_user_profiles.preferences.

export const NOTIFY_CATEGORIES = {
  tasks: { label: "Aufgaben & Fälligkeiten", detail: "Zugewiesene und fällige Aufgaben", prefix: "task_" },
  schedule: { label: "Dienstplan", detail: "Erinnerungen an deine Dienste", prefix: "shift_" },
  learning: { label: "Schulungen", detail: "Zuweisungen und ablaufende Nachweise", prefix: "learning" },
  team: { label: "Team-Neuigkeiten", detail: "Wichtige Beiträge im Team", prefix: "team_" },
  rai: { label: "RAI-Fälligkeiten", detail: "Fällige interRAI-Erfassungen", prefix: "rai_" },
  supply: { label: "Pflegebedarf", detail: "Produkte am Mindestbestand", prefix: "supply_" },
  btm: { label: "BtM-Kontrolle", detail: "Fällige Bestandskontrollen von Betäubungsmitteln", prefix: "btm_" },
} as const;
export type NotifyCategory = keyof typeof NOTIFY_CATEGORIES;

export const START_PAGES = {
  home: { label: "Startseite", path: "/c" },
  shift: { label: "Mein Dienst", path: "/c/betrieb/schicht" },
  handover: { label: "Übergabe", path: "/c/betrieb/uebergabe" },
  tasks: { label: "Meine Aufgaben", path: "/c/betrieb/aufgaben" },
  residents: { label: "Bewohner", path: "/c/bewohner" },
  chart: { label: "Dokumentation", path: "/c/pflegedokumentation" },
  med: { label: "Medikamentenrunde", path: "/c/medikation/runde" },
  vitals: { label: "Vitalwerte", path: "/c/vitalwerte" },
  wounds: { label: "Wunden", path: "/c/wundmanagement" },
  roster: { label: "Mein Dienstplan", path: "/c/mein-dienstplan" },
} as const;
export type StartPage = keyof typeof START_PAGES;

export const TEXT_SIZES = { standard: "Standard", large: "Gross", xlarge: "Sehr gross" } as const;
export type TextSize = keyof typeof TEXT_SIZES;
export const CONTRASTS = { standard: "Standard", high: "Hoher Kontrast" } as const;
export const MOTIONS = { standard: "Standard", reduced: "Reduziert" } as const;

// Automatische Abmeldung nach so vielen Minuten ohne Bedienung (0 = aus).
export const AUTO_LOGOUT_MINUTES = [0, 15, 30, 60, 120, 240] as const;
export type AutoLogout = (typeof AUTO_LOGOUT_MINUTES)[number];
export const autoLogoutLabel = (minutes: number) =>
  minutes === 0
    ? "Aus"
    : minutes < 60
      ? `Nach ${minutes} Minuten`
      : `Nach ${minutes / 60} Stunde${minutes === 60 ? "" : "n"}`;

// Ruhezeit für Push-Nachrichten (Ortszeit der Einrichtung); kritische Hinweise kommen trotzdem.
export type QuietHours = { enabled: boolean; from: string; to: string };

export type UserPreferences = {
  notify: Record<NotifyCategory, boolean>;
  textSize: TextSize;
  contrast: "standard" | "high";
  motion: "standard" | "reduced";
  shortcuts: boolean;
  sound: boolean;
  startPage: StartPage;
  autoLogout: AutoLogout;
  quietHours: QuietHours;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_QUIET: QuietHours = { enabled: false, from: "22:00", to: "06:00" };

export function resolvePreferences(stored: unknown): UserPreferences {
  const raw = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const notify = raw.notify && typeof raw.notify === "object" ? (raw.notify as Record<string, unknown>) : {};
  const quiet = raw.quietHours && typeof raw.quietHours === "object" ? (raw.quietHours as Record<string, unknown>) : {};
  const from = typeof quiet.from === "string" && TIME.test(quiet.from) ? quiet.from : DEFAULT_QUIET.from;
  const to = typeof quiet.to === "string" && TIME.test(quiet.to) ? quiet.to : DEFAULT_QUIET.to;
  return {
    notify: Object.fromEntries(
      (Object.keys(NOTIFY_CATEGORIES) as NotifyCategory[]).map((key) => [key, notify[key] !== false]),
    ) as Record<NotifyCategory, boolean>,
    textSize: typeof raw.textSize === "string" && raw.textSize in TEXT_SIZES ? (raw.textSize as TextSize) : "standard",
    contrast: raw.contrast === "high" ? "high" : "standard",
    motion: raw.motion === "reduced" ? "reduced" : "standard",
    shortcuts: raw.shortcuts !== false,
    sound: raw.sound === true,
    startPage:
      typeof raw.startPage === "string" && raw.startPage in START_PAGES ? (raw.startPage as StartPage) : "home",
    autoLogout: (AUTO_LOGOUT_MINUTES as readonly unknown[]).includes(raw.autoLogout)
      ? (raw.autoLogout as AutoLogout)
      : 0,
    // Ungültige Uhrzeiten schalten die Ruhezeit aus, statt stillschweigend andere Zeiten zu verwenden.
    quietHours: { enabled: quiet.enabled === true && from === quiet.from && to === quiet.to && from !== to, from, to },
  };
}

export const DEFAULT_PREFERENCES = resolvePreferences(null);

// Liegt die Uhrzeit (HH:MM) in der Ruhezeit? Über Mitternacht (22:00–06:00) wird richtig gerechnet.
export function inQuietHours(quiet: QuietHours, time: string) {
  if (!quiet.enabled) return false;
  return quiet.from < quiet.to ? time >= quiet.from && time < quiet.to : time >= quiet.from || time < quiet.to;
}

// Category of a notification type; critical notifications are always shown.
export const notifyCategory = (type: string) =>
  (Object.keys(NOTIFY_CATEGORIES) as NotifyCategory[]).find((key) => type.startsWith(NOTIFY_CATEGORIES[key].prefix)) ??
  null;

export type UserSession = { id: string; device: string; createdAt: string; expiresAt: string; current: boolean };

export type UserSettings = {
  profile: {
    displayName: string;
    username: string;
    jobTitle: string;
    phone: string;
    roleName: string;
    permissions: string[];
    careUnit: string | null;
  };
  preferences: UserPreferences;
  security: { passwordChangedAt: string | null; sessions: UserSession[] };
};

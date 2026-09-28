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
  residents: { label: "Bewohner", path: "/c/bewohner" },
  chart: { label: "Dokumentation", path: "/c/pflegedokumentation" },
  med: { label: "Medikamentenrunde", path: "/c/medikation/runde" },
} as const;
export type StartPage = keyof typeof START_PAGES;

export type UserPreferences = {
  notify: Record<NotifyCategory, boolean>;
  textSize: "standard" | "large";
  contrast: "standard" | "high";
  startPage: StartPage;
};

export function resolvePreferences(stored: unknown): UserPreferences {
  const raw = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const notify = raw.notify && typeof raw.notify === "object" ? (raw.notify as Record<string, unknown>) : {};
  return {
    notify: Object.fromEntries(
      (Object.keys(NOTIFY_CATEGORIES) as NotifyCategory[]).map((key) => [key, notify[key] !== false]),
    ) as Record<NotifyCategory, boolean>,
    textSize: raw.textSize === "large" ? "large" : "standard",
    contrast: raw.contrast === "high" ? "high" : "standard",
    startPage:
      typeof raw.startPage === "string" && raw.startPage in START_PAGES ? (raw.startPage as StartPage) : "home",
  };
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

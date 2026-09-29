import type { ModuleIconName } from "@/app/components/module-icon";

// Organisation-wide settings of "Leitung · Konfiguration" (stored in
// carecore_organizations.settings.app). Every setting changes how the app behaves.

export type SettingKey =
  | "documentationReminder"
  | "vitalsReminder"
  | "medicationOverdue"
  | "btmCountInterval"
  | "btmAdministrationWitness"
  | "weightLossPercent"
  | "weightLossDays"
  | "fluidBehindDays"
  | "navigationBadges"
  | "keyboardShortcuts";

export type SettingValue = { enabled: boolean; value: number | null };
export type AppSettings = Record<SettingKey, SettingValue>;

type Definition = {
  title: string;
  icon: ModuleIconName;
  area: string;
  describe: (value: number | null) => string;
  unit?: string;
  min?: number;
  max?: number;
  defaults: SettingValue;
};

export const SETTING_DEFINITIONS: Record<SettingKey, Definition> = {
  documentationReminder: {
    title: "Erinnerung Dokumentation",
    icon: "note",
    area: "Tagesliste",
    describe: (value) => `„Dokumentation fehlt" nach ${value} Stunden ohne Eintrag`,
    unit: "Stunden",
    min: 4,
    max: 72,
    defaults: { enabled: true, value: 24 },
  },
  vitalsReminder: {
    title: "Erinnerung Vitalwerte",
    icon: "vitals",
    area: "Tagesliste",
    describe: (value) => `„Vitalwerte messen" nach ${value} Tagen ohne Messung`,
    unit: "Tage",
    min: 1,
    max: 60,
    defaults: { enabled: true, value: 7 },
  },
  medicationOverdue: {
    title: "Überfällige Medikamentengaben",
    icon: "med",
    area: "Tagesliste & Navigation",
    describe: (value) => `Gaben gelten ${value} Minuten nach der geplanten Zeit als überfällig`,
    unit: "Minuten",
    min: 5,
    max: 240,
    defaults: { enabled: true, value: 30 },
  },
  // Kein Standardwert: Das Kontrollintervall für Betäubungsmittel legt die Einrichtung selbst fest.
  btmCountInterval: {
    title: "BtM-Bestandskontrolle",
    icon: "med",
    area: "BtM-Kontrolle & Benachrichtigungen",
    describe: (value) =>
      value
        ? `Kontrolle fällig ${value} ${value === 1 ? "Tag" : "Tage"} nach der letzten Bestandskontrolle`
        : "Intervall ist noch nicht festgelegt",
    unit: "Tage",
    min: 1,
    max: 365,
    defaults: { enabled: false, value: null },
  },
  // Ob Gaben von Betäubungsmitteln eine Zweitunterschrift brauchen, entscheidet die Einrichtung.
  btmAdministrationWitness: {
    title: "Zweitunterschrift bei BtM-Gaben",
    icon: "med",
    area: "Medikamentenrunde & Reserven",
    describe: () => "Gaben von Betäubungsmitteln bestätigt eine zweite berechtigte Person mit ihrem Passwort",
    defaults: { enabled: false, value: null },
  },
  // Trendhinweise Ernährung: Grenzen legt die Einrichtung fest, es gibt keine Vorgabewerte.
  weightLossPercent: {
    title: "Hinweis Gewichtsverlust",
    icon: "nutrition",
    area: "Ernährung",
    describe: (value) =>
      value
        ? `Hinweis bei einem Gewichtsverlust ab ${value} % innerhalb des Beobachtungszeitraums`
        : "Grenze ist noch nicht festgelegt",
    unit: "%",
    min: 1,
    max: 30,
    defaults: { enabled: false, value: null },
  },
  weightLossDays: {
    title: "Beobachtungszeitraum Gewicht",
    icon: "nutrition",
    area: "Ernährung",
    describe: (value) =>
      value
        ? `Der Gewichtsverlust wird über die letzten ${value} Tage verglichen`
        : "Zeitraum ist noch nicht festgelegt",
    unit: "Tage",
    min: 7,
    max: 365,
    defaults: { enabled: false, value: null },
  },
  fluidBehindDays: {
    title: "Hinweis Trinkmenge",
    icon: "nutrition",
    area: "Ernährung",
    describe: (value) =>
      value
        ? `Hinweis, wenn das persönliche Trinkziel an ${value} ${value === 1 ? "Tag" : "Tagen in Folge"} nicht erreicht wurde`
        : "Anzahl Tage ist noch nicht festgelegt",
    unit: "Tage",
    min: 1,
    max: 14,
    defaults: { enabled: false, value: null },
  },
  navigationBadges: {
    title: "Zähler in der Navigation",
    icon: "bell",
    area: "Seitenleiste",
    describe: () => "Offene Aufgaben, Übergaben und überfällige Gaben als Zähler",
    defaults: { enabled: true, value: null },
  },
  keyboardShortcuts: {
    title: "Tastaturkürzel",
    icon: "settings",
    area: "Alle Seiten",
    describe: () => "Einzeltasten-Kürzel wie J/K oder D für alle Mitarbeitenden",
    defaults: { enabled: true, value: null },
  },
};

export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[];

// Stored settings merged over the defaults; invalid values fall back to the default.
export function resolveSettings(stored: unknown): AppSettings {
  const source = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  return Object.fromEntries(
    SETTING_KEYS.map((key) => {
      const definition = SETTING_DEFINITIONS[key];
      const raw = source[key] && typeof source[key] === "object" ? (source[key] as Record<string, unknown>) : {};
      const enabled = typeof raw.enabled === "boolean" ? raw.enabled : definition.defaults.enabled;
      const number = Number(raw.value);
      const valid =
        definition.unit !== undefined &&
        Number.isInteger(number) &&
        number >= (definition.min ?? 0) &&
        number <= (definition.max ?? Infinity);
      return [key, { enabled, value: definition.unit ? (valid ? number : definition.defaults.value) : null }];
    }),
  ) as AppSettings;
}

export const DEFAULT_SETTINGS = resolveSettings(null);

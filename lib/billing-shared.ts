// Abrechnung (Server und Oberfläche): Taxen der Einrichtung, Pflegestufe, Abwesenheiten und die Berechnung eines
// Monats je Person. Beträge in Rappen bzw. Cent. Tarife und Regeln legt die Einrichtung fest.

export const RATE_CATEGORIES = {
  pension: "Pension",
  support: "Betreuung",
  care: "Pflege",
  extra: "Weitere Leistungen",
} as const;
export type RateCategory = keyof typeof RATE_CATEGORIES;

export const PAYERS = {
  resident: "Person selbst",
  insurer: "Krankenversicherung",
  public: "Öffentliche Hand",
  other: "Andere",
} as const;
export type Payer = keyof typeof PAYERS;

export const ABSENCE_KINDS = { hospital: "Spital", vacation: "Ferien", other: "Andere Abwesenheit" } as const;
export type AbsenceKind = keyof typeof ABSENCE_KINDS;

// Abwesenheit: die ersten `fullDays` Tage voll verrechnet, danach `percent` Prozent. null: Abwesenheit ändert nichts.
export type AbsenceRule = { fullDays: number; percent: number } | null;

export type RatePrice = { validFrom: string; amountCents: number };

export type BillingRate = {
  id: string;
  name: string;
  category: RateCategory;
  payer: Payer;
  careLevel: string | null;
  applies: "all" | "assigned";
  hospital: AbsenceRule;
  // Ferien und andere Abwesenheiten.
  absence: AbsenceRule;
  prices: RatePrice[];
  archived: boolean;
};

export type CareLevelEntry = {
  id: string;
  level: string;
  validFrom: string;
  note: string;
  author: string;
  createdAt: string;
};

export type Absence = {
  id: string;
  kind: AbsenceKind;
  startsOn: string;
  endsOn: string | null;
  note: string;
  author: string;
};

export type AssignedRate = { id: string; rateId: string; name: string; validFrom: string; validUntil: string | null };

// Aufenthalt im Haus (Eintritt bis Austritt; offen, solange die Person wohnt).
export type StayPeriod = { from: string; until: string | null };

export type BillingLine = {
  rateId: string;
  name: string;
  category: RateCategory;
  payer: Payer;
  // Preis je Tag; bei Preisänderungen im Monat mehrere Zeilen.
  priceCents: number;
  fullDays: number;
  // Tage mit reduziertem Satz wegen Abwesenheit, mit Prozentsatz.
  reduced: Array<{ days: number; percent: number; kind: "hospital" | "absence" }>;
  amountCents: number;
};

export type BillingMonth = {
  month: string;
  // Tage im Haus bzw. verrechnete Tage (laut Aufenthalt und Regel zum Austrittstag) und davon abwesend.
  billedDays: number;
  absentDays: { hospital: number; absence: number };
  lines: BillingLine[];
  totals: Array<{ payer: Payer; amountCents: number }>;
  totalCents: number;
  // Hinweise, warum etwas fehlt (z. B. keine Pflegestufe, kein Tarif für die Stufe).
  warnings: string[];
};

export type BillingSettings = { dischargeDayBilled: boolean | null };

export type BillingPerson = {
  residentId: string;
  resident: { name: string; room: string; unit: string; admittedOn: string | null };
  currency: string;
  today: string;
  careLevels: CareLevelEntry[];
  // Pflegestufe laut Pflegeplan (zum Vergleich).
  planCareLevel: string | null;
  absences: Absence[];
  assigned: AssignedRate[];
  preview: BillingMonth | null;
  previewMonth: string;
  settings: BillingSettings;
};

export type BillingCatalog = {
  currency: string;
  today: string;
  levels: Array<{ value: string; detail: string }>;
  levelLabel: string;
  rates: BillingRate[];
  settings: BillingSettings;
};

export const ruleText = (rule: AbsenceRule) =>
  !rule
    ? "voll verrechnet"
    : rule.fullDays === 0
      ? `${rule.percent} % ab dem ersten Tag`
      : `${rule.fullDays} ${rule.fullDays === 1 ? "Tag" : "Tage"} voll, danach ${rule.percent} %`;

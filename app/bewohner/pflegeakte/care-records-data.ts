import { type ModuleIconName } from "@/app/components/module-icon";

export type CareResident = {
  id: string;
  initials: string;
  name: string;
  room: string;
  unit: string;
  careLevel: string;
  status: Exclude<RecordFilter, "Alle">;
  tone: RecordTone;
  completeness: number;
  measures: number;
  risks: number;
  evaluation: string;
  focus: string;
  owner: string;
};

export type CareDomain = {
  id: string;
  label: string;
  icon: ModuleIconName;
  tone: RecordTone;
  status: string;
  summary: string;
  goal: string;
  measures: string[];
};

export const careResidents: CareResident[] = [
  {
    id: "hm",
    initials: "HM",
    name: "Hans Müller",
    room: "Zimmer 207",
    unit: "Wohnbereich 2",
    careLevel: "Pflegestufe 4",
    status: "Evaluation fällig",
    tone: "attention",
    completeness: 96,
    measures: 14,
    risks: 2,
    evaluation: "16. September 2026",
    focus: "Sturzrisiko und nächtliche Orientierung",
    owner: "Anna Meier",
  },
  {
    id: "mk",
    initials: "MK",
    name: "Maria Keller",
    room: "Zimmer 204",
    unit: "Wohnbereich 2",
    careLevel: "Pflegestufe 3",
    status: "Aktuell",
    tone: "stable",
    completeness: 100,
    measures: 11,
    risks: 1,
    evaluation: "28. September 2026",
    focus: "Diabetesmanagement und Schmerzbeobachtung",
    owner: "Anna Meier",
  },
  {
    id: "em",
    initials: "EM",
    name: "Erika Meier",
    room: "Zimmer 211",
    unit: "Wohnbereich 2",
    careLevel: "Pflegestufe 3",
    status: "Aktuell",
    tone: "stable",
    completeness: 98,
    measures: 12,
    risks: 1,
    evaluation: "2. Oktober 2026",
    focus: "Medikationsanpassung und Wundversorgung",
    owner: "Nora Baumann",
  },
  {
    id: "rb",
    initials: "RB",
    name: "Ruth Baumann",
    room: "Zimmer 214",
    unit: "Wohnbereich 2",
    careLevel: "Pflegestufe 2",
    status: "Aktuell",
    tone: "stable",
    completeness: 100,
    measures: 8,
    risks: 1,
    evaluation: "7. Oktober 2026",
    focus: "Mobilität und Druckstellenprophylaxe",
    owner: "Lea Frei",
  },
  {
    id: "pa",
    initials: "PA",
    name: "Peter Aebischer",
    room: "Zimmer 115",
    unit: "Wohnbereich 1",
    careLevel: "Pflegestufe 2",
    status: "Evaluation fällig",
    tone: "attention",
    completeness: 91,
    measures: 9,
    risks: 2,
    evaluation: "Heute",
    focus: "Flüssigkeitsmanagement und Hautschutz",
    owner: "Lea Frei",
  },
  {
    id: "as",
    initials: "AS",
    name: "Anna Schmid",
    room: "Zimmer 118",
    unit: "Wohnbereich 1",
    careLevel: "Pflegestufe 1",
    status: "Aktuell",
    tone: "stable",
    completeness: 100,
    measures: 6,
    risks: 0,
    evaluation: "18. Oktober 2026",
    focus: "Selbstständigkeit und sichere Mobilität",
    owner: "Nora Baumann",
  },
  {
    id: "wb",
    initials: "WB",
    name: "Walter Brunner",
    room: "Zimmer 306",
    unit: "Wohnbereich 3",
    careLevel: "Pflegestufe 3",
    status: "Entwurf",
    tone: "info",
    completeness: 72,
    measures: 7,
    risks: 2,
    evaluation: "Nach Eintritt abschließen",
    focus: "Eintrittsassessment und Pflegeplanung",
    owner: "Nora Baumann",
  },
  {
    id: "bk",
    initials: "BK",
    name: "Bernhard Koch",
    room: "Zimmer 012",
    unit: "Pflegewohngruppe",
    careLevel: "Pflegestufe 4",
    status: "Evaluation fällig",
    tone: "attention",
    completeness: 94,
    measures: 16,
    risks: 3,
    evaluation: "13. September 2026",
    focus: "Kognition, Unruhe und Tagesstruktur",
    owner: "Sven Keller",
  },
];

export const careDomains: CareDomain[] = [
  {
    id: "mobility",
    label: "Mobilität & Bewegung",
    icon: "pulse",
    tone: "attention",
    status: "Beobachten",
    summary: "Mobilisation mit Rollator und Begleitung. Erhöhtes Sturzrisiko bei Lagewechseln und in der Nacht.",
    goal: "Sichere Mobilität im Wohnbereich erhalten und weitere Sturzereignisse vermeiden.",
    measures: [
      "Transfers mit verbaler Anleitung begleiten",
      "Rollator vor jedem Aufstehen bereitstellen",
      "Sturzprophylaxe konsequent fortführen",
    ],
  },
  {
    id: "nutrition",
    label: "Ernährung & Flüssigkeit",
    icon: "nutrition",
    tone: "stable",
    status: "Stabil",
    summary: "Normalkost, selbstständige Nahrungsaufnahme. Trinkmenge im vereinbarten Zielbereich.",
    goal: "Tägliche Flüssigkeitszufuhr von mindestens 1,5 Litern sicherstellen.",
    measures: [
      "Getränke sichtbar bereitstellen",
      "Trinkmenge pro Schicht dokumentieren",
      "Gewicht wöchentlich kontrollieren",
    ],
  },
  {
    id: "cognition",
    label: "Kognition & Orientierung",
    icon: "assess",
    tone: "info",
    status: "Unterstützung",
    summary: "Zeitlich teilweise desorientiert, örtliche und persönliche Orientierung erhalten.",
    goal: "Orientierung und Selbstbestimmung im Tagesablauf bestmöglich unterstützen.",
    measures: [
      "Tagesstruktur sichtbar kommunizieren",
      "Kurze und eindeutige Informationen geben",
      "Biografiebezogene Aktivierung anbieten",
    ],
  },
  {
    id: "skin",
    label: "Haut & Wunden",
    icon: "wounds",
    tone: "attention",
    status: "Beobachten",
    summary: "Hautläsion am linken Unterarm in Behandlung. Trockene Haut an beiden Unterschenkeln.",
    goal: "Wundheilung fördern und weitere Hautschädigungen vermeiden.",
    measures: [
      "Wundversorgung nach aktuellem Standard",
      "Hautbeobachtung bei jeder Körperpflege",
      "Druckstellen unmittelbar dokumentieren",
    ],
  },
  {
    id: "elimination",
    label: "Ausscheidung",
    icon: "note",
    tone: "stable",
    status: "Stabil",
    summary: "Kontinente Ausscheidung mit selbstständiger Toilettennutzung am Tag.",
    goal: "Selbstständige Toilettennutzung und regelmäßige Ausscheidung erhalten.",
    measures: [
      "Toilettengänge nach Bedarf begleiten",
      "Ausscheidungsverhalten beobachten",
      "Veränderungen im Verlauf dokumentieren",
    ],
  },
  {
    id: "sleep",
    label: "Ruhe & Schlaf",
    icon: "vitals",
    tone: "attention",
    status: "Beobachten",
    summary: "Unterbrochener Nachtschlaf mit zwei bis drei Wachphasen und nächtlichem Bewegungsdrang.",
    goal: "Erholsame Ruhephasen fördern und nächtliche Sturzgefährdung reduzieren.",
    measures: [
      "Abendritual und Ruhezeiten einhalten",
      "Nachtlicht und Rufanlage kontrollieren",
      "Schlafverhalten im Nachtbericht festhalten",
    ],
  },
];

export type RecordFilter = "Alle" | "Aktuell" | "Evaluation fällig" | "Entwurf";

export type RecordTone = "stable" | "attention" | "info";

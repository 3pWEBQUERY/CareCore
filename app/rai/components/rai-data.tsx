"use client";

export type RaiView = "overview" | "assessment" | "due" | "reports";

export type RaiResident = {
  id: string;
  initials: string;
  name: string;
  room: string;
  unit: string;
  status: string;
  tone: "stable" | "attention" | "critical" | "info";
  progress: number;
  next: string;
  assessor: string;
};

export const residents: RaiResident[] = [
  {
    id: "hm",
    initials: "HM",
    name: "Hans Müller",
    room: "Zimmer 207",
    unit: "Wohnbereich 2",
    status: "In Bearbeitung",
    tone: "attention",
    progress: 68,
    next: "Heute · 14:00",
    assessor: "Anna Meier",
  },
  {
    id: "mk",
    initials: "MK",
    name: "Maria Keller",
    room: "Zimmer 204",
    unit: "Wohnbereich 2",
    status: "Aktuell",
    tone: "stable",
    progress: 100,
    next: "28.09.2026",
    assessor: "Anna Meier",
  },
  {
    id: "em",
    initials: "EM",
    name: "Erika Meier",
    room: "Zimmer 211",
    unit: "Wohnbereich 2",
    status: "Fällig",
    tone: "critical",
    progress: 42,
    next: "Heute · 16:00",
    assessor: "Nora Baumann",
  },
  {
    id: "rb",
    initials: "RB",
    name: "Ruth Baumann",
    room: "Zimmer 214",
    unit: "Wohnbereich 2",
    status: "Aktuell",
    tone: "stable",
    progress: 100,
    next: "07.10.2026",
    assessor: "Lea Frei",
  },
  {
    id: "pa",
    initials: "PA",
    name: "Peter Aebischer",
    room: "Zimmer 115",
    unit: "Wohnbereich 1",
    status: "Fällig",
    tone: "attention",
    progress: 31,
    next: "Morgen · 09:30",
    assessor: "Lea Frei",
  },
  {
    id: "wb",
    initials: "WB",
    name: "Walter Brunner",
    room: "Zimmer 306",
    unit: "Wohnbereich 3",
    status: "Neuaufnahme",
    tone: "info",
    progress: 12,
    next: "Nach Eintritt",
    assessor: "Nora Baumann",
  },
];

export const instruments = ["interRAI LTCF", "interRAI HC", "interRAI CMH", "interRAI Screener"];

export const assessorOptions = ["Anna Meier", "Lea Frei", "Nora Baumann", "Sven Keller"];

export const meta: Record<RaiView, { child: string; title: string; description: string; action: string }> = {
  overview: {
    child: "Übersicht",
    title: "RAI Arbeitsplatz",
    description: "interRAI-Erfassungen, Verantwortlichkeiten und Fälligkeiten zentral steuern.",
    action: "Neue interRAI-Erfassung",
  },
  assessment: {
    child: "interRAI-Erfassung",
    title: "interRAI-Erfassung",
    description: "Bewohnerbezogene Einschätzungen strukturiert und nachvollziehbar dokumentieren.",
    action: "Erfassung speichern",
  },
  due: {
    child: "Fälligkeiten",
    title: "RAI-Fälligkeiten",
    description: "Anstehende Erfassungen und offene Bereiche zuverlässig im Blick behalten.",
    action: "Fälligkeiten aktualisieren",
  },
  reports: {
    child: "Berichte",
    title: "RAI-Berichte",
    description: "Auswertungen zur Datenqualität und zum Unterstützungsbedarf im Haus.",
    action: "Bericht exportieren",
  },
};

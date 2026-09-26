"use client";

import { type ModuleIconName } from "@/app/components/module-icon";

export const meta: Record<
  LeadershipView,
  {
    module: string;
    child: string;
    eyebrow: string;
    title: string;
    description: string;
    action: string;
    kpis: Array<[string, string, string, Tone?]>;
  }
> = {
  qualityEvents: {
    module: "quality",
    child: "Ereignisse",
    eyebrow: "CareCore Quality",
    title: "Ereignisse",
    description: "Sicherheitslage, Meldungen und Ursachen im gesamten Haus.",
    action: "Ereignis melden",
    kpis: [
      ["14", "Ereignisse 2026", "−18 % zum Vorjahr", "stable"],
      ["2", "kritische Fälle", "sofortige Prüfung", "critical"],
      ["5", "in Prüfung", "3 seit heute", "attention"],
      ["87 %", "abgeschlossen", "Ziel 90 %", "info"],
    ],
  },
  qualityActions: {
    module: "quality",
    child: "Massnahmen",
    eyebrow: "CareCore Quality",
    title: "Massnahmen",
    description: "Verbesserungen priorisieren, Verantwortlichkeiten klären und Wirkung messen.",
    action: "Massnahme planen",
    kpis: [
      ["18", "Massnahmen aktiv", "4 fällig", "attention"],
      ["91 %", "wirksam", "aus Evaluationen", "stable"],
      ["6", "Verantwortliche", "im Team", "info"],
      ["26", "abgeschlossen", "dieses Jahr", "stable"],
    ],
  },
  careInsights: {
    module: "insights",
    child: "Pflege",
    eyebrow: "CareCore Insights",
    title: "Pflegekennzahlen",
    description: "Versorgungsqualität und Pflegeindikatoren als Entscheidungsgrundlage.",
    action: "Bericht erstellen",
    kpis: [
      ["78 %", "Dokumentation", "Ziel 90 %", "attention"],
      ["3", "Sturzereignisse", "−1 zum Vormonat", "stable"],
      ["5", "aktive Wunden", "3 planmässig", "info"],
      ["94 %", "Assessments aktuell", "+4 %", "stable"],
    ],
  },
  leadershipInsights: {
    module: "insights",
    child: "Leitung",
    eyebrow: "CareCore Insights",
    title: "Leitungskennzahlen",
    description: "Belegung, Qualität und Risiken für den täglichen Führungsentscheid.",
    action: "Zeitraum wählen",
    kpis: [
      ["88 %", "Belegung", "46 von 52 Plätzen", "stable"],
      ["7", "Hinweise offen", "2 kritisch", "attention"],
      ["80 %", "Jahresziele", "Q3 Fortschritt", "info"],
      ["0", "P1 Eskalationen", "aktuell", "stable"],
    ],
  },
  workforceInsights: {
    module: "insights",
    child: "Personal",
    eyebrow: "CareCore Insights",
    title: "Personalkennzahlen",
    description: "Besetzung, Verfügbarkeit und Kompetenzmix im Überblick.",
    action: "Auswertung exportieren",
    kpis: [
      ["92 %", "Besetzung", "kommende Woche", "stable"],
      ["4", "Abwesenheiten", "noch offen", "attention"],
      ["100 %", "Kompetenzmix", "Mindestbesetzung", "info"],
      ["6", "offene Dienste", "zu planen", "critical"],
    ],
  },
  organization: {
    module: "admin",
    child: "Organisation",
    eyebrow: "CareCore Admin",
    title: "Organisation",
    description: "Standorte, Wohnbereiche und Verantwortlichkeiten zentral steuern.",
    action: "Bereich hinzufügen",
    kpis: [
      ["4", "Wohnbereiche", "46 Plätze belegt", "info"],
      ["62", "Mitarbeitende", "in 8 Rollen", "stable"],
      ["12", "Teams", "hausweit", "info"],
      ["1", "Änderung offen", "Wohnbereich 3", "attention"],
    ],
  },
  users: {
    module: "admin",
    child: "Mitarbeiter",
    eyebrow: "CareCore Admin",
    title: "Mitarbeiter",
    description: "Mitarbeiterprofile, Rollen und Zugriffe sicher verwalten.",
    action: "Mitarbeiter erstellen",
    kpis: [
      ["—", "Mitarbeiter aktiv", "Daten werden geladen", "info"],
      ["—", "Rollen", "Daten werden geladen", "info"],
      ["—", "Ohne Arbeitsbereich", "Daten werden geladen", "info"],
      ["—", "Auditstatus", "Daten werden geladen", "info"],
    ],
  },
  configuration: {
    module: "admin",
    child: "Konfiguration",
    eyebrow: "CareCore Admin",
    title: "Konfiguration",
    description: "Systemweite Einstellungen, Integrationen und Aufbewahrung sicher pflegen.",
    action: "Einstellung ändern",
    kpis: [
      ["18", "Einstellungen aktiv", "keine Fehler", "stable"],
      ["2", "Schnittstellen", "verbunden", "info"],
      ["1", "Prüfung empfohlen", "Archivierung", "attention"],
      ["100 %", "Auditstatus", "konform", "stable"],
    ],
  },
};

export const boardItems: Record<LeadershipView, BoardItem[]> = {
  qualityEvents: [
    {
      id: "qe1",
      title: "Beinahe-Sturz · Zimmer 207",
      detail: "Umfeld angepasst, Angehörige informiert",
      metric: "Heute, 07:55",
      status: "In Prüfung",
      tone: "attention",
      icon: "alert",
    },
    {
      id: "qe2",
      title: "Medikationsabweichung",
      detail: "Rücksprache mit Arzt dokumentiert",
      metric: "11.09.2026",
      status: "Massnahme läuft",
      tone: "critical",
      icon: "med",
    },
    {
      id: "qe3",
      title: "Lob von Angehörigen",
      detail: "Positives Feedback zum Einzug",
      metric: "10.09.2026",
      status: "Abgeschlossen",
      tone: "stable",
      icon: "check",
    },
  ],
  qualityActions: [
    {
      id: "qa1",
      title: "Kontrollrunde Medikationswagen",
      detail: "Temperatur und Verfallsdaten prüfen",
      metric: "Fällig 15.09.",
      status: "Offen",
      tone: "attention",
      icon: "med",
    },
    {
      id: "qa2",
      title: "Schulung Sturzprävention",
      detail: "Teambriefing im Frühdienst",
      metric: "Termin 18.09.",
      status: "Geplant",
      tone: "info",
      icon: "learn",
    },
    {
      id: "qa3",
      title: "Beleuchtung Flur Nord",
      detail: "Installation geprüft und freigegeben",
      metric: "09.09.2026",
      status: "Erledigt",
      tone: "stable",
      icon: "check",
    },
  ],
  careInsights: [
    {
      id: "ci1",
      title: "Dokumentationsquote",
      detail: "28 von 36 Pflegeberichten abgeschlossen",
      metric: "78 %",
      status: "Unter Ziel",
      tone: "attention",
      icon: "chart",
    },
    {
      id: "ci2",
      title: "Sturzereignisse",
      detail: "Drei Ereignisse im laufenden Monat",
      metric: "3",
      status: "Verbessert",
      tone: "stable",
      icon: "quality",
    },
    {
      id: "ci3",
      title: "Wundheilung",
      detail: "Drei Verläufe planmässig",
      metric: "60 %",
      status: "Beobachten",
      tone: "info",
      icon: "wounds",
    },
  ],
  leadershipInsights: [
    {
      id: "li1",
      title: "Belegung",
      detail: "46 von 52 Plätzen sind belegt",
      metric: "88 %",
      status: "Im Ziel",
      tone: "stable",
      icon: "building",
    },
    {
      id: "li2",
      title: "Offene Hinweise",
      detail: "Zwei Hinweise benötigen Leitungssicht",
      metric: "7",
      status: "Prüfen",
      tone: "attention",
      icon: "alert",
    },
    {
      id: "li3",
      title: "Qualitätsziele",
      detail: "Acht von zehn Jahreszielen im Plan",
      metric: "80 %",
      status: "Q3",
      tone: "info",
      icon: "chart",
    },
  ],
  workforceInsights: [
    {
      id: "wi1",
      title: "Dienstbesetzung",
      detail: "Geplante Dienste kommende Woche",
      metric: "92 %",
      status: "Stabil",
      tone: "stable",
      icon: "calendar",
    },
    {
      id: "wi2",
      title: "Abwesenheiten",
      detail: "Noch nicht vollständig vertreten",
      metric: "4",
      status: "Handeln",
      tone: "attention",
      icon: "team",
    },
    {
      id: "wi3",
      title: "Kompetenzmix",
      detail: "Alle Schichten erfüllen Mindestbesetzung",
      metric: "100 %",
      status: "Erfüllt",
      tone: "info",
      icon: "learn",
    },
  ],
  organization: [
    {
      id: "o1",
      title: "Wohnbereich 2 · 1. OG",
      detail: "12 Plätze · 10 belegt · Team Anna Meier",
      metric: "Aktiv",
      status: "Stabil",
      tone: "stable",
      icon: "building",
    },
    {
      id: "o2",
      title: "Pflegewohngruppe",
      detail: "8 Plätze · 7 belegt · eigener Dienstplan",
      metric: "Aktiv",
      status: "Stabil",
      tone: "info",
      icon: "building",
    },
    {
      id: "o3",
      title: "Wohnbereich 3",
      detail: "Neue Teamleitung ab 01.10. hinterlegt",
      metric: "Prüfung",
      status: "Offen",
      tone: "attention",
      icon: "team",
    },
  ],
  users: [
    {
      id: "u1",
      title: "Anna Meier",
      detail: "Pflegefachfrau HF · Vollzugriff Pflege",
      metric: "Heute, 08:02",
      status: "Aktiv",
      tone: "stable",
      icon: "team",
    },
    {
      id: "u2",
      title: "Lea Frei",
      detail: "Fachfrau Gesundheit · eingeschränkter Zugriff",
      metric: "Gestern",
      status: "Aktiv",
      tone: "info",
      icon: "team",
    },
    {
      id: "u3",
      title: "Dr. Martin Weber",
      detail: "Belegarzt · Arbeitsbereich noch zuweisen",
      metric: "Prüfen",
      status: "Zuweisung",
      tone: "attention",
      icon: "team",
    },
  ],
  configuration: [
    {
      id: "cf1",
      title: "Benachrichtigungen",
      detail: "Eskalationen und fällige Aufgaben",
      metric: "12.09.2026",
      status: "Aktiv",
      tone: "stable",
      icon: "bell",
    },
    {
      id: "cf2",
      title: "Schnittstellen",
      detail: "KIS-Export und Verzeichnisdienst",
      metric: "08:05",
      status: "Verbunden",
      tone: "info",
      icon: "pulse",
    },
    {
      id: "cf3",
      title: "Archivierung",
      detail: "Aufbewahrungsfristen der Bewohnerakten",
      metric: "Prüfen",
      status: "Hinweis",
      tone: "attention",
      icon: "docs",
    },
  ],
};

export type LeadershipView =
  | "qualityEvents"
  | "qualityActions"
  | "careInsights"
  | "leadershipInsights"
  | "workforceInsights"
  | "organization"
  | "users"
  | "configuration";

export type Tone = "stable" | "attention" | "critical" | "info";

export type BoardItem = {
  id: string;
  title: string;
  detail: string;
  metric: string;
  status: string;
  tone: Tone;
  icon: ModuleIconName;
  owner?: string;
};

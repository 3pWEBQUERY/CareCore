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

export type LeadershipView = "organization" | "users" | "configuration";

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

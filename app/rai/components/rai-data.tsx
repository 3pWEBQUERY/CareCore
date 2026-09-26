"use client";

import type { RaiWorkplace } from "@/lib/rai-shared";

export type RaiView = "overview" | "assessment" | "due" | "reports";

export type RaiData = {
  data?: RaiWorkplace;
  error?: string;
  loading: boolean;
  reload: () => void;
};

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

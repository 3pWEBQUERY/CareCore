export type ModuleIconName = "home" | "residents" | "tasks" | "handover" | "calendar" | "team" | "learn" | "docs" | "chart" | "quality" | "settings" | "search" | "bell" | "building" | "chevron" | "caretDown" | "alert" | "check" | "plus" | "pulse" | "note" | "vitals" | "plan" | "med" | "wounds" | "nutrition" | "assess" | "shift" | "ai" | "sparkle" | "sidebar" | "filter" | "logout" | "close";

export type NavModule = { id: string; label: string; icon: ModuleIconName; children: string[]; badge?: number; href?: string };
export type NavGroup = { id: string; label: string; modules: NavModule[] };

export const navigation: NavGroup[] = [
  { id: "clinical", label: "Pflege & Klinik", modules: [
    { id: "residents", label: "Bewohner", icon: "residents", href: "/bewohner", children: ["Übersicht", "Verlauf", "Pflegeakte"] },
    { id: "plan", label: "Pflegeplanung", icon: "plan", children: ["Pflegeplanung", "Ziele & Massnahmen", "Auswertung"] },
    { id: "chart", label: "Pflegedokumentation", icon: "note", children: ["Schnelldokumentation", "Verlaufsdokumentation"] },
    { id: "vitals", label: "Vitalwerte", icon: "vitals", children: ["Übersicht", "Entwicklung", "Grenzwerte"] },
    { id: "med", label: "Medikation", icon: "med", children: ["Medikamentenplan", "Medikamentenrunde", "Bestände", "Reserven"] },
    { id: "wounds", label: "Wundmanagement", icon: "wounds", children: ["Wundübersicht", "Dokumentation"] },
    { id: "nutrition", label: "Ernährung", icon: "nutrition", children: ["Ernährungsplan", "Trinkprotokoll"] },
    { id: "assess", label: "Einschätzungen", icon: "assess", children: ["Einschätzungen", "Fälligkeiten"] },
  ] },
  { id: "operations", label: "Betrieb", modules: [
    { id: "shift", label: "Schicht", icon: "shift", href: "/betrieb/schicht", children: ["Mein Dienst", "Schichtverlauf"] },
    { id: "tasks", label: "Aufgaben", icon: "tasks", children: ["Meine Aufgaben", "Teamaufgaben"], badge: 3 },
    { id: "handover", label: "Übergabe", icon: "handover", children: ["Meine Übergabe", "Seit letztem Dienst"] },
    { id: "schedule", label: "Dienste", icon: "calendar", children: ["Mein Dienstplan", "Teamplanung"] },
  ] },
  { id: "workforce", label: "Personal", modules: [
    { id: "team", label: "Team", icon: "team", children: ["Neuigkeiten & Kanäle", "Nachrichten"] },
    { id: "learn", label: "Schulungen", icon: "learn", children: ["Meine Schulungen", "Pflichtnachweise"] },
    { id: "docs", label: "Dokumente", icon: "docs", children: ["Dokumente", "Standards & Weisungen"] },
  ] },
  { id: "management", label: "Leitung", modules: [
    { id: "quality", label: "Qualität", icon: "quality", children: ["Ereignisse", "Massnahmen"] },
    { id: "insights", label: "Kennzahlen & Analysen", icon: "chart", children: ["Pflege", "Leitung", "Personal"] },
    { id: "admin", label: "Administration", icon: "settings", children: ["Organisation", "Benutzer & Rollen", "Konfiguration"] },
  ] },
  { id: "intelligence", label: "Intelligenz", modules: [{ id: "ai", label: "CareCore KI", icon: "ai", children: ["Assistenz", "KI-Entwürfe"] }] },
  { id: "rai", label: "CareCore RAI", modules: [{ id: "rai", label: "RAI Arbeitsplatz", icon: "assess", children: ["Übersicht", "interRAI-Erfassung", "Fälligkeiten", "Berichte"] }] },
];

const routes: Record<string, Record<string, string>> = {
  residents: { "Übersicht": "/bewohner", "Verlauf": "/bewohner/verlauf", "Pflegeakte": "/bewohner/pflegeakte" },
  plan: { "Pflegeplanung": "/pflegeplanung", "Ziele & Massnahmen": "/pflegeplanung/ziele-massnahmen", "Auswertung": "/pflegeplanung/auswertung" },
  chart: { "Schnelldokumentation": "/pflegedokumentation", "Verlaufsdokumentation": "/pflegedokumentation/verlauf" },
  vitals: { "Übersicht": "/vitalwerte", "Entwicklung": "/vitalwerte/entwicklung", "Grenzwerte": "/vitalwerte/grenzwerte" },
  med: { "Medikamentenplan": "/medikation", "Medikamentenrunde": "/medikation/runde", "Bestände": "/medikation/bestaende", "Reserven": "/medikation/reserven" },
  shift: { "Mein Dienst": "/betrieb/schicht", "Schichtverlauf": "/betrieb/schicht/verlauf" },
  tasks: { "Meine Aufgaben": "/betrieb/aufgaben", "Teamaufgaben": "/betrieb/aufgaben/team" },
  handover: { "Meine Übergabe": "/betrieb/uebergabe", "Seit letztem Dienst": "/betrieb/uebergabe/letzter-dienst" },
  schedule: { "Mein Dienstplan": "/betrieb/dienstplanung", "Teamplanung": "/betrieb/dienstplanung/team" },
  assess: { "Einschätzungen": "/einschaetzungen", "Fälligkeiten": "/einschaetzungen/faelligkeiten" },
  wounds: { "Wundübersicht": "/wundmanagement", "Dokumentation": "/wundmanagement/dokumentation" },
  nutrition: { "Ernährungsplan": "/ernaehrung", "Trinkprotokoll": "/ernaehrung/trinkprotokoll" },
  team: { "Neuigkeiten & Kanäle": "/personal/team", "Nachrichten": "/personal/team/nachrichten" },
  learn: { "Meine Schulungen": "/personal/schulungen", "Pflichtnachweise": "/personal/schulungen/pflichtnachweise" },
  docs: { "Dokumente": "/personal/dokumente", "Standards & Weisungen": "/personal/dokumente/standards" },
  quality: { "Ereignisse": "/leitung/qualitaet", "Massnahmen": "/leitung/qualitaet/massnahmen" },
  insights: { "Pflege": "/leitung/kennzahlen", "Leitung": "/leitung/kennzahlen/leitung", "Personal": "/leitung/kennzahlen/personal" },
  admin: { "Organisation": "/leitung/administration", "Benutzer & Rollen": "/leitung/administration/benutzer", "Konfiguration": "/leitung/administration/konfiguration" },
  ai: { "Assistenz": "/intelligenz", "KI-Entwürfe": "/intelligenz/entwuerfe" },
  rai: { "Übersicht": "/rai", "interRAI-Erfassung": "/rai/erfassung", "Fälligkeiten": "/rai/faelligkeiten", "Berichte": "/rai/berichte" },
};

export function routeFor(moduleId: string, child: string) {
  const route = routes[moduleId]?.[child];
  return route ? `/c${route}` : null;
}

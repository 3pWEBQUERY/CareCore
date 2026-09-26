export type ModuleIconName =
  | "home"
  | "residents"
  | "tasks"
  | "handover"
  | "calendar"
  | "team"
  | "learn"
  | "docs"
  | "chart"
  | "quality"
  | "settings"
  | "search"
  | "bell"
  | "building"
  | "chevron"
  | "caretDown"
  | "alert"
  | "check"
  | "plus"
  | "pulse"
  | "note"
  | "vitals"
  | "plan"
  | "med"
  | "wounds"
  | "nutrition"
  | "assess"
  | "shift"
  | "ai"
  | "sparkle"
  | "sidebar"
  | "filter"
  | "logout"
  | "close";

export type NavModule = {
  id: string;
  label: string;
  icon: ModuleIconName;
  children: string[];
  badge?: number;
  href?: string;
  // Permission needed to see the module (all signed-in staff when omitted).
  permission?: string;
  // Children that need an additional permission.
  childPermissions?: Record<string, string>;
};
export type NavGroup = { id: string; label: string; modules: NavModule[] };

// Grouped along the working day: my shift, the resident and the care process,
// team and knowledge, then leadership. Within the care group the modules follow
// how often they are used during a shift, followed by the care process itself.
export const navigation: NavGroup[] = [
  {
    id: "operations",
    label: "Mein Dienst",
    modules: [
      {
        id: "shift",
        label: "Schicht",
        icon: "shift",
        href: "/betrieb/schicht",
        children: ["Mein Dienst", "Schichtverlauf"],
      },
      { id: "handover", label: "Übergabe", icon: "handover", children: ["Meine Übergabe", "Seit letztem Dienst"] },
      { id: "tasks", label: "Aufgaben", icon: "tasks", children: ["Meine Aufgaben", "Teamaufgaben"] },
      { id: "care-calendar", label: "Termine", icon: "calendar", children: ["Kalender"] },
      { id: "schedule", label: "Dienstplan", icon: "calendar", children: ["Mein Dienstplan", "Teamplanung"] },
    ],
  },
  {
    id: "clinical",
    label: "Bewohner & Pflege",
    modules: [
      {
        id: "residents",
        label: "Bewohner",
        icon: "residents",
        href: "/bewohner",
        children: ["Übersicht", "Pflegeakte", "Verlauf & Archiv"],
      },
      {
        id: "chart",
        label: "Pflegedokumentation",
        icon: "note",
        children: ["Schnelldokumentation", "Verlaufsdokumentation"],
      },
      {
        id: "med",
        label: "Medikation",
        icon: "med",
        children: ["Medikamentenrunde", "Medikamentenplan", "Reserven", "Bestände"],
      },
      { id: "vitals", label: "Vitalwerte", icon: "vitals", children: ["Übersicht", "Entwicklung", "Grenzwerte"] },
      { id: "wounds", label: "Wundmanagement", icon: "wounds", children: ["Wundübersicht", "Dokumentation"] },
      { id: "nutrition", label: "Ernährung", icon: "nutrition", children: ["Trinkprotokoll", "Ernährungsplan"] },
      { id: "assess", label: "Einschätzungen", icon: "assess", children: ["Fälligkeiten", "Einschätzungen"] },
      {
        id: "plan",
        label: "Pflegeplanung",
        icon: "plan",
        children: ["Pflegeplanung", "Ziele & Massnahmen", "Auswertung"],
      },
      {
        id: "rai",
        label: "RAI / interRAI",
        icon: "assess",
        permission: "rai.manage",
        children: ["Übersicht", "interRAI-Erfassung", "Fälligkeiten", "Berichte"],
      },
    ],
  },
  {
    id: "workforce",
    label: "Team & Wissen",
    modules: [
      { id: "team", label: "Team", icon: "team", children: ["Neuigkeiten & Kanäle"] },
      { id: "messenger", label: "Nachrichten", icon: "team", children: ["Nachrichten"] },
      { id: "learn", label: "Schulungen", icon: "learn", children: ["Meine Schulungen", "Pflichtnachweise"] },
      { id: "docs", label: "Dokumente", icon: "docs", children: ["Standards & Weisungen", "Dokumente"] },
      { id: "cloud", label: "Meine Dateien", icon: "docs", children: ["Dateien"] },
    ],
  },
  {
    id: "management",
    label: "Leitung",
    modules: [
      {
        id: "quality",
        label: "Qualität",
        icon: "quality",
        children: ["Ereignisse", "Massnahmen"],
        childPermissions: { Massnahmen: "quality.manage" },
      },
      {
        id: "insights",
        label: "Kennzahlen",
        icon: "chart",
        permission: "insights.read",
        children: ["Pflege", "Leitung", "Personal"],
      },
      {
        id: "teamlead",
        label: "Teamleitung",
        icon: "team",
        permission: "team.manage",
        children: ["Mitarbeiter", "Dienste", "Aufgaben"],
      },
      {
        id: "admin",
        label: "Administration",
        icon: "settings",
        permission: "administration.manage",
        children: ["Organisation", "Mitarbeiter", "Pflegebedarf", "Konfiguration"],
      },
    ],
  },
  {
    id: "intelligence",
    label: "CareCore KI",
    modules: [
      { id: "ai", label: "CareCore KI", icon: "ai", permission: "ai.use", children: ["Assistenz", "KI-Entwürfe"] },
    ],
  },
];

const routes: Record<string, Record<string, string>> = {
  residents: {
    Übersicht: "/bewohner",
    "Verlauf & Archiv": "/bewohner/verlauf",
    Pflegeakte: "/bewohner/pflegeakte",
  },
  plan: {
    Pflegeplanung: "/pflegeplanung",
    "Ziele & Massnahmen": "/pflegeplanung/ziele-massnahmen",
    Auswertung: "/pflegeplanung/auswertung",
  },
  chart: { Schnelldokumentation: "/pflegedokumentation", Verlaufsdokumentation: "/pflegedokumentation/verlauf" },
  vitals: { Übersicht: "/vitalwerte", Entwicklung: "/vitalwerte/entwicklung", Grenzwerte: "/vitalwerte/grenzwerte" },
  med: {
    Medikamentenplan: "/medikation",
    Medikamentenrunde: "/medikation/runde",
    Bestände: "/medikation/bestaende",
    Reserven: "/medikation/reserven",
  },
  shift: { "Mein Dienst": "/betrieb/schicht", Schichtverlauf: "/betrieb/schicht/verlauf" },
  "care-calendar": { Kalender: "/betrieb/schicht/kalender" },
  messenger: { Nachrichten: "/personal/team/nachrichten" },
  cloud: { Dateien: "/carecore-one/cloud" },
  tasks: { "Meine Aufgaben": "/betrieb/aufgaben", Teamaufgaben: "/betrieb/aufgaben/team" },
  handover: { "Meine Übergabe": "/betrieb/uebergabe", "Seit letztem Dienst": "/betrieb/uebergabe/letzter-dienst" },
  schedule: { "Mein Dienstplan": "/betrieb/dienstplanung", Teamplanung: "/betrieb/dienstplanung/team" },
  assess: { Einschätzungen: "/einschaetzungen", Fälligkeiten: "/einschaetzungen/faelligkeiten" },
  wounds: { Wundübersicht: "/wundmanagement", Dokumentation: "/wundmanagement/dokumentation" },
  nutrition: { Ernährungsplan: "/ernaehrung", Trinkprotokoll: "/ernaehrung/trinkprotokoll" },
  team: { "Neuigkeiten & Kanäle": "/personal/team" },
  learn: { "Meine Schulungen": "/personal/schulungen", Pflichtnachweise: "/personal/schulungen/pflichtnachweise" },
  docs: { Dokumente: "/personal/dokumente", "Standards & Weisungen": "/personal/dokumente/standards" },
  quality: { Ereignisse: "/leitung/qualitaet", Massnahmen: "/leitung/qualitaet/massnahmen" },
  insights: {
    Pflege: "/leitung/kennzahlen",
    Leitung: "/leitung/kennzahlen/leitung",
    Personal: "/leitung/kennzahlen/personal",
  },
  admin: {
    Organisation: "/leitung/administration",
    Mitarbeiter: "/leitung/administration/mitarbeiter",
    Pflegebedarf: "/leitung/administration/pflegebedarf",
    Konfiguration: "/leitung/administration/konfiguration",
  },
  teamlead: {
    Mitarbeiter: "/leitung/teamleitung/mitarbeiter",
    Dienste: "/leitung/teamleitung/dienste",
    Aufgaben: "/leitung/teamleitung/aufgaben",
  },
  ai: { Assistenz: "/intelligenz", "KI-Entwürfe": "/intelligenz/entwuerfe" },
  rai: {
    Übersicht: "/rai",
    "interRAI-Erfassung": "/rai/erfassung",
    Fälligkeiten: "/rai/faelligkeiten",
    Berichte: "/rai/berichte",
  },
};

export function routeFor(moduleId: string, child: string) {
  const route = routes[moduleId]?.[child];
  return route ? `/c${route}` : null;
}

// Navigation limited to what the signed-in person may use. Until the permissions
// are known only the modules without a permission are shown.
export function navigationFor(permissions?: string[] | null): NavGroup[] {
  const allowed = (permission?: string) => !permission || !!permissions?.includes(permission);
  return navigation
    .map((group) => ({
      ...group,
      modules: group.modules
        .filter((module) => allowed(module.permission))
        .map((module) => ({
          ...module,
          children: module.children.filter((child) => allowed(module.childPermissions?.[child])),
        }))
        .filter((module) => module.children.length),
    }))
    .filter((group) => group.modules.length);
}

// Most used functions of a shift: one click from the sidebar, with live counts.
export type QuickLink = {
  moduleId: string;
  child: string;
  label: string;
  icon: ModuleIconName;
  badge?: "tasks" | "handover" | "medRound";
};

export const quickLinks: QuickLink[] = [
  { moduleId: "shift", child: "Mein Dienst", label: "Mein Dienst", icon: "shift" },
  { moduleId: "handover", child: "Meine Übergabe", label: "Übergabe", icon: "handover", badge: "handover" },
  { moduleId: "tasks", child: "Meine Aufgaben", label: "Meine Aufgaben", icon: "tasks", badge: "tasks" },
  { moduleId: "chart", child: "Schnelldokumentation", label: "Dokumentieren", icon: "note" },
  { moduleId: "med", child: "Medikamentenrunde", label: "Medikamentenrunde", icon: "med", badge: "medRound" },
];

// Badge per module child (flyout links) derived from the quick links.
export const badgeFor = (moduleId: string, child: string) =>
  quickLinks.find((link) => link.moduleId === moduleId && link.child === child)?.badge;

// Recently used pages of this browser, most recent first.
const RECENT_KEY = "carecore.recent-pages";
export type RecentPage = { moduleId: string; child: string };

export function readRecentPages(): RecentPage[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value) ? (value as RecentPage[]).filter((item) => routeFor(item.moduleId, item.child)) : [];
  } catch {
    return [];
  }
}

export function rememberPage(moduleId: string, child: string) {
  if (!routeFor(moduleId, child)) return;
  try {
    const next = [
      { moduleId, child },
      ...readRecentPages().filter((item) => item.moduleId !== moduleId || item.child !== child),
    ].slice(0, 6);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Without storage there is simply no history.
  }
}

export function moduleLabel(moduleId: string, child: string) {
  const entry = navigation.flatMap((group) => group.modules).find((item) => item.id === moduleId);
  if (!entry) return child;
  return entry.children.length === 1 || entry.label === child ? entry.label : `${entry.label} · ${child}`;
}

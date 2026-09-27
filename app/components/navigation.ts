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
  // Pages of the module, shown as tabs at the top of the page (the sidebar links the module only).
  children: string[];
  badge?: number;
  href?: string;
  // Permission needed to see the module (all signed-in staff when omitted).
  permission?: string;
  // Tabs that need an additional permission.
  childPermissions?: Record<string, string>;
  // Reached elsewhere (e.g. the header), so not listed in the sidebar.
  hiddenInSidebar?: boolean;
};

export type NavGroup = { id: string; label: string; modules: NavModule[] };

// Grouped along the working day: my shift, the resident and the care process,
// team and knowledge, the CareCore One tools, then leadership. Every module is one click in the sidebar;
// its pages are tabs on the page itself, so there are no nested submenus.
export const navigation: NavGroup[] = [
  {
    id: "operations",
    label: "Mein Dienst",
    modules: [
      {
        id: "shift",
        label: "Mein Dienst",
        icon: "shift",
        children: ["Heute", "Übergabe", "Seit letztem Dienst", "Verlauf"],
      },
      { id: "tasks", label: "Aufgaben", icon: "tasks", children: ["Meine Aufgaben", "Team"] },
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
        children: ["Übersicht", "Pflegeakten", "Verlauf & Archiv"],
      },
      { id: "chart", label: "Dokumentation", icon: "note", children: ["Schnelldokumentation", "Verlauf"] },
      {
        id: "med",
        label: "Medikation",
        icon: "med",
        children: ["Medikamentenrunde", "Medikamentenplan", "Reserven", "Bestände"],
      },
      {
        id: "vitals",
        label: "Vitalwerte & Ernährung",
        icon: "vitals",
        children: ["Vitalwerte", "Entwicklung", "Trinkprotokoll", "Ernährungsplan", "Grenzwerte"],
      },
      { id: "wounds", label: "Wunden", icon: "wounds", children: ["Wundübersicht", "Dokumentation"] },
      {
        id: "plan",
        label: "Planung & Einschätzungen",
        icon: "plan",
        children: ["Pflegeplanung", "Ziele & Massnahmen", "Auswertung", "Einschätzungen", "Fälligkeiten"],
      },
      {
        id: "rai",
        label: "RAI / interRAI",
        icon: "assess",
        permission: "rai.manage",
        children: ["Übersicht", "Erfassung", "Fälligkeiten", "Berichte"],
      },
    ],
  },
  {
    id: "workforce",
    label: "Team & Wissen",
    modules: [
      { id: "team", label: "Team", icon: "team", children: ["Neuigkeiten"] },
      { id: "learn", label: "Schulungen", icon: "learn", children: ["Meine Schulungen", "Pflichtnachweise"] },
      {
        id: "docs",
        label: "Dokumente",
        icon: "docs",
        children: ["Standards & Weisungen", "Dokumente"],
      },
    ],
  },
  {
    // Everyday tools for the whole house: calendar, messenger and file storage.
    id: "carecore-one",
    label: "CareCore One",
    modules: [
      { id: "one-calendar", label: "Kalender", icon: "calendar", children: ["Kalender"] },
      { id: "messenger", label: "Messenger", icon: "team", children: ["Nachrichten"] },
      { id: "cloud", label: "Cloud", icon: "docs", children: ["Gemeinsame Ablage", "Meine Dateien"] },
    ],
  },
  {
    id: "management",
    label: "Leitung",
    modules: [
      {
        id: "quality",
        label: "Qualität & Kennzahlen",
        icon: "quality",
        children: ["Ereignisse", "Massnahmen", "Kennzahlen Pflege", "Kennzahlen Leitung", "Kennzahlen Personal"],
        childPermissions: {
          Massnahmen: "quality.manage",
          "Kennzahlen Pflege": "insights.read",
          "Kennzahlen Leitung": "insights.read",
          "Kennzahlen Personal": "insights.read",
        },
      },
      {
        id: "staff",
        label: "Mitarbeitende & Dienste",
        icon: "team",
        children: ["Mitarbeitende", "Dienste", "Aufgaben", "Profile & Rollen"],
        childPermissions: {
          Mitarbeitende: "team.manage",
          Dienste: "team.manage",
          Aufgaben: "team.manage",
          "Profile & Rollen": "administration.manage",
        },
      },
      {
        id: "admin",
        label: "Administration",
        icon: "settings",
        permission: "administration.manage",
        children: ["Organisation", "Pflegebedarf", "Konfiguration"],
      },
    ],
  },
  {
    id: "intelligence",
    label: "CareCore KI",
    modules: [
      {
        id: "ai",
        label: "CareCore KI",
        icon: "ai",
        permission: "ai.use",
        hiddenInSidebar: true,
        children: ["Assistenz", "KI-Entwürfe"],
      },
    ],
  },
];

const routes: Record<string, Record<string, string>> = {
  shift: {
    Heute: "/betrieb/schicht",
    Übergabe: "/betrieb/uebergabe",
    "Seit letztem Dienst": "/betrieb/uebergabe/letzter-dienst",
    Verlauf: "/betrieb/schicht/verlauf",
  },
  tasks: { "Meine Aufgaben": "/betrieb/aufgaben", Team: "/betrieb/aufgaben/team" },
  schedule: { "Mein Dienstplan": "/betrieb/dienstplanung", Teamplanung: "/betrieb/dienstplanung/team" },
  residents: {
    Übersicht: "/bewohner",
    Pflegeakten: "/bewohner/pflegeakte",
    "Verlauf & Archiv": "/bewohner/verlauf",
  },
  chart: { Schnelldokumentation: "/pflegedokumentation", Verlauf: "/pflegedokumentation/verlauf" },
  med: {
    Medikamentenrunde: "/medikation/runde",
    Medikamentenplan: "/medikation",
    Reserven: "/medikation/reserven",
    Bestände: "/medikation/bestaende",
  },
  vitals: {
    Vitalwerte: "/vitalwerte",
    Entwicklung: "/vitalwerte/entwicklung",
    Trinkprotokoll: "/ernaehrung/trinkprotokoll",
    Ernährungsplan: "/ernaehrung",
    Grenzwerte: "/vitalwerte/grenzwerte",
  },
  wounds: { Wundübersicht: "/wundmanagement", Dokumentation: "/wundmanagement/dokumentation" },
  plan: {
    Pflegeplanung: "/pflegeplanung",
    "Ziele & Massnahmen": "/pflegeplanung/ziele-massnahmen",
    Auswertung: "/pflegeplanung/auswertung",
    Einschätzungen: "/einschaetzungen",
    Fälligkeiten: "/einschaetzungen/faelligkeiten",
  },
  rai: {
    Übersicht: "/rai",
    Erfassung: "/rai/erfassung",
    Fälligkeiten: "/rai/faelligkeiten",
    Berichte: "/rai/berichte",
  },
  team: { Neuigkeiten: "/personal/team" },
  learn: { "Meine Schulungen": "/personal/schulungen", Pflichtnachweise: "/personal/schulungen/pflichtnachweise" },
  docs: {
    "Standards & Weisungen": "/personal/dokumente/standards",
    Dokumente: "/personal/dokumente",
  },
  "one-calendar": { Kalender: "/carecore-one/kalender" },
  messenger: { Nachrichten: "/carecore-one/messenger" },
  cloud: { "Gemeinsame Ablage": "/carecore-one/ablage", "Meine Dateien": "/carecore-one/cloud" },
  quality: {
    Ereignisse: "/leitung/qualitaet",
    Massnahmen: "/leitung/qualitaet/massnahmen",
    "Kennzahlen Pflege": "/leitung/kennzahlen",
    "Kennzahlen Leitung": "/leitung/kennzahlen/leitung",
    "Kennzahlen Personal": "/leitung/kennzahlen/personal",
  },
  staff: {
    Mitarbeitende: "/leitung/teamleitung/mitarbeiter",
    Dienste: "/leitung/teamleitung/dienste",
    Aufgaben: "/leitung/teamleitung/aufgaben",
    "Profile & Rollen": "/leitung/administration/mitarbeiter",
  },
  admin: {
    Organisation: "/leitung/administration",
    Pflegebedarf: "/leitung/administration/pflegebedarf",
    Konfiguration: "/leitung/administration/konfiguration",
  },
  ai: { Assistenz: "/intelligenz", "KI-Entwürfe": "/intelligenz/entwuerfe" },
};

export function routeFor(moduleId: string, child: string) {
  const route = routes[moduleId]?.[child];
  return route ? `/c${route}` : null;
}

// The module and tab of a page, found by its address (longest matching route, so
// detail pages below a tab keep it active). Pages outside the navigation give null.
export function activePage(pathname: string | null): { moduleId: string; child: string } | null {
  if (!pathname) return null;
  const path = (pathname.replace(/^\/c(?=\/|$)/, "") || "/").replace(/\/$/, "") || "/";
  let best: { moduleId: string; child: string; length: number } | null = null;
  for (const [moduleId, children] of Object.entries(routes))
    for (const [child, route] of Object.entries(children))
      if ((path === route || path.startsWith(`${route}/`)) && (!best || route.length > best.length))
        best = { moduleId, child, length: route.length };
  return best && { moduleId: best.moduleId, child: best.child };
}

export function moduleById(moduleId: string) {
  return navigation.flatMap((group) => group.modules).find((module) => module.id === moduleId) ?? null;
}

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

// Navigation of the sidebar and the mobile menu: without modules reached elsewhere.
export const sidebarNavigation = (permissions?: string[] | null) =>
  navigationFor(permissions)
    .map((group) => ({ ...group, modules: group.modules.filter((module) => !module.hiddenInSidebar) }))
    .filter((group) => group.modules.length);

export type BadgeKey = "tasks" | "handover" | "medRound" | "messages";

// Most used functions of a shift: one click from the sidebar, with live counts.
export type QuickLink = {
  moduleId: string;
  child: string;
  label: string;
  icon: ModuleIconName;
  badge?: "tasks" | "handover" | "medRound";
  shortcut: string;
};

export const quickLinks: QuickLink[] = [
  { moduleId: "shift", child: "Heute", label: "Mein Dienst", icon: "shift", shortcut: "S" },
  { moduleId: "shift", child: "Übergabe", label: "Übergabe", icon: "handover", badge: "handover", shortcut: "Ü" },
  {
    moduleId: "tasks",
    child: "Meine Aufgaben",
    label: "Meine Aufgaben",
    icon: "tasks",
    badge: "tasks",
    shortcut: "A",
  },
  { moduleId: "chart", child: "Schnelldokumentation", label: "Dokumentieren", icon: "note", shortcut: "D" },
  {
    moduleId: "med",
    child: "Medikamentenrunde",
    // Soft hyphen: breaks as "Medikamenten-runde" where space is short (mobile menu).
    label: "Medikamenten\u00adrunde",
    icon: "med",
    badge: "medRound",
    shortcut: "R",
  },
];

// Badge per tab derived from the quick links, and all badges of a module (sidebar).
export const badgeFor = (moduleId: string, child: string) =>
  quickLinks.find((link) => link.moduleId === moduleId && link.child === child)?.badge;
// Counts of modules without a quick link; shown on the module and its sidebar group.
const moduleOnlyBadges: Record<string, BadgeKey[]> = { messenger: ["messages"] };
export const moduleBadges = (moduleId: string): BadgeKey[] => [
  ...quickLinks.filter((link) => link.moduleId === moduleId && link.badge).map((link) => link.badge!),
  ...(moduleOnlyBadges[moduleId] ?? []),
];
export const groupBadges = (group: NavGroup): BadgeKey[] =>
  group.modules.flatMap((module) => moduleOnlyBadges[module.id] ?? []);

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

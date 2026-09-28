"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModulePageShell from "@/app/components/module-page-shell";
import { type ModuleIconName } from "@/app/components/module-icon";
import { ModuleIcon } from "@/app/components/module-icon";
import { loadWorkContext, useWorkContext } from "@/app/components/care-context";
import { ProfilePopover } from "@/app/components/header-profile-popover";
import { announcePreferences } from "@/app/components/appearance";
import { formatDateTime, requestJson, useApiData } from "@/app/components/workspace-ui";
import {
  NOTIFY_CATEGORIES,
  START_PAGES,
  type NotifyCategory,
  type StartPage,
  type UserPreferences,
  type UserSettings,
} from "@/lib/user-settings-shared";
import SettingsSelect from "./settings-select";
import PasswordChangePopover from "./password-change-popover";
import PushControl from "./push-control";

export type SettingsView = "overview" | "profile" | "notifications" | "security" | "appearance";

type Item = {
  id: string;
  title: string;
  description: string;
  value: string;
  icon: ModuleIconName;
  // What the detail card shows for the item.
  detail:
    | { kind: "open"; view: SettingsView; text: string }
    | { kind: "profile"; text: string }
    | { kind: "info"; text: string; lines?: string[] }
    | { kind: "notify"; category: NotifyCategory; text: string }
    | { kind: "password"; text: string }
    | { kind: "sessions"; text: string }
    | { kind: "push"; text: string }
    | { kind: "select"; text: string; label: string; value: string; options: string[]; save: (value: string) => void };
};

const VIEWS: Record<SettingsView, { title: string; eyebrow: string; description: string }> = {
  overview: {
    eyebrow: "CareCore Einstellungen",
    title: "Einstellungen",
    description: "Dein persönlicher Bereich für Profil, Benachrichtigungen, Sicherheit und Darstellung.",
  },
  profile: {
    eyebrow: "Einstellungen · Profil",
    title: "Profil & Präferenzen",
    description: "So erscheinst du in Übergaben, Nachrichten und Verantwortlichkeiten.",
  },
  notifications: {
    eyebrow: "Einstellungen · Benachrichtigungen",
    title: "Benachrichtigungen",
    description: "Lege fest, welche Hinweise dich erreichen. Kritische Hinweise erhältst du immer.",
  },
  security: {
    eyebrow: "Einstellungen · Sicherheit",
    title: "Sicherheit & Zugriff",
    description: "Passwort und angemeldete Geräte.",
  },
  appearance: {
    eyebrow: "Einstellungen · Darstellung",
    title: "Darstellung",
    description: "Passe CareCore an deine Arbeitsweise an. Gilt auf allen deinen Geräten.",
  },
};

const NAV: Array<[SettingsView, string, ModuleIconName]> = [
  ["overview", "Übersicht", "settings"],
  ["profile", "Profil & Präferenzen", "team"],
  ["notifications", "Benachrichtigungen", "bell"],
  ["security", "Sicherheit & Zugriff", "quality"],
  ["appearance", "Darstellung", "pulse"],
];

const TEXT_SIZES = { standard: "Standard", large: "Gross" } as const;
const CONTRASTS = { standard: "Standard", high: "Hoher Kontrast" } as const;
const PERMISSION_LABELS: Record<string, string> = {
  "residents.read": "Bewohnerakten lesen",
  "residents.write": "Bewohnerakten bearbeiten",
  "documentation.write": "Dokumentieren",
  "medication.manage": "Medikation",
  "schedule.manage": "Dienstplanung",
  "team.manage": "Teamleitung",
  "quality.manage": "Qualitätsmanagement",
  "insights.read": "Kennzahlen",
  "administration.manage": "Administration",
  "rai.manage": "RAI / interRAI",
  "ai.use": "CareCore KI",
};

function daysAgo(value: string | null) {
  if (!value) return null;
  return Math.floor((Date.now() - Date.parse(value)) / 86_400_000);
}

export default function SettingsWorkspaceDetail({ view }: { view: SettingsView }) {
  const router = useRouter();
  const context = useWorkContext();
  const settings = useApiData<UserSettings>("/api/me/settings");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const page = VIEWS[view];

  return (
    <ModulePageShell pageClass={`settings-page settings-${view}`} locationSecondary="Persönlicher Bereich">
      {(showToast) => {
        const data = settings.data;
        const savePreferences = async (change: Partial<UserPreferences>, message: string) => {
          try {
            const result = await requestJson<{ preferences: UserPreferences }>("/api/me/settings", {
              method: "PATCH",
              body: change,
            });
            settings.reload();
            announcePreferences(result.preferences);
            void loadWorkContext(true);
            showToast(message);
          } catch (reason) {
            showToast((reason as Error).message);
          }
        };
        const items = data ? itemsFor(view, data, savePreferences) : [];
        const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
        const enabledCount = data ? Object.values(data.preferences.notify).filter(Boolean).length : 0;

        return (
          <>
            <main className="workspace settings-workspace">
              <section className="settings-heading page-heading">
                <div className="heading-copy">
                  <p className="eyebrow">{page.eyebrow}</p>
                  <h1>{page.title}</h1>
                  <p>{page.description}</p>
                </div>
                {view === "profile" && (
                  <button className="primary-button" type="button" onClick={() => setProfileOpen(true)}>
                    <ModuleIcon name="team" className="button-icon" />
                    Profil bearbeiten
                  </button>
                )}
                {view === "security" && (
                  <button className="primary-button" type="button" onClick={() => setPasswordOpen(true)}>
                    <ModuleIcon name="quality" className="button-icon" />
                    Passwort ändern
                  </button>
                )}
              </section>
              <div className="settings-layout">
                <aside className="card settings-nav">
                  <div className="card-header">
                    <div>
                      <p className="eyebrow">Mein Bereich</p>
                      <h2 className="card-title">Einstellungen</h2>
                    </div>
                  </div>
                  <nav aria-label="Einstellungsnavigation">
                    {NAV.map(([id, label, icon]) => (
                      <button
                        className={view === id ? "active" : ""}
                        type="button"
                        key={id}
                        aria-current={view === id ? "page" : undefined}
                        onClick={() => router.push(id === "overview" ? "/c/einstellungen" : `/c/einstellungen/${id}`)}
                      >
                        <ModuleIcon name={icon} />
                        <span>{label}</span>
                        <ModuleIcon name="chevron" className="chevron" />
                      </button>
                    ))}
                  </nav>
                </aside>
                <section className="settings-content">
                  <section className="card settings-list">
                    <div className="card-header">
                      <div>
                        <p className="eyebrow">Arbeitsbereich</p>
                        <h2 className="card-title">{view === "overview" ? "Deine Einstellungen" : page.title}</h2>
                        <p className="card-subtitle">
                          {settings.error ??
                            (data
                              ? view === "notifications"
                                ? `${enabledCount} von ${Object.keys(NOTIFY_CATEGORIES).length} Kategorien aktiv`
                                : `${items.length} Bereiche`
                              : "Wird geladen …")}
                        </p>
                      </div>
                    </div>
                    <div>
                      {items.map((item) => (
                        <button
                          className={selected?.id === item.id ? "selected" : ""}
                          type="button"
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <span className="settings-item-icon">
                            <ModuleIcon name={item.icon} />
                          </span>
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.description}</small>
                          </span>
                          <span className="settings-item-value">{item.value}</span>
                          <ModuleIcon name="chevron" className="chevron" />
                        </button>
                      ))}
                    </div>
                  </section>
                  {selected && data && (
                    <section className="card settings-detail">
                      <div className="card-header">
                        <div>
                          <p className="eyebrow">Ausgewählt</p>
                          <h2 className="card-title">{selected.title}</h2>
                          <p className="card-subtitle">{selected.value}</p>
                        </div>
                      </div>
                      <div className="settings-detail-body">
                        <p>{selected.detail.text}</p>
                        <DetailControl
                          item={selected}
                          data={data}
                          onOpenView={(next) => router.push(`/c/einstellungen/${next}`)}
                          onProfile={() => setProfileOpen(true)}
                          onPassword={() => setPasswordOpen(true)}
                          onMessage={showToast}
                          onToggle={(category, value) =>
                            savePreferences(
                              { notify: { ...data.preferences.notify, [category]: value } },
                              `${NOTIFY_CATEGORIES[category].label} ${value ? "eingeschaltet" : "ausgeschaltet"}`,
                            )
                          }
                          onEndSessions={async (id) => {
                            try {
                              const result = await requestJson<{ ended: number }>(
                                `/api/me/sessions${id ? `?id=${id}` : ""}`,
                                { method: "DELETE" },
                              );
                              settings.reload();
                              showToast(
                                result.ended
                                  ? `${result.ended} Gerät${result.ended === 1 ? "" : "e"} abgemeldet`
                                  : "Keine anderen Geräte angemeldet",
                              );
                            } catch (reason) {
                              showToast((reason as Error).message);
                            }
                          }}
                        />
                      </div>
                      <div className="settings-detail-footer">
                        <small>Änderungen werden sofort gespeichert.</small>
                      </div>
                    </section>
                  )}
                </section>
              </div>
            </main>
            <PasswordChangePopover
              key={passwordOpen ? "open" : "closed"}
              open={passwordOpen}
              onClose={() => setPasswordOpen(false)}
              onSuccess={() => {
                settings.reload();
                showToast("Passwort geändert · andere Geräte wurden abgemeldet");
              }}
            />
            {profileOpen && (
              <ProfilePopover
                context={context}
                onClose={() => setProfileOpen(false)}
                onSave={() => {
                  settings.reload();
                  void loadWorkContext(true);
                  showToast("Profil gespeichert");
                }}
              />
            )}
          </>
        );
      }}
    </ModulePageShell>
  );
}

function DetailControl({
  item,
  data,
  onOpenView,
  onProfile,
  onPassword,
  onToggle,
  onEndSessions,
  onMessage,
}: {
  item: Item;
  data: UserSettings;
  onOpenView: (view: SettingsView) => void;
  onProfile: () => void;
  onPassword: () => void;
  onMessage: (message: string) => void;
  onToggle: (category: NotifyCategory, value: boolean) => void;
  onEndSessions: (id: string | null) => void;
}) {
  const detail = item.detail;
  if (detail.kind === "open")
    return (
      <div className="settings-action">
        <span>{item.title}</span>
        <button className="secondary-button" type="button" onClick={() => onOpenView(detail.view)}>
          Öffnen
        </button>
      </div>
    );
  if (detail.kind === "profile")
    return (
      <div className="settings-action">
        <span>Funktion, Telefon, fester Wohnbereich</span>
        <button className="secondary-button" type="button" onClick={onProfile}>
          Profil bearbeiten
        </button>
      </div>
    );
  if (detail.kind === "password")
    return (
      <div className="settings-action">
        <span>Mindestens 10 Zeichen</span>
        <button className="secondary-button" type="button" onClick={onPassword}>
          Passwort ändern
        </button>
      </div>
    );
  if (detail.kind === "notify")
    return (
      <label className="settings-toggle">
        <span>Benachrichtigungen erhalten</span>
        <input
          type="checkbox"
          checked={data.preferences.notify[detail.category]}
          onChange={(event) => onToggle(detail.category, event.target.checked)}
        />
        <i />
      </label>
    );
  if (detail.kind === "push") return <PushControl onMessage={onMessage} />;
  if (detail.kind === "select")
    return (
      <label className="settings-select">
        <span>{detail.label}</span>
        <SettingsSelect label={detail.label} value={detail.value} options={detail.options} onChange={detail.save} />
      </label>
    );
  if (detail.kind === "sessions")
    return (
      <div className="settings-notification-summary">
        <div className="settings-notification-list">
          {data.security.sessions.map((session) => (
            <article key={session.id}>
              <span className="settings-notification-icon">
                <ModuleIcon name={session.current ? "check" : "pulse"} />
              </span>
              <span>
                <strong>{session.device}</strong>
                <small>Angemeldet {formatDateTime(session.createdAt)}</small>
              </span>
              {session.current ? (
                <span className="settings-notification-value">Dieses Gerät</span>
              ) : (
                <button className="quiet-button" type="button" onClick={() => onEndSessions(session.id)}>
                  Abmelden
                </button>
              )}
            </article>
          ))}
        </div>
        <button
          className="secondary-button settings-notification-link"
          type="button"
          disabled={data.security.sessions.length < 2}
          onClick={() => onEndSessions(null)}
        >
          Alle anderen Geräte abmelden
        </button>
      </div>
    );
  return detail.lines?.length ? (
    <ul className="settings-permission-list">
      {detail.lines.map((line) => (
        <li key={line}>
          <ModuleIcon name="check" /> {line}
        </li>
      ))}
    </ul>
  ) : null;
}

function itemsFor(
  view: SettingsView,
  data: UserSettings,
  save: (change: Partial<UserPreferences>, message: string) => void,
): Item[] {
  const { profile, preferences, security } = data;
  const passwordAge = daysAgo(security.passwordChangedAt);
  const passwordValue =
    passwordAge === null
      ? "noch nie geändert"
      : passwordAge === 0
        ? "heute geändert"
        : `vor ${passwordAge} Tagen geändert`;
  const enabled = Object.values(preferences.notify).filter(Boolean).length;
  const total = Object.keys(NOTIFY_CATEGORIES).length;
  const appearance = [TEXT_SIZES[preferences.textSize], CONTRASTS[preferences.contrast]].join(" · ");

  if (view === "overview")
    return [
      {
        id: "profile",
        title: "Profil & Präferenzen",
        description: "Name, Funktion, Telefon und fester Wohnbereich",
        value: profile.displayName,
        icon: "team",
        detail: {
          kind: "open",
          view: "profile",
          text: `${profile.jobTitle || "Funktion nicht angegeben"} · ${profile.roleName}`,
        },
      },
      {
        id: "notifications",
        title: "Benachrichtigungen",
        description: "Aufgaben, Dienste, Schulungen, Team und mehr",
        value: `${enabled} von ${total} aktiv`,
        icon: "bell",
        detail: { kind: "open", view: "notifications", text: "Kritische Hinweise erhältst du immer." },
      },
      {
        id: "security",
        title: "Sicherheit & Zugriff",
        description: "Passwort und angemeldete Geräte",
        value: `${security.sessions.length} Gerät${security.sessions.length === 1 ? "" : "e"}`,
        icon: "quality",
        detail: { kind: "open", view: "security", text: `Passwort ${passwordValue}.` },
      },
      {
        id: "appearance",
        title: "Darstellung",
        description: "Schriftgrösse, Kontrast und Startseite",
        value: appearance,
        icon: "pulse",
        detail: { kind: "open", view: "appearance", text: `Startseite: ${START_PAGES[preferences.startPage].label}.` },
      },
    ];

  if (view === "profile")
    return [
      {
        id: "profile-name",
        title: profile.displayName,
        description: `Benutzername ${profile.username}`,
        value: profile.jobTitle || "Funktion offen",
        icon: "team",
        detail: {
          kind: "profile",
          text: "Dein Name wird in Übergaben, Nachrichten und Verantwortlichkeiten angezeigt.",
        },
      },
      {
        id: "profile-unit",
        title: "Fester Wohnbereich",
        description: "Voreinstellung für Kopfzeile, Tagesliste und Übergaben",
        value: profile.careUnit ?? "Nicht festgelegt",
        icon: "building",
        detail: { kind: "profile", text: "Der feste Wohnbereich wird beim Öffnen von CareCore vorausgewählt." },
      },
      {
        id: "profile-phone",
        title: "Telefon",
        description: "Für Rückfragen im Team",
        value: profile.phone || "–",
        icon: "handover",
        detail: { kind: "profile", text: "Deine Telefonnummer sehen Kolleginnen und Kollegen deines Hauses." },
      },
      {
        id: "profile-role",
        title: "Rolle & Berechtigungen",
        description: "Wird von der Administration vergeben",
        value: profile.roleName,
        icon: "quality",
        detail: {
          kind: "info",
          text: "Deine Rolle bestimmt, welche Bereiche du siehst und bearbeiten darfst.",
          lines: profile.permissions.map((permission) => PERMISSION_LABELS[permission] ?? permission),
        },
      },
    ];

  if (view === "notifications")
    return [
      ...(Object.keys(NOTIFY_CATEGORIES) as NotifyCategory[]).map((category): Item => ({
        id: `notify-${category}`,
        title: NOTIFY_CATEGORIES[category].label,
        description: NOTIFY_CATEGORIES[category].detail,
        value: preferences.notify[category] ? "Aktiv" : "Aus",
        icon: "bell",
        detail: {
          kind: "notify",
          category,
          text: `${NOTIFY_CATEGORIES[category].detail}. Ausgeschaltete Hinweise werden nicht angezeigt; kritische Hinweise erhältst du immer.`,
        },
      })),
      {
        id: "push",
        title: "Push-Nachrichten",
        description: "Hinweise auch bei geschlossener App",
        value: "Dieses Gerät",
        icon: "bell",
        detail: {
          kind: "push",
          text: "Neue Benachrichtigungen erscheinen als Mitteilung auf diesem Gerät, auch wenn CareCore geschlossen ist. Angezeigt wird nur der Titel; es gelten die Kategorien oben.",
        },
      },
    ];

  if (view === "security")
    return [
      {
        id: "sec-password",
        title: "Passwort",
        description: "Ein neues Passwort meldet alle anderen Geräte ab",
        value: passwordValue,
        icon: "quality",
        detail: {
          kind: "password",
          text: "Wähle ein Passwort mit mindestens 10 Zeichen, das du nirgends sonst verwendest.",
        },
      },
      {
        id: "sec-sessions",
        title: "Angemeldete Geräte",
        description: "Beende Sitzungen auf Geräten, die du nicht mehr verwendest",
        value: `${security.sessions.length} aktiv`,
        icon: "pulse",
        detail: { kind: "sessions", text: "Hier siehst du, wo du bei CareCore angemeldet bist." },
      },
    ];

  return [
    {
      id: "app-text",
      title: "Schriftgrösse",
      description: "Grössere Schrift und Bedienelemente",
      value: TEXT_SIZES[preferences.textSize],
      icon: "note",
      detail: {
        kind: "select",
        text: "„Gross“ vergrössert alle Seiten um rund 12 %.",
        label: "Schriftgrösse",
        value: TEXT_SIZES[preferences.textSize],
        options: Object.values(TEXT_SIZES),
        save: (label) =>
          save({ textSize: label === TEXT_SIZES.large ? "large" : "standard" }, `Schriftgrösse: ${label}`),
      },
    },
    {
      id: "app-contrast",
      title: "Kontrast",
      description: "Dunklere Texte und Linien",
      value: CONTRASTS[preferences.contrast],
      icon: "quality",
      detail: {
        kind: "select",
        text: "Hoher Kontrast verbessert die Lesbarkeit von Nebentexten und Linien.",
        label: "Kontrast",
        value: CONTRASTS[preferences.contrast],
        options: Object.values(CONTRASTS),
        save: (label) => save({ contrast: label === CONTRASTS.high ? "high" : "standard" }, `Kontrast: ${label}`),
      },
    },
    {
      id: "app-start",
      title: "Startseite",
      description: "Seite nach der Anmeldung",
      value: START_PAGES[preferences.startPage].label,
      icon: "home",
      detail: {
        kind: "select",
        text: "Diese Seite öffnet sich nach der Anmeldung.",
        label: "Startseite",
        value: START_PAGES[preferences.startPage].label,
        options: Object.values(START_PAGES).map((page) => page.label),
        save: (label) =>
          save(
            {
              startPage:
                (Object.keys(START_PAGES) as StartPage[]).find((key) => START_PAGES[key].label === label) ?? "home",
            },
            `Startseite: ${label}`,
          ),
      },
    },
  ];
}

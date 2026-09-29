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
import { clearOfflineData } from "@/app/components/offline-queue";
import { SETTING_DEFINITIONS, SETTING_KEYS, type AppSettings, type SettingKey } from "@/lib/settings-shared";
import {
  AUTO_LOGOUT_MINUTES,
  CONTRASTS,
  MOTIONS,
  THEMES,
  NOTIFY_CATEGORIES,
  START_PAGES,
  TEXT_SIZES,
  autoLogoutLabel,
  type AutoLogout,
  type NotifyCategory,
  type QuietHours,
  type StartPage,
  type TextSize,
  type UserPreferences,
  type UserSettings,
} from "@/lib/user-settings-shared";
import SettingsSelect from "./settings-select";
import PasswordChangePopover from "./password-change-popover";
import PushControl from "./push-control";
import MfaControl from "./mfa-control";

export type SettingsView =
  "overview" | "profile" | "notifications" | "security" | "appearance" | "privacy" | "organization";

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
    | { kind: "mfa"; text: string }
    | { kind: "toggle"; text: string; label: string; checked: boolean; note?: string; save: (value: boolean) => void }
    | { kind: "quiet"; text: string; value: QuietHours; save: (value: QuietHours) => Promise<boolean> }
    | { kind: "action"; text: string; label: string; danger?: boolean; run: () => void }
    | { kind: "link"; text: string; label: string; href: string }
    | {
        kind: "organization";
        text: string;
        setting: SettingKey;
        value: AppSettings[SettingKey];
        save: (change: { enabled?: boolean; value?: number }) => Promise<boolean>;
      }
    | { kind: "select"; text: string; label: string; value: string; options: string[]; save: (value: string) => void };
};

const VIEWS: Record<SettingsView, { title: string; eyebrow: string; description: string }> = {
  overview: {
    eyebrow: "CareCore Einstellungen",
    title: "Einstellungen",
    description:
      "Profil, Benachrichtigungen, Sicherheit, Darstellung und Datenschutz – und für die Administration die Einstellungen der Einrichtung.",
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
    description: "Passwort, Zwei-Faktor-Anmeldung und angemeldete Geräte.",
  },
  appearance: {
    eyebrow: "Einstellungen · Darstellung",
    title: "Darstellung & Bedienung",
    description: "Passe CareCore an deine Arbeitsweise an. Gilt auf allen deinen Geräten.",
  },
  privacy: {
    eyebrow: "Einstellungen · Datenschutz",
    title: "Datenschutz & Daten",
    description: "Deine Daten herunterladen, dieses Gerät aufräumen und Einstellungen zurücksetzen.",
  },
  organization: {
    eyebrow: "Einstellungen · Einrichtung",
    title: "Einrichtung",
    description: "Einstellungen für alle Mitarbeitenden der Organisation. Jede Änderung wird protokolliert.",
  },
};

const NAV: Array<[SettingsView, string, ModuleIconName]> = [
  ["overview", "Übersicht", "settings"],
  ["profile", "Profil & Präferenzen", "team"],
  ["notifications", "Benachrichtigungen", "bell"],
  ["security", "Sicherheit & Zugriff", "quality"],
  ["appearance", "Darstellung & Bedienung", "pulse"],
  ["privacy", "Datenschutz & Daten", "docs"],
  ["organization", "Einrichtung", "building"],
];

const ADMIN_VIEWS: SettingsView[] = ["organization"];
const pick = <K extends string>(labels: Record<K, string>, label: string, fallback: K) =>
  (Object.keys(labels) as K[]).find((key) => labels[key] === label) ?? fallback;
const PERMISSION_LABELS: Record<string, string> = {
  "residents.read": "Bewohnerakten lesen",
  "residents.write": "Bewohnerakten bearbeiten",
  "documentation.write": "Dokumentieren",
  "medication.administer": "Medikation verabreichen",
  "medication.manage": "Medikation verwalten (Verordnungen, Bestände)",
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
  const isAdmin = settings.data?.profile.permissions.includes("administration.manage") ?? false;
  const organization = useApiData<{ settings: AppSettings }>(
    view === "organization" && isAdmin ? "/api/settings" : null,
  );

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
        const saveOrganization = async (key: SettingKey, change: { enabled?: boolean; value?: number }) => {
          try {
            await requestJson(`/api/settings/${key}`, { method: "PATCH", body: change });
            organization.reload();
            void loadWorkContext(true);
            const title = SETTING_DEFINITIONS[key].title;
            showToast(
              change.enabled === undefined
                ? `${title} gespeichert`
                : `${title} ${change.enabled ? "eingeschaltet" : "ausgeschaltet"}`,
            );
            return true;
          } catch (reason) {
            showToast((reason as Error).message);
            return false;
          }
        };
        const run = async (action: () => Promise<string>) => {
          try {
            showToast(await action());
          } catch (reason) {
            showToast((reason as Error).message);
          }
        };
        const actions: Actions = {
          exportData: () => {
            const link = document.createElement("a");
            link.href = "/api/me/export";
            link.download = "";
            link.click();
            showToast("Deine Daten werden heruntergeladen");
          },
          clearDevice: () => {
            clearOfflineData();
            showToast("Zwischengespeicherte Seiten und Daten auf diesem Gerät gelöscht");
          },
          endPushAll: () =>
            void run(async () => {
              const result = await requestJson<{ ended: number }>("/api/me/settings?scope=push", { method: "DELETE" });
              return result.ended
                ? `Push-Nachrichten auf ${result.ended} Gerät${result.ended === 1 ? "" : "en"} beendet`
                : "Push war auf keinem Gerät eingeschaltet";
            }),
          reset: () =>
            void run(async () => {
              const result = await requestJson<{ preferences: UserPreferences }>("/api/me/settings?scope=preferences", {
                method: "DELETE",
              });
              settings.reload();
              announcePreferences(result.preferences);
              void loadWorkContext(true);
              return "Persönliche Einstellungen zurückgesetzt";
            }),
        };
        const items = data
          ? itemsFor(view, data, savePreferences, {
              isAdmin,
              organization: organization.data?.settings ?? null,
              organizationError: organization.error ?? null,
              organizationShortcuts: context?.settings.keyboardShortcuts.enabled ?? true,
              saveOrganization,
              actions,
            })
          : [];
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
                    {NAV.filter(([id]) => isAdmin || !ADMIN_VIEWS.includes(id)).map(([id, label, icon]) => (
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
                          onChanged={settings.reload}
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
  onChanged,
}: {
  item: Item;
  data: UserSettings;
  onOpenView: (view: SettingsView) => void;
  onProfile: () => void;
  onPassword: () => void;
  onMessage: (message: string) => void;
  onChanged: () => void;
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
  if (detail.kind === "mfa") return <MfaControl onMessage={onMessage} onChanged={onChanged} />;
  if (detail.kind === "toggle")
    return (
      <>
        <label className="settings-toggle">
          <span>{detail.label}</span>
          <input type="checkbox" checked={detail.checked} onChange={(event) => detail.save(event.target.checked)} />
          <i />
        </label>
        {detail.note && <p className="settings-note">{detail.note}</p>}
      </>
    );
  if (detail.kind === "quiet") return <QuietHoursControl key={JSON.stringify(detail.value)} detail={detail} />;
  if (detail.kind === "action")
    return (
      <div className="settings-action">
        <span>{item.title}</span>
        <button
          className={detail.danger ? "appointment-danger-button" : "secondary-button"}
          type="button"
          onClick={detail.run}
        >
          {detail.label}
        </button>
      </div>
    );
  if (detail.kind === "link")
    return (
      <div className="settings-action">
        <span>{item.title}</span>
        <a className="secondary-button settings-link-button" href={detail.href}>
          {detail.label}
        </a>
      </div>
    );
  if (detail.kind === "organization")
    return <OrganizationSettingControl key={JSON.stringify(detail.value)} detail={detail} />;
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

type QuietDetail = Extract<Item["detail"], { kind: "quiet" }>;
type OrganizationDetail = Extract<Item["detail"], { kind: "organization" }>;

// Ruhezeit für Push-Nachrichten: ein/aus und Beginn/Ende (Ortszeit der Einrichtung).
function QuietHoursControl({ detail }: { detail: QuietDetail }) {
  const [draft, setDraft] = useState(detail.value);
  const [saving, setSaving] = useState(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(detail.value);
  const save = async (next: QuietHours) => {
    setSaving(true);
    await detail.save(next);
    setSaving(false);
  };
  return (
    <div className="settings-quiet">
      <label className="settings-toggle">
        <span>Ruhezeit einhalten</span>
        <input
          type="checkbox"
          checked={draft.enabled}
          disabled={saving}
          onChange={(event) => {
            const next = { ...draft, enabled: event.target.checked };
            setDraft(next);
            void save(next);
          }}
        />
        <i />
      </label>
      <label className="settings-toggle">
        <span>Kritische Hinweise auch in der Ruhezeit</span>
        <input
          type="checkbox"
          checked={draft.critical}
          disabled={saving}
          onChange={(event) => {
            const next = { ...draft, critical: event.target.checked };
            setDraft(next);
            void save(next);
          }}
        />
        <i />
      </label>
      <div className="settings-quiet-times">
        <label>
          <span>Von</span>
          <input
            type="time"
            value={draft.from}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
          />
        </label>
        <label>
          <span>Bis</span>
          <input type="time" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
        </label>
        <button
          className="secondary-button"
          type="button"
          disabled={!changed || saving}
          onClick={() => void save(draft)}
        >
          Zeiten speichern
        </button>
      </div>
    </div>
  );
}

// Einstellung der Einrichtung (Leitung › Konfiguration): ein/aus und, wo vorgesehen, ein Wert.
function OrganizationSettingControl({ detail }: { detail: OrganizationDetail }) {
  const definition = SETTING_DEFINITIONS[detail.setting];
  const [value, setValue] = useState(detail.value.value === null ? "" : String(detail.value.value));
  const [saving, setSaving] = useState(false);
  const number = Number(value);
  const valid =
    value.trim() !== "" &&
    Number.isInteger(number) &&
    number >= (definition.min ?? 0) &&
    number <= (definition.max ?? Infinity);
  const save = async (change: { enabled?: boolean; value?: number }) => {
    setSaving(true);
    await detail.save(change);
    setSaving(false);
  };
  return (
    <div className="settings-quiet">
      <label className="settings-toggle">
        <span>Eingeschaltet</span>
        <input
          type="checkbox"
          checked={detail.value.enabled}
          disabled={saving}
          onChange={(event) => void save({ enabled: event.target.checked })}
        />
        <i />
      </label>
      {definition.unit && (
        <div className="settings-quiet-times">
          <label>
            <span>
              Wert ({definition.unit}, {definition.min}–{definition.max})
            </span>
            <input inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
          <button
            className="secondary-button"
            type="button"
            disabled={saving || !valid || number === detail.value.value}
            onClick={() => void save({ value: number })}
          >
            Wert speichern
          </button>
        </div>
      )}
    </div>
  );
}

type Actions = { exportData: () => void; clearDevice: () => void; endPushAll: () => void; reset: () => void };
type Extras = {
  isAdmin: boolean;
  organization: AppSettings | null;
  organizationError: string | null;
  organizationShortcuts: boolean;
  saveOrganization: (key: SettingKey, change: { enabled?: boolean; value?: number }) => Promise<boolean>;
  actions: Actions;
};

function itemsFor(
  view: SettingsView,
  data: UserSettings,
  save: (change: Partial<UserPreferences>, message: string) => void,
  extras: Extras,
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
  const appearance = [
    TEXT_SIZES[preferences.textSize],
    CONTRASTS[preferences.contrast],
    THEMES[preferences.theme],
  ].join(" · ");
  const onOff = (value: boolean) => (value ? "Ein" : "Aus");
  const quiet = preferences.quietHours;
  const quietValue = quiet.enabled ? `${quiet.from}–${quiet.to} Uhr` : "Aus";

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
        description: "Passwort, Geräte und automatische Abmeldung",
        value: `${security.sessions.length} Gerät${security.sessions.length === 1 ? "" : "e"}`,
        icon: "quality",
        detail: { kind: "open", view: "security", text: `Passwort ${passwordValue}.` },
      },
      {
        id: "appearance",
        title: "Darstellung & Bedienung",
        description: "Schrift, Kontrast, Animationen, Startseite, Kürzel",
        value: appearance,
        icon: "pulse",
        detail: { kind: "open", view: "appearance", text: `Startseite: ${START_PAGES[preferences.startPage].label}.` },
      },
      {
        id: "privacy",
        title: "Datenschutz & Daten",
        description: "Daten herunterladen, Gerät aufräumen, zurücksetzen",
        value: "Deine Daten",
        icon: "docs",
        detail: {
          kind: "open",
          view: "privacy",
          text: "Lade alle Daten herunter, die CareCore zu deinem Konto speichert, oder räume dieses Gerät auf.",
        },
      },
      ...(extras.isAdmin
        ? [
            {
              id: "organization",
              title: "Einrichtung",
              description: "Einstellungen für alle Mitarbeitenden",
              value: "Administration",
              icon: "building",
              detail: {
                kind: "open",
                view: "organization",
                text: "Erinnerungen, Medikation, BtM, Navigation und Tastaturkürzel für die ganze Organisation.",
              },
            } satisfies Item,
          ]
        : []),
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
      {
        id: "quiet",
        title: "Ruhezeit",
        description: "Keine Push-Nachrichten in dieser Zeit",
        value: quietValue,
        icon: "shift",
        detail: {
          kind: "quiet",
          text: "In der Ruhezeit kommen keine Push-Nachrichten; die Hinweise bleiben in CareCore sichtbar. Kritische Hinweise kommen immer. Es gilt die Uhrzeit der Einrichtung, über Mitternacht (z. B. 22:00–06:00) ist möglich.",
          value: quiet,
          save: async (value) => {
            await save(
              { quietHours: value },
              value.enabled ? `Ruhezeit ${value.from}–${value.to} Uhr` : "Ruhezeit ausgeschaltet",
            );
            return true;
          },
        },
      },
      {
        id: "sound",
        title: "Hinweiston",
        description: "Kurzer Ton bei neuen Benachrichtigungen",
        value: onOff(preferences.sound),
        icon: "bell",
        detail: {
          kind: "toggle",
          text: "Ist CareCore geöffnet, erklingt ein kurzer, leiser Ton, sobald eine neue Benachrichtigung eintrifft. Die Liste aktualisiert sich jede Minute.",
          label: "Ton abspielen",
          checked: preferences.sound,
          save: (value) => save({ sound: value }, `Hinweiston ${value ? "eingeschaltet" : "ausgeschaltet"}`),
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
        id: "sec-mfa",
        title: "Zwei-Faktor-Anmeldung",
        description: "Zusätzlicher Code aus einer Authenticator-App",
        value: security.mfa ? "Ein" : "Aus",
        icon: "quality",
        detail: {
          kind: "mfa",
          text: "Nach dem Passwort fragt CareCore nach einem 6-stelligen Code aus der App auf deinem Handy. Das schützt dein Konto, auch wenn jemand dein Passwort kennt.",
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
      {
        id: "sec-idle",
        title: "Automatische Abmeldung",
        description: "Abmelden, wenn CareCore nicht bedient wird",
        value: autoLogoutLabel(preferences.autoLogout),
        icon: "logout",
        detail: {
          kind: "select",
          text: "Empfohlen auf gemeinsam genutzten Geräten im Stationszimmer. Gezählt wird die Zeit ohne Bedienung in allen Tabs dieses Browsers; offline vorgemerkte Einträge bleiben erhalten.",
          label: "Automatische Abmeldung",
          value: autoLogoutLabel(preferences.autoLogout),
          options: AUTO_LOGOUT_MINUTES.map(autoLogoutLabel),
          save: (label) =>
            save(
              {
                autoLogout: (AUTO_LOGOUT_MINUTES.find((minutes) => autoLogoutLabel(minutes) === label) ??
                  0) as AutoLogout,
              },
              `Automatische Abmeldung: ${label}`,
            ),
        },
      },
    ];

  if (view === "privacy")
    return [
      {
        id: "privacy-export",
        title: "Meine Daten herunterladen",
        description: "Profil, Einstellungen, Qualifikationen, Geräte, Aktivität",
        value: "JSON-Datei",
        icon: "docs",
        detail: {
          kind: "action",
          text: "Enthält alles, was CareCore zu deinem Konto speichert: Profil, Einstellungen, Qualifikationen, angemeldete Geräte, Push-Abonnements und deine protokollierten Aktionen der letzten 12 Monate (ohne Inhalte von Bewohnerakten).",
          label: "Herunterladen",
          run: extras.actions.exportData,
        },
      },
      {
        id: "privacy-device",
        title: "Dieses Gerät aufräumen",
        description: "Zwischengespeicherte Seiten und Daten löschen",
        value: "Dieses Gerät",
        icon: "pulse",
        detail: {
          kind: "action",
          text: "Löscht die für den Offline-Betrieb gespeicherten Seiten und Daten auf diesem Gerät. Offline vorgemerkte Einträge, die noch nicht gesendet sind, bleiben erhalten. Beim Abmelden geschieht das automatisch.",
          label: "Jetzt löschen",
          run: extras.actions.clearDevice,
        },
      },
      {
        id: "privacy-push",
        title: "Push auf allen Geräten beenden",
        description: "Alle Push-Abonnements deines Kontos entfernen",
        value: "Alle Geräte",
        icon: "bell",
        detail: {
          kind: "action",
          text: "Beendet die Push-Nachrichten auf allen Geräten, auf denen du sie eingeschaltet hast. Einschalten kannst du sie unter Benachrichtigungen jederzeit wieder.",
          label: "Beenden",
          danger: true,
          run: extras.actions.endPushAll,
        },
      },
      {
        id: "privacy-reset",
        title: "Einstellungen zurücksetzen",
        description: "Alle persönlichen Einstellungen auf Standard",
        value: "Standard",
        icon: "settings",
        detail: {
          kind: "action",
          text: "Benachrichtigungen, Darstellung, Startseite, Ruhezeit und automatische Abmeldung kehren zu den Standardwerten zurück. Profil, Passwort und Geräte bleiben unverändert.",
          label: "Zurücksetzen",
          danger: true,
          run: extras.actions.reset,
        },
      },
    ];

  if (view === "organization") {
    if (!extras.isAdmin)
      return [
        {
          id: "org-denied",
          title: "Nur für die Administration",
          description: "Einstellungen der Einrichtung",
          value: "Kein Zugriff",
          icon: "building",
          detail: { kind: "info", text: "Die Einstellungen der Einrichtung ändert die Administration." },
        },
      ];
    const links: Item[] = [
      [
        "org-structure",
        "Organisation & Wohnbereiche",
        "Standorte, Wohnbereiche, Zimmer",
        "/c/leitung/administration",
        "building",
      ],
      [
        "org-roles",
        "Profile & Rollen",
        "Rollen, Rechte, Medikationsrecht",
        "/c/leitung/administration/mitarbeiter",
        "team",
      ],
      ["org-staff", "Mitarbeitende", "Konten, Qualifikationen, Sperren", "/c/leitung/teamleitung/mitarbeiter", "team"],
      [
        "org-roster",
        "Dienstplan",
        "Diensttypen, Regelwerk, Qualifikationen, Feiertage",
        "/c/dienstplan/einstellungen",
        "shift",
      ],
      ["org-supply", "Pflegebedarf", "Produkte und Mindestbestände", "/c/leitung/administration/pflegebedarf", "plan"],
      [
        "org-system",
        "Systemstatus",
        "Datenbank, Migrationen, Protokoll",
        "/c/leitung/administration/konfiguration",
        "pulse",
      ],
    ].map(([id, title, description, href, icon]) => ({
      id,
      title,
      description,
      value: "Öffnen",
      icon: icon as ModuleIconName,
      detail: { kind: "link", text: `${description}.`, label: "Öffnen", href },
    }));
    const organization = extras.organization;
    if (!organization)
      return [
        {
          id: "org-loading",
          title: extras.organizationError ? "Nicht geladen" : "Wird geladen …",
          description: "Einstellungen der Einrichtung",
          value: "–",
          icon: "settings",
          detail: { kind: "info", text: extras.organizationError ?? "Die Einstellungen werden geladen." },
        },
        ...links,
      ];
    return [
      ...SETTING_KEYS.map((key): Item => {
        const definition = SETTING_DEFINITIONS[key];
        const setting = organization[key];
        return {
          id: `org-${key}`,
          title: definition.title,
          description: definition.area,
          value: setting.enabled
            ? definition.unit && setting.value !== null
              ? `${setting.value} ${definition.unit}`
              : "Ein"
            : "Aus",
          icon: definition.icon,
          detail: {
            kind: "organization",
            text: `${definition.describe(setting.value)}. Gilt für alle Mitarbeitenden.`,
            setting: key,
            value: setting,
            save: (change) => extras.saveOrganization(key, change),
          },
        };
      }),
      ...links,
    ];
  }

  return [
    {
      id: "app-text",
      title: "Schriftgrösse",
      description: "Grössere Schrift und Bedienelemente",
      value: TEXT_SIZES[preferences.textSize],
      icon: "note",
      detail: {
        kind: "select",
        text: "„Gross“ vergrössert alle Seiten um rund 12 %, „Sehr gross“ um rund 24 %.",
        label: "Schriftgrösse",
        value: TEXT_SIZES[preferences.textSize],
        options: Object.values(TEXT_SIZES),
        save: (label) => save({ textSize: pick<TextSize>(TEXT_SIZES, label, "standard") }, `Schriftgrösse: ${label}`),
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
        save: (label) => save({ contrast: pick(CONTRASTS, label, "standard") }, `Kontrast: ${label}`),
      },
    },
    {
      id: "app-theme",
      title: "Erscheinungsbild",
      description: "Hell oder dunkel",
      value: THEMES[preferences.theme],
      icon: "settings",
      detail: {
        kind: "select",
        text: "„Dunkel“ zeigt alle Seiten mit dunklem Hintergrund – angenehmer im Nachtdienst. Fotos bleiben farbecht.",
        label: "Erscheinungsbild",
        value: THEMES[preferences.theme],
        options: Object.values(THEMES),
        save: (label) => save({ theme: pick(THEMES, label, "light") }, `Erscheinungsbild: ${label}`),
      },
    },
    {
      id: "app-motion",
      title: "Animationen",
      description: "Übergänge und Bewegungen",
      value: MOTIONS[preferences.motion],
      icon: "pulse",
      detail: {
        kind: "select",
        text: "„Reduziert“ schaltet Übergänge und Animationen aus – ruhiger und schneller auf älteren Geräten.",
        label: "Animationen",
        value: MOTIONS[preferences.motion],
        options: Object.values(MOTIONS),
        save: (label) => save({ motion: pick(MOTIONS, label, "standard") }, `Animationen: ${label}`),
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
    {
      id: "app-shortcuts",
      title: "Tastaturkürzel",
      description: "Einzeltasten wie J/K oder D",
      value: extras.organizationShortcuts ? onOff(preferences.shortcuts) : "Von der Einrichtung aus",
      icon: "settings",
      detail: {
        kind: "toggle",
        text: "Mit Einzeltasten navigierst du schneller (Übersicht mit „?“). Ausschalten, wenn du Tasten versehentlich auslöst.",
        label: "Tastaturkürzel verwenden",
        checked: preferences.shortcuts,
        note: extras.organizationShortcuts
          ? undefined
          : "Die Einrichtung hat Tastaturkürzel für alle ausgeschaltet; deine Einstellung gilt, sobald sie wieder erlaubt sind.",
        save: (value) => save({ shortcuts: value }, `Tastaturkürzel ${value ? "eingeschaltet" : "ausgeschaltet"}`),
      },
    },
  ];
}

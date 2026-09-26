"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModulePageShell from "@/app/components/module-page-shell";
import { type ModuleIconName } from "@/app/components/module-icon";
import { ModuleIcon } from "@/app/components/module-icon";
import { cards, type SettingsView } from "./settings-workspace";
import SettingsSelect from "./settings-select";
import PasswordChangePopover from "./password-change-popover";

type NotificationRow = { icon: ModuleIconName; title: string; description: string; value: string };
type DetailSpec = {
  description: string;
  label: string;
  kind: "toggle" | "select" | "action" | "notifications";
  value?: string;
  options?: string[];
  action?: string;
  notificationItems?: NotificationRow[];
};

const detailById: Record<string, DetailSpec> = {
  profile: {
    description: "Verwalte deine sichtbaren Profildaten und persönliche Einsatzpräferenzen.",
    label: "Profilseite für das Team sichtbar",
    kind: "toggle",
  },
  notifications: {
    description: "Wähle, welche Hinweise dich während deiner Dienste erreichen.",
    label: "Benachrichtigungen im Dienst aktiv",
    kind: "notifications",
    notificationItems: [
      {
        icon: "alert",
        title: "Kritische Hinweise",
        description: "Sturz, Medikationsabweichung und Eskalation",
        value: "Sofort",
      },
      {
        icon: "tasks",
        title: "Aufgaben & Fälligkeiten",
        description: "Erinnerung vor und bei Überfälligkeit",
        value: "30 Min vorher",
      },
      {
        icon: "handover",
        title: "Übergaben",
        description: "Neue Hinweise seit deinem letzten Dienst",
        value: "Dienststart",
      },
      {
        icon: "wounds",
        title: "Wundversorgung",
        description: "Änderungen an deinen betreuten Wundfällen",
        value: "Bei Änderung",
      },
      {
        icon: "vitals",
        title: "Vitalwerte",
        description: "Messwerte ausserhalb definierter Grenzwerte",
        value: "Bei Grenzwert",
      },
      {
        icon: "team",
        title: "Team & Nachrichten",
        description: "Neue Direktnachrichten und Erwähnungen",
        value: "Sofort",
      },
      {
        icon: "docs",
        title: "Systemhinweise",
        description: "Wartungen, Standards und wichtige Updates",
        value: "Täglich · 08:00",
      },
    ],
  },
  security: {
    description: "Dein Konto ist geschützt. Prüfe regelmässig Sitzungen und Zugriffsschutz.",
    label: "Sicherheitsstatus",
    kind: "action",
    action: "Sicherheitscenter öffnen",
  },
  appearance: {
    description: "Passe die Oberfläche an deine Arbeitsweise an. Änderungen werden für dieses Gerät gespeichert.",
    label: "Darstellungsprofil",
    kind: "select",
    value: "Standard",
    options: ["Standard", "Kompakt", "Hoher Kontrast"],
  },
  "profile-name": {
    description: "Dein Name und deine Rolle werden in Übergaben, Nachrichten und Verantwortlichkeiten angezeigt.",
    label: "Anzeigename",
    kind: "action",
    action: "Profil bearbeiten",
  },
  "profile-shift": {
    description: "Lege deine bevorzugten Arbeitszeiten und die lokale Zeitzone für Dienstansichten fest.",
    label: "Bevorzugter Dienst",
    kind: "select",
    value: "Frühdienst · 07:00–15:30",
    options: ["Frühdienst · 07:00–15:30", "Spätdienst · 13:30–22:00", "Individuell"],
  },
  "notify-critical": {
    description: "Kritische Hinweise werden unabhängig vom geöffneten Modul sofort angezeigt.",
    label: "Sofortbenachrichtigung",
    kind: "toggle",
  },
  "notify-tasks": {
    description: "Erhalte Erinnerungen für Aufgaben, Interventionen und überfällige Fälligkeiten.",
    label: "Erinnerungen aktiv",
    kind: "toggle",
  },
  "notify-handover": {
    description: "Neue Übergabepunkte werden beim nächsten Dienststart hervorgehoben.",
    label: "Übergabe-Hinweise aktiv",
    kind: "toggle",
  },
  "sec-password": {
    description: "Ein starkes, regelmässig erneuertes Passwort schützt deine persönlichen Zugriffe.",
    label: "Passwortverwaltung",
    kind: "action",
    action: "Passwort ändern",
  },
  "sec-2fa": {
    description: "Die Zwei-Faktor-Authentifizierung verlangt bei neuen Geräten einen zusätzlichen Bestätigungscode.",
    label: "Zwei-Faktor-Schutz",
    kind: "toggle",
  },
  "sec-sessions": {
    description: "Beende Sitzungen auf Geräten, die du nicht mehr verwendest.",
    label: "Aktive Sitzungen",
    kind: "action",
    action: "Sitzungen verwalten",
  },
  "app-density": {
    description: "Steuere, wie viele Informationen in Arbeitslisten gleichzeitig sichtbar sind.",
    label: "Informationsdichte",
    kind: "select",
    value: "Standard",
    options: ["Standard", "Kompakt", "Grosszügig"],
  },
  "app-contrast": {
    description: "Hoher Kontrast verbessert die Erkennbarkeit von Statusfarben und Fokuszuständen.",
    label: "Kontrastprofil",
    kind: "select",
    value: "Standard",
    options: ["Standard", "Hoher Kontrast"],
  },
  "app-start": {
    description: "Wähle die Seite, die beim Öffnen von CareCore als erstes angezeigt wird.",
    label: "Startseite",
    kind: "select",
    value: "Mein Dienst",
    options: ["Mein Dienst", "Bewohner", "Vitalwerte"],
  },
};

const navItems: Array<[SettingsView, string, ModuleIconName]> = [
  ["overview", "Übersicht", "settings"],
  ["profile", "Profil & Präferenzen", "team"],
  ["notifications", "Benachrichtigungen", "bell"],
  ["security", "Sicherheit & Zugriff", "quality"],
  ["appearance", "Darstellung", "pulse"],
];

export default function SettingsWorkspaceDetail({ view }: { view: SettingsView }) {
  const content = cards[view];
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(content.items[0].id);
  const [saved, setSaved] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const selected = content.items.find((item) => item.id === selectedId) ?? content.items[0];
  const detail = detailById[selected.id] ?? {
    description: selected.description,
    label: selected.title,
    kind: "action" as const,
    action: "Details öffnen",
  };
  return (
    <ModulePageShell pageClass={`settings-page settings-${view}`} locationSecondary="Persönlicher Bereich">
      {(showToast) => (
        <>
          <main className="workspace settings-workspace">
            <section className="settings-heading page-heading">
              <div className="heading-copy">
                <p className="eyebrow">{content.eyebrow}</p>
                <h1>{content.title}</h1>
                <p>{content.description}</p>
              </div>
              {view !== "overview" && (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setSaved(true);
                    showToast("Einstellungen gespeichert");
                  }}
                >
                  <ModuleIcon name="check" className="button-icon" />
                  {saved ? "Gespeichert" : "Speichern"}
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
                  {navItems.map(([id, label, icon]) => (
                    <button
                      className={view === id ? "active" : ""}
                      type="button"
                      key={id}
                      onClick={() => router.push(id === "overview" ? "/einstellungen" : `/einstellungen/${id}`)}
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
                      <h2 className="card-title">{view === "overview" ? "Deine Einstellungen" : content.title}</h2>
                      <p className="card-subtitle">{content.items.length} Bereiche verfügbar</p>
                    </div>
                  </div>
                  <div>
                    {content.items.map((item) => (
                      <button
                        className={selected.id === item.id ? "selected" : ""}
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
                <section className="card settings-detail">
                  <div className="card-header">
                    <div>
                      <p className="eyebrow">Ausgewählt</p>
                      <h2 className="card-title">{selected.title}</h2>
                      <p className="card-subtitle">{selected.value}</p>
                    </div>
                  </div>
                  <div className="settings-detail-body">
                    <p>{detail.description}</p>
                    {detail.kind === "notifications" && (
                      <div className="settings-notification-summary">
                        <div className="settings-notification-summary-head">
                          <strong>7 aktive Benachrichtigungen</strong>
                          <span className="status-badge stable">Aktiv</span>
                        </div>
                        <div className="settings-notification-list">
                          {detail.notificationItems?.map((item) => (
                            <article key={item.title}>
                              <span className="settings-notification-icon">
                                <ModuleIcon name={item.icon} />
                              </span>
                              <span>
                                <strong>{item.title}</strong>
                                <small>{item.description}</small>
                              </span>
                              <span className="settings-notification-value">
                                <ModuleIcon name="check" />
                                {item.value}
                              </span>
                            </article>
                          ))}
                        </div>
                        <button
                          className="secondary-button settings-notification-link"
                          type="button"
                          onClick={() => router.push("/einstellungen/notifications")}
                        >
                          Benachrichtigungen verwalten
                          <ModuleIcon name="chevron" />
                        </button>
                      </div>
                    )}
                    {detail.kind === "toggle" && (
                      <label className="settings-toggle">
                        <span>{detail.label}</span>
                        <input type="checkbox" defaultChecked aria-label={`${detail.label} aktiv`} />
                        <i />
                      </label>
                    )}
                    {detail.kind === "select" && (
                      <label className="settings-select">
                        <span>{detail.label}</span>
                        <SettingsSelect label={detail.label} value={detail.value} options={detail.options} />
                      </label>
                    )}
                    {detail.kind === "action" && (
                      <div className="settings-action">
                        <span>{detail.label}</span>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() =>
                            selected.id === "sec-password"
                              ? setPasswordOpen(true)
                              : showToast(`${detail.action} geöffnet`)
                          }
                        >
                          {detail.action}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="settings-detail-footer">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => showToast(`${selected.title} gespeichert`)}
                    >
                      <ModuleIcon name="check" />
                      Änderung speichern
                    </button>
                  </div>
                </section>
              </section>
            </div>
          </main>
          <PasswordChangePopover
            key={passwordOpen ? "open" : "closed"}
            open={passwordOpen}
            onClose={() => setPasswordOpen(false)}
            onSuccess={() => showToast("Passwort erfolgreich geändert")}
          />
        </>
      )}
    </ModulePageShell>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModulePageShell, { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";

export type SettingsView = "overview" | "profile" | "notifications" | "security" | "appearance";
type SettingCard = { id: string; title: string; description: string; value: string; icon: ModuleIconName };

const cards: Record<SettingsView, { title: string; description: string; eyebrow: string; items: SettingCard[] }> = {
  overview: { eyebrow: "CareCore Einstellungen", title: "Einstellungen", description: "Dein persönlicher Arbeitsbereich für Profil, Benachrichtigungen und Sicherheit.", items: [
    { id: "profile", title: "Profil & Präferenzen", description: "Name, Rolle und persönliche Arbeitszeiten", value: "Anna Meier", icon: "team" },
    { id: "notifications", title: "Benachrichtigungen", description: "Eskalationen, Aufgaben und Übergaben", value: "7 aktiv", icon: "bell" },
    { id: "security", title: "Sicherheit & Zugriff", description: "Passwort, Sitzungen und Zwei-Faktor-Schutz", value: "Geschützt", icon: "quality" },
    { id: "appearance", title: "Darstellung", description: "Dichte, Kontrast und Startseite", value: "Standard", icon: "pulse" },
  ] },
  profile: { eyebrow: "Einstellungen · Profil", title: "Profil & Präferenzen", description: "Passe deine persönlichen CareCore-Einstellungen an.", items: [{ id: "profile-name", title: "Anna Meier", description: "Pflegefachfrau HF · Wohnbereich 2", value: "Aktiv", icon: "team" }, { id: "profile-shift", title: "Arbeitszeiten", description: "Frühdienst 07:00–15:30 · Zeitzone Europe/Zurich", value: "Gespeichert", icon: "calendar" }] },
  notifications: { eyebrow: "Einstellungen · Benachrichtigungen", title: "Benachrichtigungen", description: "Lege fest, wann CareCore dich aktiv informiert.", items: [{ id: "notify-critical", title: "Kritische Hinweise", description: "Sofort bei Sturz, Medikationsabweichung und Eskalation", value: "Aktiv", icon: "alert" }, { id: "notify-tasks", title: "Aufgaben & Fälligkeiten", description: "30 Minuten vor der Fälligkeit und bei Überfälligkeit", value: "Aktiv", icon: "tasks" }, { id: "notify-handover", title: "Übergaben", description: "Neue Hinweise seit deinem letzten Dienst", value: "Aktiv", icon: "handover" }] },
  security: { eyebrow: "Einstellungen · Sicherheit", title: "Sicherheit & Zugriff", description: "Kontrolliere deine aktiven Sitzungen und Schutzmechanismen.", items: [{ id: "sec-password", title: "Passwort", description: "Zuletzt geändert vor 42 Tagen", value: "Ändern", icon: "quality" }, { id: "sec-2fa", title: "Zwei-Faktor-Authentifizierung", description: "Zusätzlicher Schutz bei der Anmeldung", value: "Aktiv", icon: "check" }, { id: "sec-sessions", title: "Aktive Sitzungen", description: "1 Sitzung auf diesem Gerät", value: "Prüfen", icon: "pulse" }] },
  appearance: { eyebrow: "Einstellungen · Darstellung", title: "Darstellung", description: "Optimiere CareCore für deinen persönlichen Arbeitsfluss.", items: [{ id: "app-density", title: "Informationsdichte", description: "Kompakte Zeilen für grosse Arbeitslisten", value: "Standard", icon: "chart" }, { id: "app-contrast", title: "Kontrast", description: "Hoher Kontrast für klare Statusfarben", value: "Standard", icon: "quality" }, { id: "app-start", title: "Startseite", description: "Persönlicher Schichtarbeitsplatz beim Öffnen", value: "Mein Dienst", icon: "home" }] },
};

export { cards };

export default function SettingsWorkspace({ view }: { view: SettingsView }) {
  const content = cards[view];
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(content.items[0].id);
  const [saved, setSaved] = useState(false);
  const selected = content.items.find((item) => item.id === selectedId) ?? content.items[0];
  return <ModulePageShell pageClass={`settings-page settings-${view}`} locationSecondary="Persönlicher Bereich">
    {(showToast) => <main className="workspace settings-workspace"><section className="settings-heading page-heading"><div className="heading-copy"><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p>{content.description}</p></div>{view !== "overview" && <button className="primary-button" type="button" onClick={() => { setSaved(true); showToast("Einstellungen gespeichert"); }}><ModuleIcon name="check" className="button-icon"/>{saved ? "Gespeichert" : "Speichern"}</button>}</section><div className="settings-layout"><aside className="card settings-nav"><div className="card-header"><div><p className="eyebrow">Mein Bereich</p><h2 className="card-title">Einstellungen</h2></div></div><nav aria-label="Einstellungsnavigation">{([['overview', 'Übersicht', 'settings'], ['profile', 'Profil & Präferenzen', 'team'], ['notifications', 'Benachrichtigungen', 'bell'], ['security', 'Sicherheit & Zugriff', 'quality'], ['appearance', 'Darstellung', 'pulse']] as Array<[SettingsView, string, ModuleIconName]>).map(([id, label, icon]) => <button className={view === id ? "active" : ""} type="button" key={id} onClick={() => router.push(id === "overview" ? "/einstellungen" : `/einstellungen/${id}`)}><ModuleIcon name={icon}/><span>{label}</span><ModuleIcon name="chevron" className="chevron"/></button>)}</nav></aside><section className="settings-content"><section className="card settings-list"><div className="card-header"><div><p className="eyebrow">Arbeitsbereich</p><h2 className="card-title">{view === "overview" ? "Deine Einstellungen" : content.title}</h2><p className="card-subtitle">{content.items.length} Bereiche verfügbar</p></div></div><div>{content.items.map((item) => <button className={selected.id === item.id ? "selected" : ""} type="button" key={item.id} onClick={() => setSelectedId(item.id)}><span className="settings-item-icon"><ModuleIcon name={item.icon}/></span><span><strong>{item.title}</strong><small>{item.description}</small></span><span className="settings-item-value">{item.value}</span><ModuleIcon name="chevron" className="chevron"/></button>)}</div></section><section className="card settings-detail"><div className="card-header"><div><p className="eyebrow">Ausgewählt</p><h2 className="card-title">{selected.title}</h2></div></div><div className="settings-detail-body"><p>{selected.description}</p><label className="settings-toggle"><span>Für meinen Arbeitsbereich aktiv</span><input type="checkbox" defaultChecked aria-label={`${selected.title} aktiv`}/><i/></label></div><div className="settings-detail-footer"><button className="secondary-button" type="button" onClick={() => showToast(`${selected.title} geöffnet`)}>Details öffnen</button></div></section></section></div></main>}
  </ModulePageShell>;
}

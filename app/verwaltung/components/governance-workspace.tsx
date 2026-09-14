"use client";

import { useMemo, useState } from "react";
import ModulePageShell, { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";
import { GovernanceVariant } from "./governance-variants";

export type GovernanceView =
  | "teamNews" | "teamMessages" | "learning" | "compliance"
  | "documents" | "standards" | "qualityEvents" | "qualityActions"
  | "careInsights" | "leadershipInsights" | "workforceInsights"
  | "organization" | "users" | "configuration";

type Tone = "stable" | "attention" | "critical" | "info";
export type GovernanceItem = { id: string; title: string; description: string; meta: string; status: string; tone: Tone; owner: string; icon: ModuleIconName };

const viewMeta: Record<GovernanceView, { module: string; child: string; eyebrow: string; title: string; description: string; action: string }> = {
  teamNews: { module: "team", child: "Neuigkeiten & Kanäle", eyebrow: "CareCore Team", title: "Neuigkeiten & Kanäle", description: "Updates, Absprachen und Fachdialoge im gesamten Haus.", action: "Beitrag erstellen" },
  teamMessages: { module: "team", child: "Nachrichten", eyebrow: "CareCore Team", title: "Nachrichten", description: "Direkte Kommunikation mit Kolleginnen, Kollegen und Diensten.", action: "Neue Nachricht" },
  learning: { module: "learn", child: "Meine Schulungen", eyebrow: "CareCore Learn", title: "Meine Schulungen", description: "Dein Lernplan, Fortschritt und anstehende Weiterbildungen.", action: "Schulung suchen" },
  compliance: { module: "learn", child: "Pflichtnachweise", eyebrow: "CareCore Learn", title: "Pflichtnachweise", description: "Kompetenzen und Nachweise für einen sicheren Pflegealltag.", action: "Nachweis erfassen" },
  documents: { module: "docs", child: "Dokumente", eyebrow: "CareCore Docs", title: "Dokumente", description: "Zentrale Ablage für Formulare, Vorlagen und Arbeitsunterlagen.", action: "Dokument hochladen" },
  standards: { module: "docs", child: "Standards & Weisungen", eyebrow: "CareCore Docs", title: "Standards & Weisungen", description: "Aktuelle Standards, Weisungen und Versionen im schnellen Zugriff.", action: "Weisung veröffentlichen" },
  qualityEvents: { module: "quality", child: "Ereignisse", eyebrow: "CareCore Quality", title: "Ereignisse", description: "Sicherheitsrelevante Ereignisse erfassen, analysieren und nachverfolgen.", action: "Ereignis melden" },
  qualityActions: { module: "quality", child: "Massnahmen", eyebrow: "CareCore Quality", title: "Massnahmen", description: "Verbesserungsmassnahmen aus Ereignissen transparent steuern.", action: "Massnahme planen" },
  careInsights: { module: "insights", child: "Pflege", eyebrow: "CareCore Insights", title: "Pflegekennzahlen", description: "Pflegequalität und Versorgungsindikatoren für das Haus.", action: "Bericht erstellen" },
  leadershipInsights: { module: "insights", child: "Leitung", eyebrow: "CareCore Insights", title: "Leitungskennzahlen", description: "Die wichtigsten Kennzahlen für Steuerung und Tagesgeschäft.", action: "Zeitraum wählen" },
  workforceInsights: { module: "insights", child: "Personal", eyebrow: "CareCore Insights", title: "Personalkennzahlen", description: "Besetzung, Verfügbarkeit und Kompetenzmix auf einen Blick.", action: "Auswertung exportieren" },
  organization: { module: "admin", child: "Organisation", eyebrow: "CareCore Admin", title: "Organisation", description: "Standorte, Wohnbereiche und Rollenstruktur des Hauses verwalten.", action: "Bereich hinzufügen" },
  users: { module: "admin", child: "Benutzer & Rollen", eyebrow: "CareCore Admin", title: "Benutzer & Rollen", description: "Zugriffe sicher vergeben und Berechtigungen nachvollziehbar halten.", action: "Benutzer einladen" },
  configuration: { module: "admin", child: "Konfiguration", eyebrow: "CareCore Admin", title: "Konfiguration", description: "Systemweite Einstellungen und Integrationen zentral pflegen.", action: "Einstellung ändern" },
};

const items: Record<GovernanceView, GovernanceItem[]> = {
  teamNews: [
    { id: "n1", title: "Neue Sturzprophylaxe-Richtlinie", description: "Die aktualisierte Richtlinie ist ab heute für alle Wohnbereiche verfügbar.", meta: "Heute · Kanal Pflegequalität", status: "Wichtig", tone: "attention", owner: "Anna Meier", icon: "note" },
    { id: "n2", title: "Sommerfest 2026", description: "Anmeldung und Helferplan für den 27. Juni sind veröffentlicht.", meta: "Gestern · Kanal Haus", status: "Neu", tone: "info", owner: "Lea Frei", icon: "team" },
    { id: "n3", title: "Materiallieferung bestätigt", description: "Die nächste Lieferung für Verbandmaterial trifft am Dienstag ein.", meta: "12.09.2026 · Kanal Logistik", status: "Gelesen", tone: "stable", owner: "Sven Keller", icon: "docs" },
  ],
  teamMessages: [
    { id: "m1", title: "Übergabe Wohnbereich 2", description: "Bitte die neue Besuchsregelung für Zimmer 204 beachten.", meta: "08:14 · 3 Empfänger", status: "Ungelesen", tone: "attention", owner: "Nora Baumann", icon: "handover" },
    { id: "m2", title: "Rückfrage zu Frau Keller", description: "Die Angehörigen wünschen einen Rückruf nach der Visite.", meta: "Gestern · Direktnachricht", status: "Offen", tone: "info", owner: "Dr. Martin Weber", icon: "team" },
    { id: "m3", title: "Diensttausch bestätigt", description: "Dein Diensttausch am 18. September wurde freigegeben.", meta: "11.09.2026 · Dienstplanung", status: "Erledigt", tone: "stable", owner: "Leitung Pflege", icon: "calendar" },
  ],
  learning: [
    { id: "l1", title: "Basiskurs Wundmanagement", description: "4 von 6 Lektionen abgeschlossen · Abschluss bis 30.09.2026", meta: "E-Learning · 45 Minuten", status: "In Bearbeitung", tone: "info", owner: "Anna Meier", icon: "wounds" },
    { id: "l2", title: "Medikationssicherheit", description: "Jährliche Pflichtschulung für alle Pflegefachpersonen.", meta: "Präsenz · 24.09.2026 · 13:30", status: "Angemeldet", tone: "attention", owner: "CareCore Learn", icon: "med" },
    { id: "l3", title: "Hygiene-Update 2026", description: "Kurztest bestanden und Zertifikat hinterlegt.", meta: "Abgeschlossen · 03.09.2026", status: "Abgeschlossen", tone: "stable", owner: "Anna Meier", icon: "check" },
  ],
  compliance: [
    { id: "c1", title: "BLS-AED Nachweis", description: "Zertifikat läuft in 18 Tagen ab. Auffrischung ist reserviert.", meta: "Fällig 01.10.2026", status: "Bald fällig", tone: "attention", owner: "Anna Meier", icon: "alert" },
    { id: "c2", title: "Medikationskompetenz", description: "Kompetenzcheck durch Stationsleitung dokumentiert.", meta: "Gültig bis 14.03.2027", status: "Gültig", tone: "stable", owner: "Lea Frei", icon: "check" },
    { id: "c3", title: "Wundversorgung Aufbaukurs", description: "Nachweis fehlt noch im persönlichen Kompetenzprofil.", meta: "Fällig 15.09.2026", status: "Offen", tone: "critical", owner: "Anna Meier", icon: "wounds" },
  ],
  documents: [
    { id: "d1", title: "Eintrittscheckliste 2026", description: "Aktuelle Vorlage für Neuaufnahmen und Zimmerübergaben.", meta: "PDF · 248 KB · 12.09.2026", status: "Aktuell", tone: "stable", owner: "Administration", icon: "docs" },
    { id: "d2", title: "Formular Angehörigengespräch", description: "Strukturierte Gesprächsdokumentation für den Pflegebericht.", meta: "DOCX · 84 KB · 08.09.2026", status: "Entwurf", tone: "attention", owner: "Pflegeentwicklung", icon: "note" },
    { id: "d3", title: "Notfallnummern Haus", description: "Interne und externe Kontakte für dringende Situationen.", meta: "PDF · 132 KB · 04.09.2026", status: "Aktuell", tone: "info", owner: "Leitung Pflege", icon: "alert" },
  ],
  standards: [
    { id: "s1", title: "Sturzprophylaxe", description: "Version 4.2 · Änderungen zu Nachkontrolle und Visite.", meta: "Freigegeben · 10.09.2026", status: "Verbindlich", tone: "critical", owner: "Qualitätsmanagement", icon: "quality" },
    { id: "s2", title: "Wundversorgung Standard", description: "Version 3.1 · Fotodokumentation und Verbandwechsel.", meta: "Freigegeben · 02.09.2026", status: "Verbindlich", tone: "stable", owner: "Pflegeentwicklung", icon: "wounds" },
    { id: "s3", title: "Besuchsregelung", description: "Neue Hausregelung zur Begleitung in den Wohnbereichen.", meta: "Zur Kenntnis · 28.08.2026", status: "Neu", tone: "attention", owner: "Geschäftsleitung", icon: "docs" },
  ],
  qualityEvents: [
    { id: "q1", title: "Beinahe-Sturz · Zimmer 207", description: "Bewohner sicher begleitet, Umfeld angepasst und Angehörige informiert.", meta: "Heute, 07:55 · Wohnbereich 2", status: "In Prüfung", tone: "attention", owner: "Anna Meier", icon: "alert" },
    { id: "q2", title: "Medikationsabweichung", description: "Abweichende Einnahmezeit erkannt und mit Arzt rückgesprochen.", meta: "11.09.2026 · Wohnbereich 1", status: "Massnahme läuft", tone: "critical", owner: "Nora Baumann", icon: "med" },
    { id: "q3", title: "Lob von Angehörigen", description: "Positives Feedback zum Einzug und zur Kommunikation im Team.", meta: "10.09.2026 · Wohnbereich 3", status: "Abgeschlossen", tone: "stable", owner: "Leitung Pflege", icon: "check" },
  ],
  qualityActions: [
    { id: "qa1", title: "Kontrollrunde Medikationswagen", description: "Wöchentliche Prüfung der Temperatur und Verfallsdaten.", meta: "Fällig 15.09.2026", status: "Offen", tone: "attention", owner: "Sven Keller", icon: "med" },
    { id: "qa2", title: "Schulung Sturzprävention", description: "Teambriefing für alle Mitarbeitenden im Frühdienst.", meta: "Termin 18.09.2026", status: "Geplant", tone: "info", owner: "Lea Frei", icon: "learn" },
    { id: "qa3", title: "Beleuchtung Flur Nord", description: "Neue Orientierungsbeleuchtung wurde installiert und geprüft.", meta: "Abgeschlossen · 09.09.2026", status: "Erledigt", tone: "stable", owner: "Technischer Dienst", icon: "check" },
  ],
  careInsights: [
    { id: "ci1", title: "Dokumentationsquote", description: "28 von 36 Pflegeberichten dieser Woche sind abgeschlossen.", meta: "Diese Woche · Ziel 90 %", status: "78 %", tone: "attention", owner: "Pflegeentwicklung", icon: "chart" },
    { id: "ci2", title: "Sturzereignisse", description: "Drei Ereignisse im laufenden Monat, eines weniger als im Vormonat.", meta: "September 2026", status: "Verbessert", tone: "stable", owner: "Qualitätsmanagement", icon: "quality" },
    { id: "ci3", title: "Wundheilung", description: "5 aktive Wunden · 3 mit planmässigem Heilungsverlauf.", meta: "Aktueller Bestand", status: "Beobachten", tone: "info", owner: "Wundexpertise", icon: "wounds" },
  ],
  leadershipInsights: [
    { id: "li1", title: "Belegung", description: "46 von 52 Plätzen sind belegt; zwei Eintritte sind geplant.", meta: "Heute · Gesamtes Haus", status: "88 %", tone: "stable", owner: "Administration", icon: "building" },
    { id: "li2", title: "Offene Hinweise", description: "7 Hinweise benötigen eine Sichtung durch die Leitung.", meta: "Aktuell · 2 kritisch", status: "7 offen", tone: "attention", owner: "Leitung Pflege", icon: "alert" },
    { id: "li3", title: "Qualitätsziele", description: "8 von 10 Jahreszielen liegen im erwarteten Fortschritt.", meta: "Q3 2026", status: "80 %", tone: "info", owner: "Geschäftsleitung", icon: "chart" },
  ],
  workforceInsights: [
    { id: "wi1", title: "Dienstbesetzung", description: "92 % der geplanten Dienste sind für die kommende Woche bestätigt.", meta: "KW 38 · alle Bereiche", status: "92 %", tone: "stable", owner: "Dienstplanung", icon: "calendar" },
    { id: "wi2", title: "Abwesenheiten", description: "Vier Abwesenheiten sind noch nicht vollständig vertreten.", meta: "Kommende 14 Tage", status: "4 offen", tone: "attention", owner: "Personal", icon: "team" },
    { id: "wi3", title: "Kompetenzmix", description: "Alle Schichten erfüllen die Mindestbesetzung mit Pflegefachpersonen.", meta: "Heute · 12 Schichten", status: "Erfüllt", tone: "stable", owner: "Leitung Pflege", icon: "learn" },
  ],
  organization: [
    { id: "o1", title: "Wohnbereich 2 · 1. OG", description: "12 Plätze · 10 belegt · Team Anna Meier.", meta: "Aktiv · zuletzt geändert 08.09.2026", status: "Aktiv", tone: "stable", owner: "Administration", icon: "building" },
    { id: "o2", title: "Pflegewohngruppe", description: "8 Plätze · 7 belegt · eigener Dienstplan.", meta: "Aktiv · zuletzt geändert 01.09.2026", status: "Aktiv", tone: "info", owner: "Administration", icon: "building" },
    { id: "o3", title: "Wohnbereich 3", description: "Neue Teamleitung ab 01.10.2026 hinterlegt.", meta: "Änderung ausstehend", status: "Prüfung", tone: "attention", owner: "Leitung Pflege", icon: "team" },
  ],
  users: [
    { id: "u1", title: "Anna Meier", description: "Pflegefachfrau HF · Wohnbereich 2 · Vollzugriff Pflege.", meta: "Zuletzt aktiv heute, 08:02", status: "Aktiv", tone: "stable", owner: "Pflege", icon: "team" },
    { id: "u2", title: "Lea Frei", description: "Fachfrau Gesundheit · Wohnbereich 1 · eingeschränkter Zugriff.", meta: "Zuletzt aktiv gestern", status: "Aktiv", tone: "info", owner: "Pflege", icon: "team" },
    { id: "u3", title: "Dr. Martin Weber", description: "Belegarzt · medizinische Dokumentation und Visite.", meta: "Einladung ausstehend", status: "Einladung offen", tone: "attention", owner: "Medizin", icon: "team" },
  ],
  configuration: [
    { id: "cf1", title: "Benachrichtigungen", description: "Eskalationen, fällige Aufgaben und Dienstübergaben.", meta: "Zuletzt gespeichert 12.09.2026", status: "Aktiv", tone: "stable", owner: "System", icon: "bell" },
    { id: "cf2", title: "Schnittstellen", description: "KIS-Export und Verzeichnisdienst sind verbunden.", meta: "Letzte Synchronisation 08:05", status: "Verbunden", tone: "info", owner: "IT", icon: "pulse" },
    { id: "cf3", title: "Archivierung", description: "Aufbewahrungsfristen für Bewohnerakten und Dokumente.", meta: "Prüfung empfohlen", status: "Prüfen", tone: "attention", owner: "Datenschutz", icon: "docs" },
  ],
};

const summaryByView: Record<GovernanceView, Array<{ icon: ModuleIconName; value: string; label: string; tone?: Tone }>> = {
  teamNews: [{ icon: "note", value: "12", label: "Beiträge diese Woche" }, { icon: "team", value: "8", label: "aktive Kanäle", tone: "info" }, { icon: "alert", value: "3", label: "ungelesen", tone: "attention" }, { icon: "check", value: "94 %", label: "Team erreicht" }],
  teamMessages: [{ icon: "team", value: "18", label: "Nachrichten heute" }, { icon: "alert", value: "4", label: "ungelesen", tone: "attention" }, { icon: "handover", value: "7", label: "Übergaben", tone: "info" }, { icon: "check", value: "96 %", label: "Antwortquote" }],
  learning: [{ icon: "learn", value: "4", label: "Kurse aktiv" }, { icon: "check", value: "68 %", label: "Fortschritt", tone: "info" }, { icon: "calendar", value: "2", label: "Termine geplant", tone: "attention" }, { icon: "docs", value: "9", label: "Nachweise" }],
  compliance: [{ icon: "docs", value: "18", label: "Nachweise gültig" }, { icon: "alert", value: "3", label: "bald fällig", tone: "attention" }, { icon: "alert", value: "1", label: "offen", tone: "critical" }, { icon: "check", value: "94 %", label: "Vollständigkeit" }],
  documents: [{ icon: "docs", value: "248", label: "Dokumente" }, { icon: "check", value: "218", label: "aktuell", tone: "info" }, { icon: "note", value: "12", label: "Entwürfe", tone: "attention" }, { icon: "team", value: "42", label: "geteilt" }],
  standards: [{ icon: "docs", value: "36", label: "Standards" }, { icon: "check", value: "31", label: "freigegeben", tone: "info" }, { icon: "alert", value: "3", label: "zur Prüfung", tone: "attention" }, { icon: "alert", value: "2", label: "überfällig", tone: "critical" }],
  qualityEvents: [{ icon: "alert", value: "14", label: "Ereignisse 2026" }, { icon: "alert", value: "2", label: "kritisch", tone: "critical" }, { icon: "note", value: "5", label: "in Prüfung", tone: "attention" }, { icon: "check", value: "87 %", label: "abgeschlossen" }],
  qualityActions: [{ icon: "quality", value: "18", label: "Massnahmen aktiv" }, { icon: "alert", value: "4", label: "fällig", tone: "attention" }, { icon: "check", value: "26", label: "abgeschlossen", tone: "info" }, { icon: "chart", value: "91 %", label: "wirksam" }],
  careInsights: [{ icon: "chart", value: "78 %", label: "Dokumentation" }, { icon: "quality", value: "3", label: "Sturzereignisse", tone: "attention" }, { icon: "wounds", value: "5", label: "aktive Wunden" }, { icon: "check", value: "+12 %", label: "Verbesserung", tone: "info" }],
  leadershipInsights: [{ icon: "building", value: "88 %", label: "Belegung" }, { icon: "alert", value: "7", label: "Hinweise offen", tone: "attention" }, { icon: "quality", value: "80 %", label: "Ziele erreicht", tone: "info" }, { icon: "check", value: "0", label: "P1 Eskalationen" }],
  workforceInsights: [{ icon: "calendar", value: "92 %", label: "Besetzung" }, { icon: "team", value: "4", label: "Abwesenheiten", tone: "attention" }, { icon: "learn", value: "100 %", label: "Kompetenzmix", tone: "info" }, { icon: "check", value: "6", label: "offene Dienste" }],
  organization: [{ icon: "building", value: "4", label: "Wohnbereiche" }, { icon: "residents", value: "46", label: "belegte Plätze", tone: "info" }, { icon: "team", value: "62", label: "Mitarbeitende" }, { icon: "alert", value: "1", label: "Änderung offen", tone: "attention" }],
  users: [{ icon: "team", value: "62", label: "Benutzer aktiv" }, { icon: "check", value: "8", label: "Rollen", tone: "info" }, { icon: "alert", value: "3", label: "Einladungen offen", tone: "attention" }, { icon: "alert", value: "0", label: "gesperrt", tone: "critical" }],
  configuration: [{ icon: "check", value: "18", label: "Einstellungen aktiv" }, { icon: "pulse", value: "2", label: "Schnittstellen", tone: "info" }, { icon: "alert", value: "1", label: "Prüfung empfohlen", tone: "attention" }, { icon: "quality", value: "100 %", label: "Auditstatus" }],
};

function Summary({ view }: { view: GovernanceView }) {
  return <section className="wound-summary operations-summary governance-summary" aria-label="Zusammenfassung">{summaryByView[view].map((item) => <div key={item.label}><span className={`summary-icon ${item.tone === "attention" ? "attention" : item.tone === "critical" ? "critical" : item.tone === "info" ? "info" : ""}`}><ModuleIcon name={item.icon}/></span><span><strong>{item.value}</strong><small>{item.label}</small></span></div>)}</section>;
}

export default function GovernanceWorkspace({ view }: { view: GovernanceView }) {
  const meta = viewMeta[view];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Alle");
  const [selectedId, setSelectedId] = useState(items[view][0].id);
  const [completed, setCompleted] = useState<string[]>([]);
  const currentItems = items[view];
  const filters = ["Alle", ...Array.from(new Set(currentItems.map((item) => item.status)))];
  const filtered = useMemo(() => currentItems.filter((item) => (filter === "Alle" || item.status === filter) && `${item.title} ${item.description} ${item.meta} ${item.owner}`.toLocaleLowerCase("de-CH").includes(query.trim().toLocaleLowerCase("de-CH"))), [currentItems, filter, query]);
  const selected = currentItems.find((item) => item.id === selectedId) ?? currentItems[0];

  return <ModulePageShell activeModule={meta.module} activeChild={meta.child} pageClass={`governance-page governance-${view}`} locationSecondary="Gesamtes Haus · alle Wohnbereiche">
    {(showToast) => <main className="workspace module-workspace governance-workspace">
      <section className="page-heading care-page-heading" aria-labelledby="governance-title"><div className="heading-copy"><p className="eyebrow">{meta.eyebrow}</p><h1 id="governance-title">{meta.title}</h1><p>{meta.description}</p></div><button className="primary-button" type="button" onClick={() => showToast(`${meta.action} vorbereitet`)}><ModuleIcon name="plus" className="button-icon"/>{meta.action}</button></section>
      <Summary view={view}/>
      <GovernanceVariant view={view} title={meta.title} eyebrow={meta.eyebrow} items={currentItems} filtered={filtered} selected={selected} query={query} setQuery={setQuery} filter={filter} filters={filters} setFilter={setFilter} setSelectedId={setSelectedId} completed={completed} setCompleted={setCompleted} showToast={showToast}/>
    </main>}
  </ModulePageShell>;
}

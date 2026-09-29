# To-do-Liste

Abgleich des Projekts mit dem **CareCore PRD v1.0** (Stand 29.09.2026). Die frühere Liste (PR #35–#47) ist
abgeschlossen; Erledigtes steht im README und in den Pull Requests.

Legende: ✅ vorhanden · 🟡 teilweise · ❌ fehlt

## Abgleich je PRD-Bereich

| PRD-Bereich                  | Stand | Befund im Code                                                                                                                               |
| ---------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Home „One Shift. One Screen“ | 🟡    | Startseite `/c` mit Widgets, Notizen, Schnellzugriff, Zeitleiste. Keine feste Gliederung Kritisch / Wichtig / Routine.                       |
| Bewohner-Kopfbereich         | ✅    | Akte mit Übersicht, Verlauf, Körperstatus, Dokumenten und Reanimationsstatus im Aktenkopf.                                                   |
| Resident Timeline            | ✅    | `bewohner/verlauf`, `lib/resident-history.ts`.                                                                                               |
| Plan                         | ✅    | Pflegeplanung mit Zielen, Massnahmen, Evaluation, Einschätzungen. Keine regelbasierten Vorschläge aus Einschätzungen.                        |
| Chart / Schnelldoku          | 🟡    | Doku, Nachträge, Schnelldokumentation. Aus Aufgaben kein ✓ △ ✕, keine Spracheingabe.                                                         |
| Handover                     | ✅    | Übergabe, „Seit meinem letzten Dienst“, Lesebestätigung (`carecore_handover_reads`).                                                         |
| Tasks                        | ✅    | Offen, in Bearbeitung, eskaliert, erledigt, teilweise, nicht erledigt, abgebrochen; überfällig berechnet.                                    |
| Med                          | 🟡    | Runde, Reserve (PRN) mit Wirkungskontrolle, BtM mit Zweitunterschrift, Bestand. Interaktionen fehlen (braucht eine externe Datenquelle).     |
| Vitals                       | ✅    | Individuelle Grenzwerte je Bewohner (`carecore_vital_thresholds`).                                                                           |
| Wounds                       | 🟡    | Verlauf, Fotos, Körperkarte, Erinnerungen. Verbandsmaterial ist nicht als Liste je Versorgung erfasst.                                       |
| Nutrition                    | 🟡    | Plan, Trinken, Mahlzeiten, Screenings in den Einschätzungen. Kein automatischer Hinweis bei Gewichts- oder Trinktrend.                       |
| Team / Kanäle                | ✅    | Kanäle, Beiträge, Lesebestätigungen (`carecore_post_reads`).                                                                                 |
| Chat                         | ✅    | Unterhaltungen, Reaktionen, @Erwähnungen; Benachrichtigung und Push bei Direktnachricht und Erwähnung.                                       |
| Schedule                     | ✅    | Dienstplan, Tausch, Wünsche, Zeiterfassung, KI-Planung. Börse für offene Dienste.                                                            |
| Docs                         | ✅    | Versionen, Freigabe, Lesebestätigung (`carecore_document_reads`). Bei neuer Version muss die Bestätigung erneut angefordert werden (prüfen). |
| Learn                        | ✅    | Schulungen, Pflicht, Gültigkeit, Nachweise, Link, Quiz mit Bestehensgrenze, Übersicht je Team. Videos nur als Link.                          |
| Quality                      | ✅    | Ereignisse mit Massnahmen und Status.                                                                                                        |
| KI-Assistenten               | 🟡    | Übergabe, Risiken, Dokumentation, freie Frage, Dienstplan-KI; Entwürfe mit Prüfung. Keine Planungs- oder Such-Assistenz.                     |
| Globale Suche ⌘K             | ✅    | `global-search-dialog.tsx`, Tastenkürzel.                                                                                                    |
| Benachrichtigungen           | ✅    | Klassen Kritisch / Handlung / Info / Sozial, Bündelung, Push mit Ruhezeiten.                                                                 |
| Mobile                       | 🟡    | Untere Navigation, Hauptmenü, Schnellaktions-Knopf (FAB).                                                                                    |
| Dark Mode                    | ✅    | Persönliche Wahl „Erscheinungsbild: Dunkel“; Standard bleibt hell.                                                                           |
| Barrierefreiheit WCAG 2.2 AA | 🟡    | Tastatur, Fokusfalle, Schriftgrösse, Kontrast-Einstellung. `--muted` erreicht nur 4,4:1.                                                     |
| IAM                          | 🟡    | Passwort, Login-Drossel, Sitzungen mit Gerät, automatische Abmeldung. **SSO, MFA und Passkeys fehlen.**                                      |
| Rechte                       | 🟡    | Rechte plus Qualifikationen; Medikation getrennt in verabreichen / verwalten.                                                                |
| Audit                        | ✅    | Atomar, pro Bewohner, mit Sitzung und Gerät.                                                                                                 |
| Datenschutz                  | 🟡    | Eigener Datenexport, Quittungen nach 30 Tagen gelöscht. Kein Lösch- oder Aufbewahrungskonzept für Bewohnerdaten.                             |
| Sicherheit                   | 🟡    | Login-, Passwort- und KI-Drossel, allgemeine Drossel für schreibende API-Anfragen.                                                           |
| Backups / Health             | 🟡    | Health-Endpunkt `/api/health`; Backups durch den Datenbank-Anbieter.                                                                         |
| Offline                      | 🟡    | Warteschlange mit Quittungen, Service Worker, Konfliktanzeige. **Lokaler Speicher unverschlüsselt** (Entscheidung offen).                    |
| API / FHIR / Webhooks        | ❌    | Nur interne API.                                                                                                                             |
| Mandanten                    | 🟡    | Organisation, Standort, Wohnbereich. Eigene Rollen gelten global.                                                                            |
| Domain Events / Echtzeit     | ❌    | Polling, keine Ereignisse.                                                                                                                   |
| Admin-Konfiguration          | 🟡    | Einstellungen der Einrichtung. Ereignistypen, Vitalparameter und Branding sind nicht konfigurierbar.                                         |
| Insights / Resident 360      | ✅    | Kennzahlen, Bewohnerübersicht (Resident 360) und persönliches Dashboard „Meine Kennzahlen“.                                                  |
| Smart Workflows              | ❌    | Kein Ablauf Sturz → Einschätzung → Vitalwerte → Arzt → Plan → Nachkontrolle → Qualität.                                                      |
| Universal Action System      | ❌    | Aktionen sind je Modul gebaut.                                                                                                               |
| Sprachen / Terminologie      | ❌    | Nur Deutsch, feste Bezeichnung „Bewohner“.                                                                                                   |
| Phase 6 Portale              | ❌    | Angehörigen-, Arzt- und Apothekenportal sind späterer Umfang.                                                                                |

## Hoch (klinische Sicherheit und Kernabläufe)

- [x] **Reanimationsstatus im Bewohner-Kopfbereich:** eigenes Feld (REA ja / nein / nicht erfasst, Grundlage, Datum), in Akte,
      Kopfzeile und Überleitungsbogen; mit Audit. Werte kommen aus der Patientenverfügung, keine Voreinstellung.
- [x] **Aufgabenstatus erweitern:** teilweise, übersprungen (Grund Pflicht), eskaliert; „überfällig“ berechnet.
      Der Abschluss bietet ✓ △ ✕; Abweichungen (△ ✕) erzeugen immer einen Doku-Eintrag, ✓ bei Dokumentationspflicht.
- [x] **Wirkungskontrolle nach Reservegabe:** Kontrolle mit Termin und Erinnerung, Ergebnis dokumentiert. Den
      Zeitpunkt legt die Verordnung fest, es gibt kein erfundenes Standardintervall.
- [x] **Chat:** Reaktionen, @Erwähnungen mit Benachrichtigung, Push bei Direktnachricht und Erwähnung.
- [x] **Benachrichtigungsklassen** Kritisch / Handlung / Info / Sozial, mit Bündelung. Kritisches ignoriert die
      Ruhezeiten nur, wenn die Person es erlaubt.

## Mittel

- [x] **Mobile Schnellaktionen (FAB):** Doku, Vitalwert, Trinkmenge, Reservegabe, Wundverlauf, Übergabenotiz für den gewählten Bewohner.
- [x] **Health-Endpunkt** `/api/health` (DB-Verbindung, Migrationsstand, ohne Geheimnisse).
- [x] **Allgemeine API-Drossel** für schreibende Anfragen.
- [x] **Offline-Konflikte:** Wurde eine offline bearbeitete Notiz inzwischen anderswo geändert, meldet der Server
      einen Konflikt; die Anzeige bietet „Meine Fassung übernehmen“ oder „Verwerfen“.
- [ ] **Offline-Speicher verschlüsseln:** siehe „Braucht eine Entscheidung“.
- [x] **Audit mit Sitzung und Gerät** (Sitzungs-ID, User-Agent).
- [x] **Feinere Medikationsrechte:** verabreichen vs. Verordnung bearbeiten.
- [x] **Lernen:** Quiz mit Bestehensgrenze (von der Einrichtung festgelegt) und Compliance-Übersicht je Team.
- [x] **Dokumente:** Lesebestätigung bei neuer Version erneut anfordern. War bereits so gebaut (jede Version eigene
      Zeile, Benachrichtigung „Standard aktualisiert“), jetzt mit Test; ergänzt: nachträglich verlangte Bestätigung
      benachrichtigt alle, die noch nicht bestätigt haben.
- [x] **Trendhinweise Ernährung:** Hinweis, wenn eine von der Einrichtung gesetzte Grenze für Gewicht oder
      Trinkmenge unterschritten wird. Keine erfundenen Werte. Einstellungen „Hinweis Gewichtsverlust“ (%),
      „Beobachtungszeitraum Gewicht“ (Tage) und „Hinweis Trinkmenge“ (Tage in Folge unter dem persönlichen
      Trinkziel), alle ohne Vorgabewert und ausgeschaltet.
- [x] **Wunden:** Verbandsmaterial je Versorgung aus dem Materialkatalog (Momentaufnahme je Eintrag; keine
      Lagerbuchung – das wäre eine eigene Entscheidung zur Bestandsführung).
- [x] **Dienstplan:** Börse für offene Dienste (fehlende Mindestbesetzung im veröffentlichten Plan; Interesse
      melden, Leitung teilt über die Regelprüfung zu oder lehnt ab).
- [x] **Dark Mode** als Wahl in den persönlichen Einstellungen. Das Standard-Aussehen bleibt unverändert.

## Niedrig / später

- [x] **MFA (TOTP)** mit Wiederherstellungscodes und Zurücksetzen durch die Administration. Braucht `CARECORE_MFA_KEY`.
- [ ] **Passkeys**, danach SSO (braucht einen Identity-Provider der Einrichtung).
- [x] **Smart Workflow Sturz** als erste Ablaufkette mit Folgeaufgaben. Umgesetzt für alle Ereignisarten; die
      Schritte (Titel, Fälligkeit nach dem Ereignis, Priorität) legt das Qualitätsmanagement fest, ohne Vorgaben.
- [x] **Home in Kritisch / Wichtig / Routine** gliedern, ohne das bestehende Aussehen zu verändern. Die Tagesliste
      filtert nach diesen drei Stufen, mit Anzahl je Stufe; Karten und Anordnung bleiben wie bisher.
- [x] **Resident 360** in Insights: „Kennzahlen Bewohner“ zeigt je Bewohner heute Fälliges (kritisch / wichtig /
      Routine), Wunden, Ereignisse der letzten 90 Tage, Ernährungshinweise und die letzte Dokumentation.
- [x] **Personal-Dashboards** in Insights: „Meine Kennzahlen“ – jede Person heftet Kennzahlen aus Pflege, Bewohnern,
      Leitung und Personal an (höchstens 16), gespeichert in den persönlichen Einstellungen.
- [ ] **Konfigurierbare Terminologie** (Bewohner / Patient / Klient), danach FR / IT / EN.
  - [x] Grundlage: Wahl in „Leitung › Konfiguration“ (mit Protokoll), feste Wortformen je Bezeichnung
        (`lib/terminology.ts`), gilt in Navigation, Kopfzeile, Handy-Navigation, Suche und Startseite.
  - [x] Bewohner-Modul: Übersicht, Verzeichnis, Aufnahme, Akte mit allen Bereichen, Pflegeakte, Verlauf & Archiv.
  - [x] Medikation, Wunden, Vitalwerte, Ernährung.
  - [x] Planung, Einschätzungen, RAI, Dokumentation, Betrieb (Aufgaben, Übergabe, Kalender), Qualität, Kennzahlen,
        Assistenz, Administration, Einstellungen, Hilfe und Tastaturkürzel.
  - [ ] Meldungen des Servers (Fehlermeldungen, Benachrichtigungen, Exporte) und Seitentitel im Browser.
  - [ ] Weitere Sprachen FR / IT / EN.
- [ ] **Admin-Konfiguration:** Ereignistypen, Vitalparameter, Branding.
- [ ] **Datenschutz:** Lösch- und Aufbewahrungskonzept für Bewohnerdaten. Fristen legt die Einrichtung fest.
- [ ] **Echtzeit** (Server-Sent Events) statt Polling.
- [ ] **Öffentliche API, Webhooks, FHIR.**
- [ ] **Portale (Phase 6).**

## Braucht eine Entscheidung oder externe Quelle

- **Offline-Verschlüsselung:** Ein Schlüssel, der nur im Arbeitsspeicher liegt, schützt den Gerätespeicher wirksam,
  macht aber vorgemerkte Einträge nach einem Neuladen ohne Verbindung unlesbar (nicht mehr anzeigen oder bearbeiten,
  gesendet werden sie erst mit Verbindung). Ein im Browser gespeicherter Schlüssel erhält die heutige Bedienung, liegt
  aber selbst auf dem Gerät und schützt deshalb kaum. Zu entscheiden: welcher Weg, und ob auch der Seiten- und
  Daten-Zwischenspeicher des Service Workers verschlüsselt werden soll.
- **Leitung:** Soll die Rolle „Leitung“ das Medikationsrecht nur mit Qualifikation erhalten? Heute hat sie es immer.
  Umsetzbar ohne Code über Mitarbeitende › Profile & Rollen › „Nur mit Qualifikation“.
- **Interaktionsprüfung:** Braucht eine lizenzierte Arzneimitteldatenbank. Es werden keine Regeln erfunden.
- **SSO:** Braucht den Identity-Provider der Einrichtung.
- **Backups / Disaster Recovery:** Laufen beim Datenbank-Anbieter; Ziele für RPO und RTO legt der Betreiber fest.

## Bekannte Grenzen

- Eigene Rollen (`carecore_roles`) gelten für alle Organisationen der Datenbank, nicht je Organisation.
- Das Löschen von Mitarbeitenden entfernt das Konto endgültig; für ausgeschiedene Personen besser „Sperren & archivieren“.
- Grauer Hilfstext (`--muted`) erreicht 4,4:1 und liegt knapp unter AA für kleine Schrift. Er bleibt unverändert,
  weil sich die Optik nicht verändern soll.

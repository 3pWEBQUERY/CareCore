# To-do-Liste

Abgleich des Projekts mit dem **CareCore PRD v1.0** (Stand 29.09.2026). Die frühere Liste (PR #35–#47) ist
abgeschlossen; Erledigtes steht im README und in den Pull Requests.

Legende: ✅ vorhanden · 🟡 teilweise · ❌ fehlt

## Abgleich je PRD-Bereich

| PRD-Bereich                  | Stand | Befund im Code                                                                                                                                                             |
| ---------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home „One Shift. One Screen“ | ✅    | Startseite `/c` mit Widgets, Notizen, Schnellzugriff, Zeitleiste; Tagesliste gefiltert nach Kritisch / Wichtig / Routine.                                                  |
| Bewohner-Kopfbereich         | ✅    | Akte mit Übersicht, Verlauf, Körperstatus, Dokumenten und Reanimationsstatus im Aktenkopf.                                                                                 |
| Resident Timeline            | ✅    | `bewohner/verlauf`, `lib/resident-history.ts`.                                                                                                                             |
| Plan                         | ✅    | Pflegeplanung mit Zielen, Massnahmen, Evaluation, Einschätzungen. Keine regelbasierten Vorschläge aus Einschätzungen.                                                      |
| Chart / Schnelldoku          | ✅    | Doku, Nachträge, Schnelldokumentation, Abschluss aus Aufgaben mit ✓ △ ✕, Diktieren mit Erkennung auf dem Gerät.                                                            |
| Handover                     | ✅    | Übergabe, „Seit meinem letzten Dienst“, Lesebestätigung (`carecore_handover_reads`).                                                                                       |
| Tasks                        | ✅    | Offen, in Bearbeitung, eskaliert, erledigt, teilweise, nicht erledigt, abgebrochen; überfällig berechnet.                                                                  |
| Med                          | 🟡    | Runde, Reserve (PRN), BtM, Bestand, Wechselwirkungen aus Hinweisen der Einrichtung. Lizenzierte Arzneimitteldatenbank nicht angebunden.                                    |
| Vitals                       | ✅    | Individuelle Grenzwerte je Bewohner (`carecore_vital_thresholds`).                                                                                                         |
| Wounds                       | ✅    | Verlauf, Fotos, Körperkarte, Erinnerungen, Verbandsmaterial je Versorgung aus dem Materialkatalog.                                                                         |
| Nutrition                    | ✅    | Plan, Trinken, Mahlzeiten, Screenings; Trendhinweise Gewicht und Trinkmenge nach Grenzen der Einrichtung.                                                                  |
| Team / Kanäle                | ✅    | Kanäle, Beiträge, Lesebestätigungen (`carecore_post_reads`).                                                                                                               |
| Chat                         | ✅    | Unterhaltungen, Reaktionen, @Erwähnungen; Benachrichtigung und Push bei Direktnachricht und Erwähnung.                                                                     |
| Schedule                     | ✅    | Dienstplan, Tausch, Wünsche, Zeiterfassung, KI-Planung. Börse für offene Dienste.                                                                                          |
| Docs                         | ✅    | Versionen, Freigabe, Lesebestätigung (`carecore_document_reads`); neue Version verlangt die Bestätigung erneut.                                                            |
| Learn                        | ✅    | Schulungen, Pflicht, Gültigkeit, Nachweise, Link, Quiz mit Bestehensgrenze, Übersicht je Team. Videos nur als Link.                                                        |
| Quality                      | ✅    | Ereignisse mit Massnahmen und Status.                                                                                                                                      |
| KI-Assistenten               | 🟡    | Übergabe, Risiken, Dokumentation, Pflegeplanung, freie Frage, Dienstplan-KI; Entwürfe mit Prüfung. Keine Such-Assistenz.                                                   |
| Globale Suche ⌘K             | ✅    | `global-search-dialog.tsx`, Tastenkürzel.                                                                                                                                  |
| Benachrichtigungen           | ✅    | Klassen Kritisch / Handlung / Info / Sozial, Bündelung, Push mit Ruhezeiten.                                                                                               |
| Mobile                       | 🟡    | Untere Navigation, Hauptmenü, Schnellaktions-Knopf (FAB).                                                                                                                  |
| Dark Mode                    | ✅    | Persönliche Wahl „Erscheinungsbild: Dunkel“; Standard bleibt hell.                                                                                                         |
| Barrierefreiheit WCAG 2.2 AA | 🟡    | Tastatur, Fokusfalle, Schriftgrösse, Kontrast-Einstellung. `--muted` erreicht nur 4,4:1.                                                                                   |
| IAM                          | ✅    | Passwort, Login-Drossel, Sitzungen mit Gerät, automatische Abmeldung, MFA (TOTP), Passkeys, SSO (OpenID Connect).                                                          |
| Rechte                       | 🟡    | Rechte plus Qualifikationen; Medikation getrennt in verabreichen / verwalten.                                                                                              |
| Audit                        | ✅    | Atomar, pro Bewohner, mit Sitzung und Gerät.                                                                                                                               |
| Datenschutz                  | ✅    | Eigener Datenexport, Quittungen nach 30 Tagen gelöscht, Lösch- und Aufbewahrungskonzept (`docs/DATENSCHUTZ.md`).                                                           |
| Sicherheit                   | 🟡    | Login-, Passwort- und KI-Drossel, allgemeine Drossel für schreibende API-Anfragen.                                                                                         |
| Backups / Health             | 🟡    | Health-Endpunkt `/api/health`; Backups durch den Datenbank-Anbieter.                                                                                                       |
| Offline                      | ✅    | Warteschlange und Daten-Zwischenspeicher verschlüsselt (Schlüssel nur im Arbeitsspeicher), Entsperren ohne Verbindung mit dem Passwort, Konfliktanzeige.                   |
| API / FHIR / Webhooks        | ✅    | FHIR R4 (Patient, Observation) mit Schlüsseln, Webhooks mit Signatur (`docs/SCHNITTSTELLE.md`).                                                                            |
| Mandanten                    | ✅    | Organisation, Standort, Wohnbereich; eigene Rollen je Einrichtung. Eingebaute Rollen gelten für die Installation.                                                          |
| Domain Events / Echtzeit     | ✅    | Server-Sent Events (`/api/events`), Ereignis-Warteschlange per Trigger für Webhooks.                                                                                       |
| Admin-Konfiguration          | ✅    | Einstellungen, Terminologie, eigene Ereignisarten, Vitalparameter, Logo, Löschfristen, Schnittstellen.                                                                     |
| Insights / Resident 360      | ✅    | Kennzahlen, Bewohnerübersicht (Resident 360) und persönliches Dashboard „Meine Kennzahlen“.                                                                                |
| Smart Workflows              | ✅    | Ablaufketten je Ereignisart mit Folgeaufgaben; Schritte legt das Qualitätsmanagement fest.                                                                                 |
| Universal Action System      | ✅    | Ein Aktionsregister für Schnellaktionen und Suche ⌘K, Erfassung direkt aus der Suche.                                                                                      |
| Sprachen / Terminologie      | ✅    | Bewohner / Patient / Klient wählbar. Oberfläche in FR, IT, EN, SQ, HR, SR, HU einrichtbar: KI-Entwurf, Prüfung und Freigabe durch die Administration (`docs/SPRACHEN.md`). |
| Phase 6 Portale              | ✅    | Portal für Angehörige und Ärztinnen/Ärzte (`/portal`), Freigaben je Person/Wohnbereich und Bereich, Nachrichten, Apothekenportal.                                          |

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
- [x] **Offline-Speicher verschlüsseln:** Schlüssel nur im Arbeitsspeicher (Entscheidung vom 30.09.2026). Vorgemerkte
      Einträge liegen auf dem Gerät nur verschlüsselt (ECDH P-256 + AES-256-GCM, `lib/offline-crypto.ts`). Das
      Schlüsselpaar leitet der Server je Person aus `CARECORE_MFA_KEY` ab; den privaten Teil erhält nur die angemeldete
      Person, er bleibt nicht exportierbar im Arbeitsspeicher. Nach einem Neuladen ohne Verbindung lässt sich weiter
      erfassen (öffentlicher Schlüssel), vorgemerkte Einträge sind aber bis zur Verbindung gesperrt; ältere
      unverschlüsselte Einträge werden beim nächsten Entsperren verschlüsselt.
- [x] **Leitung verabreicht Medikamente immer:** Die Rollenverwaltung hält „Medikation verabreichen“ und „ohne
      Qualifikation“ für die Leitung fest (wie die Rechte der Administration); Migration 0049 gleicht bestehende
      Installationen an.
- [x] **Spracheingabe** nur mit Erkennung auf dem Gerät (Entscheidung vom 30.09.2026): Knopf „Diktieren“ bei
      Dokumentationseintrag und Übergabepunkt, nur wenn der Browser die Erkennung lokal anbietet (Web Speech API mit
      `processLocally`, Sprachpaket de-CH bzw. de-DE auf dem Gerät). Ohne lokale Erkennung erscheint kein Knopf – kein
      Rückgriff auf die Cloud-Erkennung. Eingeschaltet wird sie in den persönlichen Einstellungen („Spracheingabe“,
      Standard aus) – erst dann fragt CareCore den Browser, weil manche Chromium-Builds ohne Sprachmodul bei dieser
      Abfrage die Seite beenden. Ein eigener Erkennungsdienst (z. B. Whisper auf eigenem Server) wäre die Ergänzung
      für Geräte ohne lokale Erkennung.
- [x] **Zwischenspeicher des Service Workers verschlüsselt** (Entscheidung vom 30.09.2026). Daten (`GET /api/…`) liegen
      nur verschlüsselt im Browser-Cache (`public/sw-crypto.js`, gleiches Verfahren wie die Warteschlange); ohne
      Schlüssel speichert der Service Worker nichts. Den privaten Schlüssel hält die geöffnete App im Arbeitsspeicher und
      gibt ihn dem Service Worker auf Anfrage, auch er behält ihn nur im Arbeitsspeicher. Lesen und Bearbeiten bleiben
      damit möglich: mit Verbindung immer, ohne Verbindung solange die App offen ist. Nach einem Neustart ohne
      Verbindung entsperrt die Person Daten und vorgemerkte Einträge mit ihrem Passwort: bei der Anmeldung mit Passwort
      legt die App den privaten Schlüssel mit dem Passwort verschlüsselt ab (PBKDF2-SHA-256, 600 000 Runden); beim
      Abmelden wird er gelöscht. Nach Anmeldung mit Passkey oder SSO gibt es kein Entsperren ohne Verbindung. Seiten
      enthalten keine Personendaten und bleiben als App-Hülle unverschlüsselt.
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
- [x] **Wechselwirkungsprüfung** eingerichtet, noch ohne lizenzierte Datenbank (Entscheidung vom 30.09.2026). Die
      Einrichtung erfasst Hinweise (Wirkstoff/Präparat A und B, Schweregrad, Beschreibung, Empfehlung, Pflichtangabe
      Quelle) in Leitung › Konfiguration; wer Verordnungen verwaltet, darf sie pflegen, protokolliert. Trifft ein Hinweis
      auf zwei laufende Verordnungen derselben Person zu, erscheint er im Medikamentenplan und bei den Reserven, mit dem
      Vermerk, dass fehlende Hinweise keine Unbedenklichkeit bedeuten. CareCore enthält keine eigenen Regeln.
- [x] **Dark Mode** als Wahl in den persönlichen Einstellungen. Das Standard-Aussehen bleibt unverändert.

## Niedrig / später

- [x] **MFA (TOTP)** mit Wiederherstellungscodes und Zurücksetzen durch die Administration. Braucht `CARECORE_MFA_KEY`.
- [x] **Passkeys** (WebAuthn): in Einstellungen › Sicherheit hinzufügen und entfernen (protokolliert); Anmeldung
      über den Vorschlag im Feld „Benutzername“ oder „Mit Passkey anmelden“. Bestätigung am Gerät ist Pflicht, deshalb
      ersetzt ein Passkey Passwort und Code. Gespeichert wird nur der öffentliche Schlüssel.
- [x] **SSO** selbst gebaut mit Open-Source-Bausteinen (Entscheidung vom 30.09.2026): OpenID Connect mit
      `openid-client` (MIT), Authorization Code mit PKCE, state und nonce, geprüftes ID-Token. Je Einrichtung in
      Leitung › Konfiguration (Issuer, Client-ID, Secret verschlüsselt, Claim für den Benutzernamen, Bezeichnung).
      Nur bestehende, aktive Konten der Einrichtung; Knopf auf der Anmeldeseite nur, wenn eingeschaltet. Beschreibung in
      `docs/SSO.md`.
- [x] **Smart Workflow Sturz** als erste Ablaufkette mit Folgeaufgaben. Umgesetzt für alle Ereignisarten; die
      Schritte (Titel, Fälligkeit nach dem Ereignis, Priorität) legt das Qualitätsmanagement fest, ohne Vorgaben.
- [x] **Home in Kritisch / Wichtig / Routine** gliedern, ohne das bestehende Aussehen zu verändern. Die Tagesliste
      filtert nach diesen drei Stufen, mit Anzahl je Stufe; Karten und Anordnung bleiben wie bisher.
- [x] **Resident 360** in Insights: „Kennzahlen Bewohner“ zeigt je Bewohner heute Fälliges (kritisch / wichtig /
      Routine), Wunden, Ereignisse der letzten 90 Tage, Ernährungshinweise und die letzte Dokumentation.
- [x] **Personal-Dashboards** in Insights: „Meine Kennzahlen“ – jede Person heftet Kennzahlen aus Pflege, Bewohnern,
      Leitung und Personal an (höchstens 16), gespeichert in den persönlichen Einstellungen.
- [x] **Konfigurierbare Terminologie** (Bewohner / Patient / Klient), danach weitere Sprachen.
  - [x] Grundlage: Wahl in „Leitung › Konfiguration“ (mit Protokoll), feste Wortformen je Bezeichnung
        (`lib/terminology.ts`), gilt in Navigation, Kopfzeile, Handy-Navigation, Suche und Startseite.
  - [x] Bewohner-Modul: Übersicht, Verzeichnis, Aufnahme, Akte mit allen Bereichen, Pflegeakte, Verlauf & Archiv.
  - [x] Medikation, Wunden, Vitalwerte, Ernährung.
  - [x] Planung, Einschätzungen, RAI, Dokumentation, Betrieb (Aufgaben, Übergabe, Kalender), Qualität, Kennzahlen,
        Assistenz, Administration, Einstellungen, Hilfe und Tastaturkürzel.
  - [x] Texte des Servers: Kennzahlen (mit fester ID für „Meine Kennzahlen“), Übersichten, Fehlermeldungen,
        RAI-Export und KI-Aufträge. Seltene Fehlermeldungen ohne Einrichtung sind neutral formuliert („Akte …“).
  - [x] Seitentitel im Browser-Tab („CareCore · Patienten“).
  - [x] Weitere Sprachen (Entscheidung vom 30.09.2026): Französisch, Italienisch, Englisch, Albanisch, Kroatisch,
        Serbisch (lateinisch), Ungarisch für die gesamte App. Textkatalog aus dem Code (`npm run i18n:extract`, in CI
        geprüft), KI-Entwürfe, Prüfung Text für Text und Freigabe je Sprache in Leitung › Administration › Sprachen;
        Mitarbeitende sehen nur Geprüftes, Wahl unter Einstellungen › Sprache, auch im Portal. Beschreibung in
        `docs/SPRACHEN.md`. Offen: die eigentliche Prüfung der Texte durch Administration und Auftraggeber.
- [x] **Admin-Konfiguration:** Ereignistypen, Vitalparameter, Branding.
  - [x] Ereignisarten: eigene Arten der Einrichtung (höchstens 20) neben den eingebauten; beim Melden und in den
        Ablaufketten wählbar, protokolliert. Entfernen nimmt die Ablaufkette mit, gemeldete Ereignisse bleiben.
  - [x] Vitalparameter: die Einrichtung schaltet eingebaute Messwerte aus (Messung, Übersicht, Entwicklung, Grenzwerte);
        neue Messungen ausgeschalteter Werte werden abgelehnt, sie zählen nicht für den Status. Eigene Messwerte mit
        Plausibilitäts- und Grenzwerten bräuchten fachlich festgelegte Werte und sind bewusst nicht Teil davon.
  - [x] Branding: Logo der Einrichtung (JPEG, PNG, WebP bis 300 KB, Inhalt geprüft, kein SVG) in der Kopfzeile neben
        dem Namen; ohne Logo bleibt das bisherige Symbol.
- [x] **Datenschutz:** Lösch- und Aufbewahrungskonzept für Bewohnerdaten. Fristen legt die Einrichtung fest.
      Konzept in `docs/DATENSCHUTZ.md`; Einstellung „Aufbewahrungsfrist Akten“ (ohne Vorgabe), Karte „Löschfristen“ mit
      Löschung nur auf Bestätigung durch die Administration.
- [x] **Echtzeit** (Server-Sent Events) statt Polling. `/api/events` meldet Änderungen an Benachrichtigungen,
      Nachrichten sowie Aufgaben/Übergaben (Prüfung alle 10 s, Stand als Event-ID fürs Wiederverbinden); Kopfzeile,
      Navigationszähler und Messenger laden sofort nach. Das bisherige Nachladen bleibt als seltene Absicherung.
- [x] **Öffentliche API, Webhooks, FHIR.**
  - [x] Öffentliche Schnittstelle nach HL7 FHIR R4 (nur lesend): Patient und Observation (Vitalwerte, LOINC/UCUM),
        `metadata` ohne Schlüssel. Schlüssel je angebundenem System mit Berechtigungen, erstellt und widerrufen durch die
        Administration (Leitung › Konfiguration), gespeichert nur als Hash; jeder Zugriff protokolliert. Beschreibung in
        `docs/SCHNITTSTELLE.md`.
  - [x] Webhooks: signierte Meldungen (HMAC-SHA256) bei Aufnahme, Änderung der Personendaten und neuen Vitalwerten,
        nur mit Verweis auf die FHIR-Ressource. Vorgemerkt per Trigger, Zustellung mit Wiederholungen, Ziele im
        internen Netz gesperrt (auch nach der Namensauflösung), Geheimnis verschlüsselt, Probemeldung aus der
        Konfiguration.
- [x] **Einrichtbare Übersichtsseiten:** Startseite (alle Bausteine, Kopf- und Hauptbereich, Breite) und die
      Kennzahlen-Seiten (Pflege, Bewohner, Leitung, Personal, Meine Kennzahlen: verschieben, Breite, stapeln,
      ausblenden) je Person; Arbeitsseiten bleiben bewusst einheitlich (Entscheidung vom 01.10.2026).
- [x] **Google Gemini** (`gemini-3.5-flash-lite`, Entscheidung vom 30.09.2026) für CareCore KI, KI-Dienstplanung
      und Übersetzungsentwürfe, Schlüssel `GEMINI_API_KEY`; Mistral und Anthropic entfernt.
- [x] **Portale (Phase 6).**
  - [x] Portal für Angehörige und Ärztinnen/Ärzte (Entscheidung vom 30.09.2026): eigene Zugänge mit Einmal-Passwort,
        Freigaben individuell je Person oder Wohnbereich, einzeln gewählte Bereiche (Notfalldaten, Medikation,
        Vitalwerte, Pflegeberichte, Termine, Wunden), Zeitraum und Grundlage mit Vermerk; Widerruf sofort, jeder Abruf
        protokolliert. Beschreibung in `docs/PORTAL.md`.
  - [x] Nachrichten zwischen Portal und Pflege (CareCore One › Portal-Nachrichten), Apothekenportal mit Bestellungen
        aus Medikation › Bestellungen, Hilfe mit Bildschirmfotos im Portal. Lizenzierte Arzneimitteldatenbank offen.
- [x] **Mandanten: eigene Rollen je Einrichtung.** Nur die Einrichtung, die eine Rolle anlegt, sieht, vergibt, ändert
      und löscht sie; bestehende eigene Rollen wurden ihrer Einrichtung zugeordnet (Migration 0048). Eingebaute Rollen
      bleiben gemeinsam.
  - [x] **Rollen kopieren:** In der Rollenverwaltung „Rolle kopieren“ bei jeder Rolle (auch Systemrollen): die Kopie
        übernimmt Berechtigungen und Medikationseinstellung als neue eigene Rolle der Einrichtung, Name und Schlüssel
        frei wählbar, protokolliert als „kopiert“ mit der Vorlage. Rollen anderer Einrichtungen sind keine Vorlage.
- [x] **Universal Action System:** ein Aktionsregister (`app/components/actions.ts`) für Schnellaktionen und Suche ⌘K.
      In der Suche z. B. „vital“ (Person aus der Kopfzeile) oder „vital Muster“ (gleich für diese Person); Vitalwerte
      und Trinkmenge öffnen die Erfassung direkt, die Übergabe wählt die Person vor und setzt den Cursor ins Textfeld.
      Die Startseite nutzt dieselbe Suche wie alle anderen Seiten.
- [x] **KI-Planungsassistenz:** Auftrag „Pflegeplanung vorschlagen“ in CareCore KI, nur für eine Person: Probleme,
      Ressourcen, Ziele und Massnahmen mit Datengrundlage aus Einschätzungen, bestehender Planung, zwei Wochen Berichten,
      Vitalwerten und Wunden (pseudonymisiert). Bestehende Ziele werden nicht doppelt vorgeschlagen, keine erfundenen
      Werte; der Vorschlag bleibt ein Entwurf, den die Pflegefachperson prüft und selbst in die Planung überträgt.

- [x] **Dialoge: Aktionen fest unten.** In allen Seitenpanels (Formulare, Notizen, Mitarbeitende, Rollen, Kontakte,
      Passwort, Gruppen) stehen Speichern, Abbrechen und weitere Aktionen fest unten im Footer; langer Inhalt scrollt
      darunter durch. Sidebar-Tooltips zeigen das Tastenkürzel als Taste, „Zeitplan“ steht auf Höhe von „Als Nächstes“.

- [x] **Arbeitsplatz: alle Bereiche einrichtbar.** Auch die Begrüssung (Datum, Begrüssung, Uhrzeit) ist ein Baustein:
      verschieben, Breite wählen, zwischen Kopf- und Hauptbereich wechseln, ausblenden. Die Breitenwahl auf dem
      Arbeitsplatz und den Kennzahlen-Seiten nutzt das CareCore-Dropdown statt der Browser-Auswahl.

- [x] **Verkaufsbereit 1 – Sicherheit:** Next.js 16.3.8 (kritische Lücke geschlossen), Sicherheits-Header (CSP, HSTS,
      Einbettschutz, Permissions-Policy); Klicktests melden jeden CSP-Verstoss.
- [x] **Verkaufsbereit 2 – E-Mail-Versand:** SMTP (`docs/EMAIL.md`), E-Mail-Adresse bei Mitarbeitenden, „Passwort
      vergessen?“, Einladung statt Startpasswort, Link zum Passwort setzen; Links einmalig, gehasht, protokolliert.
- [x] **Verkaufsbereit 3 – Installation je Einrichtung:** Anleitung `docs/INSTALLATION.md`, Skript für die Geheimnisse,
      Name der Einrichtung in der Konfiguration änderbar (Kopfzeile ohne Neuladen), Checkliste „CareCore einrichten“.
- [x] **Verkaufsbereit 4 – Überwachung und Backups:** Serverfehler im Systemstatus, Alarm per E-Mail
      (`ALERT_EMAIL`), Anleitung `docs/BETRIEB.md` (Railway-Backups und PITR, Bucket, Benachrichtigungen,
      Verfügbarkeitstest, Wiederherstellung üben, Ernstfall). Die Backups selbst schaltet der Betreiber in Railway ein.
- [x] **Verkaufsbereit 5 – Datenübernahme:** Bewohner und Mitarbeitende aus CSV mit Vorlage, Prüfung je Zeile,
      Übernahme nur vollständig gültiger Dateien; Mitarbeitende per Einladung oder mit einmaligem Startpasswort.

## Entschieden (30.09.2026)

- **Sprachen:** ganze App in FR, IT, EN, SQ, HR, SR, HU; Prüfung durch die Administration und den Auftraggeber.
- **Portal:** für Ärztinnen/Ärzte und Angehörige, Berechtigungen individuell je Zugang, Person/Wohnbereich und Bereich.
- **Interaktionsprüfung:** jetzt einrichten, lizenzierte Datenbank folgt (Anbieter offen).
- **Eigene Rollen:** je Einrichtung, kopierbar.
- **Offline-Zwischenspeicher:** verschlüsseln; Lesen und Bearbeiten bleiben möglich (ohne Verbindung mit Passwort).
- **Offline-Verschlüsselung:** Schlüssel nur im Arbeitsspeicher.
- **Leitung:** hat das Recht zur Medikamentenvergabe, immer und ohne Qualifikation.
- **Spracheingabe:** nur mit Erkennung auf dem Gerät bzw. einem eigenen Dienst, keine Übermittlung an Hersteller.
- **SSO:** selbst gebaut mit Open-Source-Bausteinen.

## Braucht eine Entscheidung oder externe Quelle

- **Lizenzierte Arzneimitteldatenbank** für die Wechselwirkungsprüfung (Anbieter noch offen, Entscheidung vom
  30.09.2026). Die Prüfung ist eingerichtet und nutzt bis dahin nur die Hinweise der Einrichtung; der Anbieter käme in
  `lib/medication-interactions.ts` als zweite Quelle dazu.
- **Backups / Disaster Recovery:** In Railway je Installation einschalten (`docs/BETRIEB.md`); Ziele für RPO und RTO
  legt der Betreiber mit der Einrichtung fest.

## Bekannte Grenzen

- Rollen-Schlüssel sind installationsweit eindeutig: zwei Einrichtungen können nicht denselben Schlüssel verwenden.
- Das Löschen von Mitarbeitenden entfernt das Konto endgültig; für ausgeschiedene Personen besser „Sperren & archivieren“.
- Grauer Hilfstext (`--muted`) erreicht 4,4:1 und liegt knapp unter AA für kleine Schrift. Er bleibt unverändert,
  weil sich die Optik nicht verändern soll.

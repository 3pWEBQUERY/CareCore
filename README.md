CareCore ist eine Next.js-Anwendung mit geschütztem Pflegearbeitsplatz unter `/c` und einer Neon-Postgres-basierten Anmeldung.

## Lokale Einrichtung

1. `.env.example` als `.env.local` kopieren.
2. `DATABASE_URL` mit der gepoolten Neon-Verbindungsadresse und `CARECORE_ADMIN_PASSWORD` (mindestens 12 Zeichen) befüllen.
3. `npm install`, dann `npm run db:migrate` und anschließend `npm run dev` ausführen.

Beim ersten Anmeldeversuch wird der Administrator `Admin` mit dem Passwort aus `CARECORE_ADMIN_PASSWORD` angelegt.

## Datenbank-Migrationen

Das Schema wird ausschließlich über nummerierte SQL-Dateien in `database/migrations` verwaltet; die Anwendung legt zur Laufzeit keine Tabellen an. Das Schema deckt Organisationen, Wohnbereiche, Bewohner, Pflegeplanung, Dokumentation, Assessments, Vitalwerte, Medikation, Wunden, Ernährung, Dienste, Aufgaben, Übergaben, Kommunikation, Dokumente, Schulungen, Qualität, RAI, KI-Entwürfe, Benachrichtigungen und Auditierung ab.

```bash
npm run db:migrate            # ausstehende Migrationen anwenden
npm run db:migrate -- --dry-run   # nur anzeigen, was ausstehend ist
```

Angewendete Migrationen werden mit Prüfsumme in `carecore_schema_migrations` festgehalten. Eine bereits angewendete Datei darf nicht mehr verändert werden – Schemaänderungen kommen immer als neue Datei hinzu, z. B. `0002_medication_orders.sql`. Jede Migration läuft in einer Transaktion.

Auf Vercel führt das Skript `vercel-build` die Migrationen vor `next build` aus, allerdings nur für Production-Deployments: Preview-Deployments nutzen dieselbe Datenbank und dürfen das Schema nicht verändern.

Danach können leere Fach-Tabellen mit wiederholbar ausführbaren Beispieldaten befüllt werden:

```bash
npm run db:seed
```

Der Seed überspringt Tabellen, die bereits Daten enthalten. Vorhandene Bewohner-, Mitarbeiter- und Organisationsdaten werden nicht überschrieben. In der aktuellen Demo lesen und schreiben Bewohneraufnahme, Aufgaben, Pflegedokumentation und Benachrichtigungen über Neon. Die Startseite zeigt Bewohner, Aufgaben und dokumentierte Änderungen aus Neon. Andere Fachansichten enthalten teilweise noch lokale Demonstrationsdaten und sind noch keine vollständig persistierten Arbeitsabläufe.

Für Vercel müssen `DATABASE_URL` und `CARECORE_ADMIN_PASSWORD` in den Umgebungsvariablen des Projekts für Production, Preview und Development gesetzt sein. Die Anwendung benötigt den normalen Next.js-Serverbetrieb; ein statischer Export ist wegen Login, Sessions und Datenbankzugriff nicht möglich.

## Bewohnerakte

- **Änderungsprotokoll:** Jede Änderung an der Akte (Stammdaten, Kontakte, Biografie, Bewohnerbild, Körperbefunde, Pflegebedarf, Dokumente sowie Einträge aus Dokumentation, Medikation, Vitalwerten und Wunden) wird in `carecore_audit_log` festgehalten – in derselben Transaktion wie die Änderung (`lib/resident-audit.ts`). Unter Bewohnerakte › Verlauf › „Änderungsprotokoll“ sieht die Leitung (Rollen mit `team.manage` oder `administration.manage`), wer wann was geändert hat. Biografie-Inhalte, AHV- und Versichertennummer werden nicht im Klartext protokolliert.
- **Überleitungsbogen:** Im Kopf der Akte erzeugt „Überleitungsbogen“ eine A4-Druckansicht für Spitaleinweisung oder Verlegung (Stammdaten, Kontakte, Allergien, Risiken, aktuelle Medikation inkl. Reserve, Wunden/Befunde, Vitalwerte, Ernährung, Pflegeziele, Verlauf der letzten 72 Stunden). Das Erstellen wird protokolliert.

## Medikationsrecht

Medikation (`medication.manage`: Gaben dokumentieren, Verordnungen, Bestände, BtM, Zweitunterschrift) dürfen Administration, Leitung und Ärztlicher Dienst. In der Rolle „Pflege“ gilt das Recht nur für Personen mit einer gültigen Qualifikation, die zur Medikation berechtigt – standardmäßig Pflegefachperson HF und Fachperson Gesundheit (FaGe), nicht Pflegehelfer:in SRK (Migration `0027_medication_qualification.sql`).

- Welche Qualifikationen berechtigen, legt die Leitung unter Dienstplan › Einstellungen › Qualifikationen fest (z. B. zusätzlich „FH“); Änderungen werden protokolliert.
- Qualifikationen mit Gültigkeitszeitraum werden je Person unter Dienstplan › Einstellungen › Personal hinterlegt.
- Ob eine Rolle das Recht nur mit Qualifikation erhält, ist unter Mitarbeitende › Profile & Rollen einstellbar.
- Maßgeblich ist die Datenbankfunktion `carecore_effective_permissions`, die Anmeldung, Navigation und Zweitunterschrift gleichermaßen verwenden.

## Betäubungsmittel (BtM)

Unter Medikation › „BtM-Kontrolle“ (`/medikation/btm`) werden als BtM gekennzeichnete Präparate mit lückenlosem Bestandsbuch geführt (Migration `0026_btm.sql`, `lib/medication-btm.ts`). Welche Präparate als BtM gelten und in welchen Abständen kontrolliert wird, legt die Einrichtung fest; CareCore gibt dafür keine Regeln vor.

- **Kennzeichnung:** Personen mit `medication.manage` kennzeichnen Präparate als BtM. Das Aufheben verlangt eine Begründung; beides wird protokolliert.
- **Zweitunterschrift:** Eingang, Entsorgung, Bestandskorrektur und Bestandskontrolle eines BtM verlangen eine zweite Person. Sie bestätigt mit eigenem Benutzernamen und Passwort; sie muss aktiv, in derselben Organisation und für Medikation berechtigt sein. Fehlversuche werden wie bei der Anmeldung gedrosselt. Gaben aus der Medikamentenrunde werden mit der verabreichenden Person gebucht, ohne Zweitunterschrift.
- **Bestandskontrolle:** Gezählter und erwarteter Bestand werden gegenübergestellt. Eine Differenz muss begründet werden und wird als Korrekturbuchung im selben Schritt gebucht.
- **Unveränderlichkeit:** Buchungen von BtM und Bestandskontrollen können per Datenbank-Trigger weder geändert noch gelöscht werden; Fehler werden durch neue Buchungen korrigiert.
- **Kontrollintervall:** Unter Leitung › Konfiguration › „BtM-Bestandskontrolle“ legt die Einrichtung fest, nach wie vielen Tagen eine Kontrolle fällig ist (ohne Standardwert, anfangs ausgeschaltet). Fällige Bestände werden auf der BtM-Seite markiert; Personen mit Medikationsrecht erhalten je Bestand und Kontrollzyklus eine Benachrichtigung (mit Stammwohnbereich nur für dessen Bestände; abschaltbar unter Einstellungen › Benachrichtigungen › „BtM-Kontrolle“).
- **Gaben:** In Medikamentenrunde, Medikamentenplan, Reserven und im Überleitungsbogen sind BtM gekennzeichnet.
- **BtM-Buch:** Pro Bestand alle Buchungen mit laufendem Bestand, Person und Zweitunterschrift, als Seitenpanel und als A4-Druckansicht (`/medikation/btm/buch?stock=…`, PDF über den Druckdialog).

## Dienstplan

Das Dienstplan-Modul (Spezifikation: `docs/specs/dienstplan.md`, Entscheidungen und Stand: `docs/dienstplan/`) ersetzt die frühere Dienstplanung. Es besteht aus:

- **Leitung › Dienstplan** (`/c/dienstplan`, Berechtigung `schedule.manage` und Leitung des Wohnbereichs): Monats-/Wochenraster mit Drag & Drop, Entwurf/Veröffentlichen, Analyse, KI-Planung, Anträge, Arbeitszeit (Soll/Ist, Korrekturen, Monatsabschluss), Einstellungen (Diensttypen, Mindestbesetzung, Regelwerk, Personal, Qualifikationen, Feiertage) und Protokoll.
- **Mein Dienst › Mein Dienstplan** (`/c/mein-dienstplan`): eigene veröffentlichte Dienste mit Stempeln und Pause, Teamplan der Wohngruppe (Abwesenheiten anderer nur als „Abwesend“), Anträge (Wunschfrei, Abwesenheit, Dienstwunsch, Tausch, Korrekturen) und Zeiten.
- „Dienst starten/beenden“ unter **Mein Dienst › Heute** stempelt in derselben Zeiterfassung.

Geplant wird wie im PEP: Kürzel direkt in die Zellen tippen, Bereiche markieren, kopieren und einfügen (auch aus Excel), mit der Dienst-Palette stempeln und Musterwochen übertragen; Strg+Z/Strg+Y macht Zellen-Änderungen rückgängig bzw. wiederholt sie.

Der Monatsplan (auch der Teamplan) lässt sich über „Drucken / PDF“ als A4-Querformat drucken oder als PDF speichern. Unter Arbeitszeit exportiert die Leitung „CSV Summen“ (je Person) und „CSV Einträge“ (alle Zeiteinträge) für die Lohnbuchhaltung (`/api/dienstplan/time/export`, Semikolon, Dezimalkomma, UTF-8 mit BOM für Excel).

Jede Änderung läuft serverseitig durch die Regel-Engine (`lib/roster/rules.ts`): Blocker verhindern das Speichern, Warnungen müssen mit Begründung bestätigt werden. Das Regelwerk enthält Beispielwerte nach Schweizer ArG und muss von der Leitung unter Einstellungen geprüft und bestätigt werden.

**Umgebungsvariablen**

| Variable          | Pflicht | Zweck                                                                                        |
| ----------------- | ------- | -------------------------------------------------------------------------------------------- |
| `MISTRAL_API_KEY` | nein    | KI-Planung und -Analyse. Ohne Schlüssel ist „Mit KI planen“ deaktiviert, alles andere läuft. |
| `MISTRAL_MODEL`   | nein    | Modell für die KI, Standard `mistral-large-latest`.                                          |

An die KI gehen nur pseudonymisierte Daten (E1, E2, …, Diensttyp-Codes, Zahlen) – keine Namen, Abwesenheitsgründe oder Freitexte. Jede vorgeschlagene Zuweisung wird von der Regel-Engine geprüft; übernommen wird nur in Entwürfe.

**Demo-Daten und Tests (nur Entwicklung)**

```bash
npm run db:seed:roster        # Wohngruppen Linde, Ahorn, Birke mit Personal, Plänen und Zeiten
npm test                      # Unit-Tests (Regeln, Zeitberechnung, Berechtigungen, KI-Kern)
TEST_DATABASE_URL=postgres://… npm run test:db:setup && npm run test:db   # Integrationstests
```

Demo-Logins nach dem Seed: `demo.leitung.linde`, `demo.leitung.ahorn`, `demo.leitung.birke` (Leitung) sowie `demo.linde.aline`, `demo.linde.elif` … (Mitarbeitende); Passwort `Dienstplan-Demo-2026` oder der Wert aus `ROSTER_DEMO_PASSWORD`. Der Seed bricht mit `NODE_ENV=production` ab. Die Integrationstests brauchen eine eigene, leere Postgres-Datenbank und laufen nie gegen die Produktionsdatenbank.

**Bekannte Grenzen**

- Aktualisierung per Polling (alle 25 s, pausiert im Hintergrund), kein Push in Echtzeit.
- Arbeitsrechtliche Werte sind Beispielwerte und ersetzen keine rechtliche Prüfung (GAV, Betriebsreglement).
- Der Saldo im laufenden Monat vergleicht das Ist mit dem Soll bis heute; Überträge aus Vormonaten werden nicht geführt.
- Die KI-Planung wurde mit einem Test-Double geprüft; mit einem echten Mistral-Schlüssel ist sie lokal zu verifizieren.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

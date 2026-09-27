# Dienstplan-Modul – Entscheidungen

Abweichungen von `docs/specs/dienstplan.md` und technische Entscheide. Regel 0.2: Technik folgt dem bestehenden Code, Fachliches der Spec.

## Durch die Produktverantwortung bestätigt (27.09.2026)

- **D1 – Neues Modul ersetzt den alten Dienstplan.** Die Slot-Tabellen `carecore_shifts`/`carecore_shift_assignments` werden nicht mehr beschrieben. Migration 0023 übernimmt bestehende Einteilungen als veröffentlichte Dienste, eingecheckte Einteilungen als Zeiteinträge und bewilligte Abwesenheiten als Abwesenheitsdienste, soweit zuordenbar. Alte Seiten leiten auf die neuen um; das alte Modul (API, Komponenten, `lib/schedule*`) ist entfernt.
- **D2 – KI-Anbieter Mistral** (`@mistralai/mistralai`), Modell über `MISTRAL_MODEL` (Default `mistral-large-latest`), Key `MISTRAL_API_KEY` nur serverseitig. Ohne Key ist die KI im Dienstplan deaktiviert, der Rest funktioniert.
- **D3 – Rechtsraum Schweiz (ArG).** Seed- und Default-Werte aus Abschnitt 4, überall als „Beispielwerte – rechtlich prüfen“ gekennzeichnet, bis die Leitung sie bestätigt.
- **D4 – Sichtbarkeit: Teamplan der Wohngruppe.** Mitarbeitende sehen veröffentlichte Dienste ihrer Wohnbereiche; Abwesenheiten anderer erscheinen nur als „Abwesend“ (ohne Kategorie).

## Technik (bestehender Code gewinnt)

- **T1 – Kein Prisma.** Schema als SQL-Migrationen (`database/migrations/0023_*.sql` ff.), Tabellen `carecore_*` in snake_case. Constraints aus 5.3 direkt im SQL.
- **T2 – Route Handler statt Server Actions.** Alle Mutationen unter `app/api/dienstplan/**`. Ergebnisformat wie 10: `{ ok: true, data }` bzw. `{ ok: false, error: { code, message, violations? } }`.
- **T3 – Kein Zod.** Eingaben werden in `lib/roster/schemas.ts` mit handgeschriebenen Prüffunktionen validiert (wie im restlichen Code); dieselben Funktionen prüfen die KI-Ausgabe.
- **T4 – Keine shadcn/ui, kein Lucide.** Bestehende CareCore-Komponenten und `@phosphor-icons/react` (`CalendarDots` statt `CalendarDays`). Dialoge als rechtes Seitenpanel (70 %), wie im Rest der App.
- **T5 – Transaktionen ohne `SELECT … FOR UPDATE`.** Der Neon-HTTP-Treiber kennt nur nicht-interaktive Batch-Transaktionen. Schreibvorgänge laufen deshalb als einzelne SQL-Anweisungen (CTEs), die die erwartete `version` jedes Dienstes und einen Fingerabdruck der betroffenen Dienstpläne prüfen und bei Abweichung über `carecore_assert()` abbrechen. Zwei gleichzeitige Tausche auf denselben Dienst: der zweite findet die Version nicht mehr und wird `EXPIRED`. Der Overlap-Constraint ist `DEFERRABLE INITIALLY DEFERRED`.
- **T6 – Eigenes Audit-Log.** `carecore_roster_audit` ist append-only (Trigger gegen UPDATE/DELETE/TRUNCATE), ohne Fremdschlüssel; `actor_label` hält den Namen fest. Das bestehende `carecore_audit_log` bleibt für die übrigen Module.
- **T7 – Glocke im Header.** Das bestehende Notification Center (Header, Zähler, „alle als gelesen“) wird erweitert; es gibt keine zweite Glocke in der Sidebar.
- **T8 – `@dnd-kit/core`** als neue Abhängigkeit für Drag & Drop: Pointer-, Touch- (mit Verzögerung) und Tastatursensor; natives HTML-Drag funktioniert auf Touch-Geräten nicht.
- **T9 – `pg` als Dev-Abhängigkeit** für Integrationstests gegen echtes Postgres: ein Test-Adapter leitet die Neon-HTTP-Aufrufe an eine lokale Datenbank weiter. `npm test` bleibt ohne Datenbank lauffähig, `npm run test:db` braucht `TEST_DATABASE_URL`; die CI startet dafür einen Postgres-Service.
- **T10 – Hintergrundarbeit.** Kein Cron/Queue vorhanden: fehlender Clock-out wird beim Laden (Dienstplan, Zeiterfassung, Benachrichtigungen) geprüft; KI-Läufe starten mit `after()` und werden vom Browser abgefragt.
- **T11 – Aktualisierung ohne Neuladen** per Polling (`/api/dienstplan/changes`, 25 s, pausiert bei verstecktem Tab).
- **T12 – Seed.** `database/seed-roster.ts` (`npm run db:seed:roster`), idempotent mit festen IDs, bricht bei `NODE_ENV=production` ohne `--allow-production` ab. Es legt eigene Demo-Wohnbereiche und -Personen an und überschreibt keine echten Daten.

## Fachlich (Spec gewinnt, hier nur Präzisierungen)

- **F1 – Berechtigungen.** Die Spec-Berechtigungen werden auf das bestehende Rollensystem abgebildet (`lib/roster/permissions.ts`, getestet):
  - Leitung = Rolle mit `schedule.manage` **und** Leitungs-Mitgliedschaft im Wohnbereich; `administration.manage` gilt für alle Wohnbereiche.
  - Alle Mitarbeitenden mit Mitgliedschaft im Wohnbereich: eigene Dienste und Teamplan sehen, Wunschfrei, Dienstwünsche, Tausch, eigene Zeiterfassung.
  - Organisationsweites Regelwerk und organisationsweite Diensttypen: `administration.manage`. Regelwerk-Überschreibung, eigene Diensttypen, Mindestbesetzung und Feiertage eines Wohnbereichs: dessen Leitung.
  - Übergang: Wer bisher `schedule.manage` hatte, wird Leitung aller Wohnbereiche der Organisation (Migration), damit niemand Zugriff verliert. Die Leitung kann das unter „Mitarbeitende“ einschränken.
- **F2 – Abwesenheiten.** Urlaub, Krankheit, Fortbildung sind Diensttypen der Kategorie ABSENCE. Der bestehende Abwesenheitsantrag bleibt als Weg zum Beantragen; die Bewilligung erzeugt Abwesenheitsdienste Mo–Fr. Wunschfrei ist davon getrennt (`carecore_time_off_requests`).
- **F3 – Perioden** entstehen beim ersten Öffnen eines Monats durch die Leitung als `DRAFT`.
- **F4 – Sollberechnung** wie 8.10 (Tagessoll = Wochennorm × Pensum / 5; Monatssoll = Tagessoll × Werktage Mo–Fr ohne Feiertage; Abwesenheiten mit `creditsTarget` zählen mit Tagessoll). **Muss von der Leitung bestätigt werden.**
- **F5 – Feiertage** werden gepflegt; in den Einstellungen gibt es „Feiertage Kanton Zürich übernehmen“ (lokal berechnet, keine externe API).
- **F6 – Rate-Limit KI**: 10 Läufe pro Stunde und Person, im Regelwerk einstellbar.
- **F7 – Offener Zeiteintrag.** Der Unique-Index „ein offener Eintrag pro Person“ gilt für `status = 'OPEN'` statt `clock_out IS NULL`: Einträge mit fehlendem Clock-out werden `INCOMPLETE` und blockieren sonst jedes weitere Einstempeln.
- **F8 – Ruhezeit, Tages- und Wochenmaximum, Folgetage** zählen Arbeitsdienste und Bereitschaft (WORK, STANDBY). Rufbereitschaft (ON_CALL) zählt nur mit ihrem Anrechnungsfaktor zur Wochenzeit, nicht zur Ruhezeit.
- **F9 – Nachtdienst** = Dienst mit mindestens 2 Stunden im Nachtfenster des Regelwerks (für „keine Nachtdienste“ und Verteilung).
- **F10 – Dienstwünsche.** „Vermeiden“-Wünsche erzeugen `PREFERENCE_IGNORED` (INFO); „Bevorzugen“-Wünsche sind weiche Ziele für Planung und KI.
- **F11 – Besetzung und Arbeitslast beim Bearbeiten.** `MIN_STAFFING`, `MIN_QUALIFIED`, `MAX_WEEKLY_WORK`, `MAX_CONSECUTIVE_DAYS` melden sich bei einer Änderung nur, wenn diese die Lage verschlechtert. Wer einen unterbesetzten Tag auffüllt, muss nichts bestätigen. Die vollständige Liste zeigen „Analysieren“ und „Veröffentlichen“.
- **F12 – Zusätzliche Regelcodes:** `SWAP_NOT_ALLOWED` (BLOCK, Tausch nicht zulässig) und `UNEVEN_DISTRIBUTION` (INFO, ungleiche Verteilung von Nacht- und Wochenenddiensten, Spec 9.3).
- **F13 – Benachrichtigungstypen** werden als `shift_<typ>` gespeichert (z. B. `shift_swap_requested`), damit sie in die bestehende Einstellungskategorie „Dienstplan“ fallen.
- **F14 – Personen löschen.** Dienste und Zeiteinträge verweisen mit `RESTRICT` auf die Person; wer Dienstplan-Daten hat, kann nur archiviert werden.
- **F15 – Mein Dienst › Heute.** „Dienst starten/beenden“ stempelt in `carecore_time_entries` (Checkliste, Übergabestatus und Notizen werden am Zeiteintrag gespeichert). Ohne geplanten Dienst entsteht ein ungeplanter Einsatz im gewählten eigenen Wohnbereich; die Leitung wird benachrichtigt. Das Zeitfenster eines ungeplanten Einsatzes für die Tagesansicht ist das des Diensttyps, dessen Beginn am nächsten am Einstempeln liegt.
- **F16 – Saldo.** Über-/Minusstunden = Ist − Soll bis einschliesslich heute (im laufenden Monat), in abgeschlossenen Monaten gegen das volle Monatssoll. So zeigt der laufende Monat keine scheinbaren Minusstunden für noch nicht erreichte Tage.
- **F17 – Dienst-Erinnerungen.** Veröffentlichte Dienste der nächsten 24 Stunden erzeugen einmal pro Dienst die Erinnerung „Dienst morgen“ (bisherige Funktion, jetzt aus dem Dienstplan).
- **F18 – Entscheidungen mit Folgen.** Genehmigt die Leitung Wunschfrei oder eine Abwesenheit, obwohl dadurch die Besetzung sinkt, zeigt die Oberfläche die Warnungen und verlangt eine Begründung (gleiche Regel wie beim Planen).

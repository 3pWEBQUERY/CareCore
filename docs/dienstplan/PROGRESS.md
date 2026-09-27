# Dienstplan-Modul – Fortschritt

| Phase                                          | Status   | Nachweis                                                                                                          |
| ---------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| 0 – Analyse                                    | erledigt | `ANALYSE.md`, `DECISIONS.md`; offene Fragen 1, 2 und KI-Anbieter bestätigt                                        |
| 1 – Fundament                                  | erledigt | Migration 0023 (frische DB und DB mit Altdaten), DB-Tests `tests/db/constraints.test.ts`, Seed zweimal fehlerfrei |
| 2 – Regel-Engine & Zeit                        | erledigt | `lib/roster/{time,rules,worktime,permissions}.ts`, Tests `tests/roster-*.test.ts`                                 |
| 3 – Dienstplan Leitung                         | offen    |                                                                                                                   |
| 4 – Mein Dienstplan, Wunschfrei, Dienstwünsche | offen    |                                                                                                                   |
| 5 – Diensttausch                               | offen    |                                                                                                                   |
| 6 – Zeiterfassung & Auswertung                 | offen    |                                                                                                                   |
| 7 – KI (Mistral)                               | offen    |                                                                                                                   |
| 8 – Aktualisierung, Feinschliff, Abnahme       | offen    |                                                                                                                   |

## Checks

```bash
npm run format:check && npm run lint && npx tsc --noEmit
npm test                                   # Unit-Tests (ohne Datenbank)
TEST_DATABASE_URL=postgres://… npm run test:db:setup   # Migrationen auf leerer Test-DB
TEST_DATABASE_URL=postgres://… npm run test:db:seed    # Seed (zweimal ausführbar)
TEST_DATABASE_URL=postgres://… npm run test:db         # Integrationstests gegen Postgres
npx next build
```

# To-do-Liste

Offene Punkte aus den Prüfungen im September 2026, nach Priorität geordnet. Erledigtes steht im README und in den
Pull Requests (#35–#41).

## Hoch

- [x] **Weitere Module prüfen:** Schicht & Übergabe, Aufgaben, Dokumentation (Nachträge), Schulungen,
      Team-Neuigkeiten, Kalender, Messenger, Cloud, Mitarbeitende/Administration, KI-Entwürfe.
  - Alle Protokolleinträge laufen jetzt in derselben Transaktion wie die Änderung (`auditStatement`,
    `residentAudit`); `writeAudit` ist nur noch ein interner Helfer.
  - Messenger, Cloud und Kalender sind auf die Organisation beschränkt.
- [x] **Hochgeladene Dateien prüfen:** Dokumente und Nachweise werden am Inhalt geprüft (`lib/file-signatures.ts`).
- [ ] **Entscheidung der Einrichtung:** Soll auch die Rolle „Leitung“ das Medikationsrecht nur mit Qualifikation
      erhalten?
  - Heute hat die Leitung es immer.
  - Umsetzbar ohne Code über Mitarbeitende › Profile & Rollen › „Nur mit Qualifikation“.

## Mittel

- [x] **Offline-Erfassung erweitern:** Übergabenotizen, „Aufgabe erledigt“ und Wundverlauf, jeweils mit
      Anfrage-Kennung und Quittung. Medikamentengaben bleiben bewusst online.
- [x] **Push-Benachrichtigungen (Web Push)** für die installierte App.
  - Braucht `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` und für Erinnerungen bei geschlossener App
    einen Zeitplan mit `CRON_SECRET` (siehe README).
- [x] **Klicktests ausbauen:** Dienstplan (planen, veröffentlichen, tauschen), Wunde anlegen und dokumentieren,
      Pflegeplan mit Ziel und Evaluation, RAI-Erfassung, Handy-Ansicht (390 px).
- [x] **Qualifikationen je Person** in der Mitarbeiterverwaltung anzeigen und pflegen.
- [x] **Aufbewahrung der Anfrage-Quittungen:** Quittungen werden nach 30 Tagen gelöscht.

## Niedrig

- [x] **BtM:** optionale Zweitunterschrift bei der Gabe (Einstellung „Zweitunterschrift bei BtM-Gaben“).
- [x] **Barrierefreiheit:** Tastaturbedienung der Seitenpanels und Auswahllisten; Kontraste der Statusfarben geprüft.
- [x] **Offline-Statusanzeige:** Eintrag vor dem Senden bearbeiten.

## Bekannte Grenzen

- Eigene Rollen (`carecore_roles`) gelten für alle Organisationen der Datenbank, nicht je Organisation.
- Das Löschen von Mitarbeitenden entfernt das Konto endgültig; für ausgeschiedene Personen besser „Sperren & archivieren“.
- Grauer Hilfstext (`--muted`) auf dem hellen Seitenhintergrund erreicht 4,4:1 und liegt knapp unter AA für
  kleine Schrift. Er wurde nicht geändert, weil sich die Optik nicht verändern soll.

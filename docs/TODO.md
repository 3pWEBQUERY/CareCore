# To-do-Liste

Offene Punkte aus den Prüfungen im September 2026, nach Priorität geordnet. Erledigtes steht im README und in den
Pull Requests (#35–#40).

## Hoch

- [ ] **Weitere Module prüfen wie Wunden, Vitalwerte, Planung, RAI, Qualität und Dokumente:**
  - Schicht & Übergabe, Aufgaben, Dokumentation (Nachträge), Schulungen, Team-Neuigkeiten, Kalender, Messenger,
    Cloud, Mitarbeitende/Administration, KI-Entwürfe.
  - In diesen Modulen laufen noch rund 30 Protokolleinträge (`writeAudit`) getrennt von der Änderung. Sie sollen
    wie in den geprüften Modulen in derselben Transaktion geschrieben werden (`residentAudit`, `auditStatement`),
    Bewohnerbezug mit `residentId`.
- [ ] **Hochgeladene Dateien prüfen:**
  - Dokumente und Nachweise (`lib/files.ts`) verlassen sich auf den vom Browser gemeldeten Dateityp.
  - Wie bei den Wundfotos sollen die ersten Bytes geprüft werden (PDF, JPEG, PNG, WebP).
- [ ] **Entscheidung der Einrichtung:** Soll auch die Rolle „Leitung“ das Medikationsrecht nur mit Qualifikation
      erhalten?
  - Heute hat die Leitung es immer.
  - Umsetzbar ohne Code über Mitarbeitende › Profile & Rollen › „Nur mit Qualifikation“.

## Mittel

- [ ] **Offline-Erfassung erweitern**, jeweils mit Anfrage-Kennung und Quittung auf dem Server:
  - Übergabenotizen
  - „Aufgabe erledigt“
  - Wundverlauf
  - Medikamentengaben bleiben bewusst online.
- [ ] **Push-Benachrichtigungen (Web Push)** für die installierte App, z. B. fällige BtM-Kontrollen, fällige
      Aufgaben und kritische Qualitätsereignisse.
  - Dafür werden VAPID-Schlüssel als Umgebungsvariablen benötigt.
- [ ] **Klicktests ausbauen:**
  - Dienstplan: planen, veröffentlichen, tauschen
  - Wunde anlegen und dokumentieren
  - Pflegeplan mit Ziel und Evaluation
  - RAI-Erfassung
  - Handy-Ansicht (390 px)
- [ ] **Qualifikationen je Person** auch in der Mitarbeiterverwaltung anzeigen und pflegen.
  - Heute nur unter Dienstplan › Einstellungen › Personal.
- [ ] **Aufbewahrung der Anfrage-Quittungen** (`carecore_request_receipts`): alte Quittungen regelmässig löschen.
  - Die Frist legt die Einrichtung fest.
  - Offline-Einträge werden ohnehin nur wenige Tage rückwirkend angenommen.

## Niedrig

- [ ] **BtM:** optionale Zweitunterschrift auch bei der Gabe in der Medikamentenrunde, falls die Einrichtung das
      verlangt (als Einstellung, nicht als feste Regel).
- [ ] **Barrierefreiheit:**
  - Tastaturbedienung der Seitenpanels und Auswahllisten systematisch prüfen
  - Kontraste der Statusfarben prüfen
- [ ] **Offline-Statusanzeige:** Eintrag vor dem Senden bearbeiten können (heute nur verwerfen, wenn abgelehnt).

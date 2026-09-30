# Portal für Angehörige und Ärztinnen/Ärzte

Das Portal (`/portal`) zeigt Angehörigen und Ärztinnen/Ärzten nur das, was die Einrichtung ausdrücklich freigibt. Es
ist nur lesend.

## Zugänge

- Die Administration legt Zugänge an: **Leitung › Administration › Portal**.
  - Art: Angehörige oder Ärztin / Arzt.
  - Name, Benutzername, E-Mail und Telefon.
- Portal-Zugänge sind keine Konten der Mitarbeitenden. Eine Portal-Sitzung (Cookie `carecore_portal`, 12 Stunden)
  öffnet keine Schnittstelle der Pflege-App und umgekehrt.
- Beim Anlegen erscheint ein **Einmal-Passwort**, und zwar nur einmal. Bei der ersten Anmeldung muss es durch ein
  eigenes Passwort ersetzt werden (mindestens 12 Zeichen, Buchstaben und Ziffern). Vorher liefert das Portal keine
  Daten.
- Die Anmeldung wird gedrosselt wie bei den Mitarbeitenden.
- Ein neues Einmal-Passwort oder das Sperren beendet laufende Sitzungen sofort.

## Freigaben

Jede Freigabe legt fest:

- **für wen:** eine Person oder einen Wohnbereich. Ein Wohnbereich gilt für alle, die dort aktuell wohnen, zum
  Beispiel für eine Heimärztin.
- **welche Bereiche:**
  - Notfalldaten (Reanimationsstatus, Allergien)
  - Medikation (laufende Verordnungen)
  - Vitalwerte (30 Tage)
  - Pflegeberichte (14 Tage)
  - Termine (kommende)
  - Wunden (offene)

  Grunddaten (Name, Geburtsdatum, Wohnbereich, Zimmer) gehören zu jeder Freigabe.

- **Zeitraum:** optional ab und bis.
- **Grundlage:** Einwilligung der Person, vertretungsberechtigte Person oder Behandlungsverhältnis, mit einem Vermerk
  (z. B. „schriftliche Einwilligung vom …“). Welche Grundlage im Einzelfall nötig ist, entscheidet die Einrichtung.

Freigaben lassen sich ändern und widerrufen; ein Widerruf wirkt sofort. Anlegen, Ändern und Widerrufen wird
protokolliert. Hat ein Zugang mehrere Freigaben für dieselbe Person, gelten die Bereiche zusammen.

## Protokoll

Jeder Abruf von Daten einer Person wird mit Zeitpunkt, Person und freigegebenen Bereichen festgehalten, ebenso ein
Passwortwechsel. Die Administration sieht die letzten 100 Zugriffe beim Zugang.

## Technik

- Tabellen: `carecore_portal_accounts`, `carecore_portal_sessions`, `carecore_portal_grants` und
  `carecore_portal_access_log` (Migration 0052).
- Code: `lib/portal.ts` (Portal-Seite) und `lib/portal-admin.ts` (Verwaltung).
- Der Service Worker speichert keine Portal-Daten auf dem Gerät.

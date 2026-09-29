# Öffentliche Schnittstelle (HL7 FHIR R4)

CareCore stellt Daten der Einrichtung über eine FHIR-R4-Schnittstelle bereit, damit angebundene Systeme sie lesen können
(z. B. eine Arztpraxis, ein Spital oder eine Auswertung). Die Schnittstelle kann nur lesen.

## Zugang

- Schlüssel erstellt und widerruft die Administration unter **Leitung › Konfiguration › FHIR-Schlüssel**.
- Ein Schlüssel wird nur einmal angezeigt, direkt nach dem Erstellen. Gespeichert wird nur sein SHA-256-Hash.
- Jede Anfrage schickt den Schlüssel mit: `Authorization: Bearer cck_…`.
- Berechtigungen je Schlüssel, benannt wie SMART-on-FHIR-Scopes:
  - `system/Patient.read`: Personen (Name, Geburtsdatum, Geschlecht, Status, Nummer der Einrichtung).
  - `system/Observation.read`: Vitalwerte.
- Protokolliert werden:
  - Erstellen und Widerrufen eines Schlüssels.
  - Jeder Zugriff, mit Schlüssel, Abfrage und Anzahl der Treffer. Er erscheint im Änderungsprotokoll der Einrichtung.
- Freitexte (Bemerkungen, Notizen), Fotos und Biografie werden nicht ausgegeben.

## Endpunkte

Basis: `https://<host>/api/fhir/r4`, Antworten als `application/fhir+json`, Fehler als `OperationOutcome`.

| Anfrage                 | Beschreibung                                                                |
| ----------------------- | --------------------------------------------------------------------------- |
| `GET /metadata`         | CapabilityStatement (ohne Schlüssel, enthält keine Daten)                   |
| `GET /Patient`          | Suche: `_id`, `identifier`, `active`, `_count`, `_offset`                   |
| `GET /Patient/{id}`     | eine Person                                                                 |
| `GET /Observation`      | Suche: `patient`/`subject`, `code`, `category`, `date`, `_count`, `_offset` |
| `GET /Observation/{id}` | eine Messung                                                                |

### Regeln für die Suche

- **Unbekannte Suchparameter:** Die Antwort ist `400` mit `not-supported`, damit kein Ergebnis unbemerkt zu weit ausfällt.
- **Blättern:**
  - `_count` liegt zwischen 0 und 200, Standard 50.
  - Das Bundle enthält die Links `next` und `previous`.
- **`date`:**
  - Erlaubt sind `ge`, `gt`, `le` und `lt`, auch mehrfach, z. B. `date=ge2026-03-01&date=le2026-03-31`.
  - Ein Datum ohne Uhrzeit umfasst den ganzen Tag (UTC).
- **`identifier`:** die Nummer der Einrichtung (`urn:carecore:resident-number|B-17`).

## Codes

| Messwert            | LOINC                                | Einheit (UCUM) | Kategorie   |
| ------------------- | ------------------------------------ | -------------- | ----------- |
| Blutdruck           | 85354-9; Komponenten 8480-6 / 8462-4 | mm[Hg]         | vital-signs |
| Puls                | 8867-4                               | /min           | vital-signs |
| Temperatur          | 8310-5                               | Cel            | vital-signs |
| Sauerstoffsättigung | 2708-6, 59408-5                      | %              | vital-signs |
| Blutzucker          | 14743-9                              | mmol/L         | laboratory  |
| Gewicht             | 29463-7                              | kg             | vital-signs |

Die Einstufung einer Messung übernimmt CareCore aus den Grenzwerten der Einrichtung und gibt sie als `interpretation`
(HL7 v3) aus:

- `N`: im Zielbereich
- `A`: beobachten
- `AA`: kritisch

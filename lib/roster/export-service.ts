import "server-only";
import type { RosterContext } from "./context";
import { unitName } from "./context";
import { decimalHours, fileSlug, toCsv, type CsvValue } from "./csv";
import { invalid } from "./errors";
import { formatDate, localTime, monthKey } from "./time";
import { timesheet } from "./time-service";
import { ABSENCE_LABELS, TIME_ENTRY_STATUS_LABELS, type AbsenceKind } from "./types";

// Arbeitszeit-Export (Spec 8.10) für die Lohnbuchhaltung: Summen je Person oder alle Zeiteinträge.
// Berechtigungen und Filter wie in der Arbeitszeitübersicht (dieselbe Auswertung).
export async function timesheetCsv(ctx: RosterContext, params: URLSearchParams) {
  const kind = params.get("art") ?? "summen";
  if (kind !== "summen" && kind !== "eintraege") throw invalid("Unbekannte Exportart.");
  const sheet = await timesheet(ctx, params);
  const unit = sheet.unitId ? await unitName(ctx, sheet.unitId) : "Eigene Zeiten";
  const month = monthKey(sheet.year, sheet.month);
  const tz = sheet.timezone;
  let rows: CsvValue[][];
  if (kind === "summen") {
    const absenceKinds = Object.keys(ABSENCE_LABELS) as AbsenceKind[];
    rows = [
      [
        "Monat",
        "Wohnbereich",
        "Person",
        "Pensum %",
        "Soll (h)",
        "Geplant (h)",
        "Ist (h)",
        "Saldo (h)",
        "Nacht (h)",
        "Wochenende (h)",
        "Feiertag (h)",
        ...absenceKinds.map((k) => `${ABSENCE_LABELS[k]} (Tage)`),
        "Nicht erfasst",
        "Unvollständig",
      ],
      ...sheet.rows.map((row) => [
        month,
        unit,
        row.name,
        row.pensumPercent,
        decimalHours(row.targetMinutes),
        decimalHours(row.plannedMinutes),
        decimalHours(row.actualMinutes),
        decimalHours(row.balanceMinutes),
        decimalHours(row.nightMinutes),
        decimalHours(row.weekendMinutes),
        decimalHours(row.holidayMinutes),
        ...absenceKinds.map((k) => row.absenceDays[k] ?? 0),
        row.notRecorded,
        row.incomplete,
      ]),
    ];
  } else {
    rows = [
      [
        "Datum",
        "Wohnbereich",
        "Person",
        "Dienst",
        "Geplant",
        "Beginn",
        "Ende",
        "Pause (Min)",
        "Netto (h)",
        "Differenz (Min)",
        "Status",
        "Korrektur offen",
      ],
      ...[...sheet.entries]
        .sort((a, b) => a.clockIn.localeCompare(b.clockIn))
        .map((entry) => [
          formatDate(entry.date, true),
          unit,
          entry.employee,
          entry.shift ?? "ungeplant",
          entry.planned ?? "",
          localTime(entry.clockIn, tz),
          entry.clockOut ? localTime(entry.clockOut, tz) : "",
          entry.breakMinutes,
          decimalHours(entry.actualMinutes),
          entry.differenceMinutes,
          TIME_ENTRY_STATUS_LABELS[entry.status],
          entry.correction ? "ja" : "nein",
        ]),
    ];
  }
  return {
    filename: `arbeitszeit-${kind}-${fileSlug(unit)}-${month}.csv`,
    body: toCsv(rows),
  };
}

import { NextResponse } from "next/server";
import { toCsv } from "@/lib/roster/csv";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { raiWorkplace } from "@/lib/rai";
import { RAI_STATE } from "@/lib/rai-shared";

export const runtime = "nodejs";

// RAI report as CSV (semicolon separated, opens directly in Excel).
export async function GET() {
  try {
    const ctx = await apiContext("rai.manage");
    if (ctx instanceof NextResponse) return ctx;
    const { residents } = await raiWorkplace(ctx);
    const lines = [
      [
        "Bewohner",
        "Zimmer",
        "Wohnbereich",
        "Status",
        "Grund",
        "Fällig am",
        "Fortschritt %",
        "Instrument",
        "Verantwortlich",
        "Letzter Abschluss",
        "Ø Einschätzung",
      ],
      ...residents.map((row) => [
        row.name,
        row.room,
        row.unit,
        RAI_STATE[row.state].label,
        row.reason,
        row.dueOn,
        row.progress,
        row.instrument,
        row.assessor,
        row.lastCompletedOn,
        row.averageScore === null ? null : Math.round(row.averageScore * 10) / 10,
      ]),
    ];
    const csv = toCsv(lines);
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="rai-bericht-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "RAI-Bericht konnte nicht erstellt werden.");
  }
}

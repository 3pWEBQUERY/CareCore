import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { raiWorkplace } from "@/lib/rai";
import { RAI_STATE } from "@/lib/rai-shared";

export const runtime = "nodejs";

const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

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
        row.averageScore === null ? "" : row.averageScore.toFixed(1).replace(".", ","),
      ]),
    ];
    const csv = "﻿" + lines.map((line) => line.map(cell).join(";")).join("\r\n");
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

import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { saveOrganizationCountry } from "@/lib/organization-country";

export const runtime = "nodejs";

// Land der Einrichtung festlegen (Administration).
export async function PUT(request: Request) {
  try {
    const ctx = await apiContext("administration.manage");
    if (ctx instanceof NextResponse) return ctx;
    const body = (await request.json()) as { country?: unknown };
    return NextResponse.json(await saveOrganizationCountry(ctx, body.country));
  } catch (error) {
    return apiErrorResponse(error, "Das Land konnte nicht gespeichert werden.");
  }
}

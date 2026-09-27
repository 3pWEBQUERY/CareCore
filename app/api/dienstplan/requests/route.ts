import { rosterContext } from "@/lib/roster/context";
import { respond } from "@/lib/roster/errors";
import { managedUnitIds } from "@/lib/roster/permissions";
import { unitRequests } from "@/lib/roster/request-service";
import { optionalUuid } from "@/lib/roster/schemas";
import { listSwaps } from "@/lib/roster/swap-service";
import { openCorrections } from "@/lib/roster/time-service";

export const runtime = "nodejs";

// Anträge der geleiteten Wohnbereiche: Wunschfrei, Abwesenheiten, Tausch, Zeitkorrekturen, Dienstwünsche.
export async function GET(request: Request) {
  return respond(async () => {
    const ctx = await rosterContext();
    const unitId = optionalUuid(new URL(request.url).searchParams.get("einheit"), "Wohnbereich");
    const units = unitId ? [unitId] : managedUnitIds(ctx.access);
    const [requests, swaps, corrections] = await Promise.all([
      unitRequests(ctx, unitId),
      Promise.all(units.map((id) => listSwaps(ctx, { unitId: id }))).then((lists) => lists.flat()),
      openCorrections(ctx, units),
    ]);
    return { ...requests, swaps, corrections };
  }, "Die Anträge konnten nicht geladen werden.");
}

import { rosterContext } from "@/lib/roster/context";
import { respond } from "@/lib/roster/errors";
import { myRequests } from "@/lib/roster/request-service";
import { listSwaps } from "@/lib/roster/swap-service";
import { myCorrections } from "@/lib/roster/time-service";

export const runtime = "nodejs";

export async function GET() {
  return respond(async () => {
    const ctx = await rosterContext();
    const [requests, swaps, corrections] = await Promise.all([
      myRequests(ctx),
      listSwaps(ctx, { own: true }),
      myCorrections(ctx),
    ]);
    return { ...requests, swaps, corrections, userId: ctx.actor.id };
  }, "Deine Anträge konnten nicht geladen werden.");
}

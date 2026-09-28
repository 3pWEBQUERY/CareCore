import type { ApiContext } from "./api-context";

// Kennung einer wiederholbaren Anfrage (Offline-Warteschlange), mitgeschickt im Header.
export const REQUEST_ID_HEADER = "x-carecore-request-id";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requestIdFrom(request: Request) {
  const value = request.headers.get(REQUEST_ID_HEADER);
  return value && UUID.test(value) ? value.toLowerCase() : null;
}

// Quittung für `ctx.sql.transaction([...])`: Wurde die Anfrage bereits verarbeitet, scheitert die ganze
// Transaktion am Primärschlüssel und es entsteht kein zweiter Eintrag (siehe isRepeatedRequest).
export function receiptStatements(ctx: ApiContext, requestId: string | null) {
  return requestId
    ? [ctx.sql`INSERT INTO carecore_request_receipts (id, user_id) VALUES (${requestId}, ${ctx.actor.id})`]
    : [];
}

export const isRepeatedRequest = (error: unknown) => String(error).includes("carecore_request_receipts_pkey");

// Führt eine Transaktion mit Quittung aus; eine bereits verarbeitete Anfrage gilt als erfolgreich.
export async function withReceipt(run: () => Promise<unknown>) {
  try {
    await run();
    return { repeated: false };
  } catch (error) {
    if (isRepeatedRequest(error)) return { repeated: true };
    throw error;
  }
}

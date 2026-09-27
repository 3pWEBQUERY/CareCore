import { randomUUID } from "node:crypto";
import type { ApiContext } from "@/lib/api-context";

// Benachrichtigung an eine andere Person (sich selbst benachrichtigt niemand).
export async function notify(
  ctx: ApiContext,
  userId: string,
  title: string,
  body: string,
  type: string,
  link: string,
  priority = "normal",
) {
  if (userId === ctx.actor.id) return;
  await ctx.sql`
    INSERT INTO carecore_notifications (id, user_id, title, body, type, priority, link_url)
    VALUES (${randomUUID()}, ${userId}, ${title}, ${body}, ${type}, ${priority}, ${link})`;
}

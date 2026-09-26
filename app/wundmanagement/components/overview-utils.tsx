"use client";

import { formatDate, formatDateTime } from "@/app/components/workspace-ui";
import { STATUS_LABELS, type Wound } from "@/lib/wounds-shared";

export const FILTERS = ["Alle", "Überfällig", "In Behandlung", "Heilend", "Abgeschlossen"] as const;

export type Dialog =
  | { kind: "wound"; wound: Wound | null; residentId?: string; observationId?: string }
  | { kind: "entry"; wound: Wound }
  | { kind: "close"; wound: Wound }
  | null;

export function statusText(wound: Wound) {
  if (wound.status === "closed") return STATUS_LABELS.closed;
  if (wound.overdue) return "Überfällig";
  if (wound.latest?.infectionSigns) return "Infektionszeichen";
  return STATUS_LABELS[wound.status];
}

export function nextCareLabel(wound: Wound) {
  if (wound.status === "closed") return `Abgeschlossen ${formatDate(wound.closedAt)}`;
  if (!wound.nextCareAt) return "Kein Intervall festgelegt";
  return `${wound.overdue ? "Überfällig seit" : "Fällig"} ${formatDateTime(wound.nextCareAt)}`;
}

"use client";

import { timeInZurich } from "@/app/components/workspace-ui";
import { type Absence, type ScheduleAssignment, type ScheduleShift } from "@/lib/schedule-shared";

export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export const DAY = 86_400_000;

export const CUSTOM = "Individuell";

export const OPEN = "Offen – noch niemand eingeteilt";

export const ALL_UNITS = "Alle Wohnbereiche";

export const NO_SUBSTITUTE = "Keine Stellvertretung";

export const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);

export const weekdayIndex = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;

export const mondayOf = (day: string) => addDays(day, -weekdayIndex(day));

export const monthStart = (day: string) => `${day.slice(0, 7)}-01`;

export const monthEnd = (day: string) => {
  const date = new Date(`${monthStart(day)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
};

export const shiftMonth = (day: string, delta: number) => {
  const date = new Date(`${monthStart(day)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 10);
};

export const monthLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("de-CH", { month: "long", year: "numeric", timeZone: "UTC" });

export const isoWeek = (day: string) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 3 - weekdayIndex(day));
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round((date.getTime() - firstThursday.getTime()) / DAY / 7 - (3 - ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  );
};

export const shortDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;

export const longDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

export const clock = (value: string) => timeInZurich(new Date(value));

export const times = (shift: ScheduleShift) => `${clock(shift.startsAt)}–${clock(shift.endsAt)}`;

export const hours = (shift: ScheduleShift) => (Date.parse(shift.endsAt) - Date.parse(shift.startsAt)) / 3_600_000;

export function shortShiftLabel(name: string) {
  if (name.startsWith("Früh")) return "Früh";
  if (name.startsWith("Spät")) return "Spät";
  if (name.startsWith("Nacht")) return "Nacht";
  if (name.startsWith("Tag")) return "Tag";
  return "Dienst";
}

export const absenceCovers = (absence: Absence, day: string) => absence.startsOn <= day && absence.endsOn >= day;

export const formatHours = (value: number) =>
  `${value.toLocaleString("de-CH", { maximumFractionDigits: 1 })} h`.replace(".", ",");

export type Dialog =
  | { kind: "absence" }
  | { kind: "duty"; day: string }
  | { kind: "assign"; shift: ScheduleShift }
  | { kind: "remove"; shift: ScheduleShift; assignment: ScheduleAssignment }
  | { kind: "cancelShift"; shift: ScheduleShift }
  | { kind: "reject" | "revoke"; absence: Absence };

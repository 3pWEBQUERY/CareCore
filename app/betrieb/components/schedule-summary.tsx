"use client";

import { openSlots } from "@/lib/schedule-shared";
import { Summary } from "./operations-ui";
import { hours, formatHours } from "./schedule-utils";
import type { ScheduleViewState } from "./use-schedule-view";

export function ScheduleSummary({ r }: { r: ScheduleViewState }) {
  const { team, mode, data, inPeriod, myAssignment, myWorking, required, filled } = r;
  return (
    <Summary
      items={
        team
          ? [
              {
                icon: "calendar",
                value: String(inPeriod.length),
                label: mode === "week" ? "Dienste diese Woche" : "Dienste im Monat",
              },
              {
                icon: "residents",
                value: required ? `${Math.round((filled / required) * 100)} %` : "–",
                label: "Besetzung",
                tone: "info",
              },
              {
                icon: "alert",
                value: String(inPeriod.reduce((sum, shift) => sum + openSlots(shift), 0)),
                label: "offene Dienste",
                tone: "attention",
              },
              {
                icon: "check",
                value: String(
                  inPeriod.flatMap((shift) => shift.assignments).filter((a) => a.status === "confirmed").length,
                ),
                label: "Bestätigt",
              },
            ]
          : [
              {
                icon: "calendar",
                value: String(myWorking.length),
                label: mode === "week" ? "Dienste diese Woche" : "Dienste im Monat",
              },
              {
                icon: "residents",
                value: formatHours(myWorking.reduce((sum, shift) => sum + hours(shift), 0)),
                label: "Arbeitszeit geplant",
                tone: "info",
              },
              {
                icon: "alert",
                value: String(
                  myWorking.filter((shift) => myAssignment(shift)?.status === "scheduled").length +
                    (data?.requests.filter((a) => a.status === "requested").length ?? 0),
                ),
                label: "zu bestätigen / beantragt",
                tone: "attention",
              },
              {
                icon: "check",
                value: String(data?.vacationDaysThisYear ?? "–"),
                label: "Ferientage bewilligt (Jahr)",
              },
            ]
      }
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import { requestJson, useApiData, type ShowToast } from "@/app/components/workspace-ui";
import { activeAssignments, type SchedulePayload, type ScheduleShift } from "@/lib/schedule-shared";
import { OPERATIONS_CHANGED, notifyOperationsChanged } from "./operations-ui";
import { DAY, addDays, mondayOf, monthStart, monthEnd, shiftMonth, absenceCovers, Dialog } from "./schedule-utils";

export function useScheduleView({
  team,
  showToast,
  dialog,
  setDialog,
  onCanManage,
}: {
  team: boolean;
  showToast: ShowToast;
  dialog: Dialog | null;
  setDialog: (dialog: Dialog | null) => void;
  onCanManage: (canManage: boolean) => void;
}) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [unitId, setUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  // The organization's "today" comes from the first response; until then the browser date is used.
  const [browserToday] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date()),
  );
  const base = anchor ?? browserToday;
  const from = mode === "week" ? mondayOf(base) : mondayOf(monthStart(base));
  const to = mode === "week" ? addDays(from, 6) : addDays(mondayOf(monthEnd(base)), 6);
  const schedule = useApiData<SchedulePayload>(
    `/api/schedule?scope=${team ? "team" : "mine"}&from=${from}&to=${to}${unitId ? `&careUnitId=${unitId}` : ""}`,
  );
  const { reload } = schedule;
  useEffect(() => {
    window.addEventListener(OPERATIONS_CHANGED, reload);
    return () => window.removeEventListener(OPERATIONS_CHANGED, reload);
  }, [reload]);
  const data = schedule.data;
  const canManage = Boolean(data?.canManage);
  useEffect(() => onCanManage(canManage), [canManage, onCanManage]);
  const [now] = useState(() => Date.now());
  const today = data?.today ?? browserToday;
  const day = selected ?? (today >= from && today <= to ? today : mode === "week" ? from : monthStart(base));

  const visibleDays = Array.from({ length: Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1 }, (_, i) =>
    addDays(from, i),
  );
  const periodDays = mode === "week" ? visibleDays : visibleDays.filter((d) => d.slice(0, 7) === base.slice(0, 7));
  const shifts = data?.shifts ?? [];
  const inPeriod = shifts.filter((shift) => periodDays.includes(shift.day));
  const me = data?.currentUserId ?? "";
  const myAssignment = (shift: ScheduleShift) => shift.assignments.find((a) => a.userId === me);
  const myWorking = inPeriod.filter((shift) => {
    const assignment = myAssignment(shift);
    return assignment && assignment.status !== "absent";
  });
  const shiftsOn = (d: string) => shifts.filter((shift) => shift.day === d);
  const absencesOn = (d: string) => (data?.absences ?? []).filter((absence) => absenceCovers(absence, d));

  const run = async (url: string, body: unknown, message: string) => {
    setBusy(true);
    try {
      const result = await requestJson<{ affected?: number; covered?: number }>(url, { method: "POST", body });
      notifyOperationsChanged();
      showToast(
        result?.affected
          ? `${message} · ${result.affected} ${result.affected === 1 ? "Dienst" : "Dienste"} betroffen${result.covered ? `, ${result.covered} vertreten` : ""}`
          : message,
      );
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const move = (delta: number) => {
    setSelected(null);
    setAnchor(mode === "week" ? addDays(from, delta * 7) : shiftMonth(base, delta));
  };

  const required = inPeriod.reduce((sum, shift) => sum + shift.requiredStaff, 0);
  const filled = inPeriod.reduce(
    (sum, shift) => sum + Math.min(activeAssignments(shift).length, shift.requiredStaff),
    0,
  );
  return {
    team,
    showToast,
    dialog,
    setDialog,
    onCanManage,
    mode,
    setMode,
    anchor,
    setAnchor,
    selected,
    setSelected,
    unitId,
    setUnitId,
    busy,
    setBusy,
    browserToday,
    base,
    from,
    to,
    schedule,
    reload,
    data,
    canManage,
    now,
    today,
    day,
    visibleDays,
    periodDays,
    shifts,
    inPeriod,
    me,
    myAssignment,
    myWorking,
    shiftsOn,
    absencesOn,
    run,
    move,
    required,
    filled,
  };
}

export type ScheduleViewState = ReturnType<typeof useScheduleView>;

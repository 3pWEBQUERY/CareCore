"use client";

import { LoadError, type ShowToast } from "@/app/components/workspace-ui";
import { Dialog } from "./schedule-utils";
import { AbsenceEditor } from "./schedule-absence-editor";
import { DutyAssignmentEditor, AssignDialog } from "./schedule-duty-dialogs";
import { AbsenceList } from "./schedule-absence-list";
import { useScheduleView } from "./use-schedule-view";
import { ScheduleSummary } from "./schedule-summary";
import { ScheduleCalendarHeader, ScheduleWeek, ScheduleMonth } from "./schedule-calendar";
import { ScheduleDayDetail } from "./schedule-day-detail";
import { RemoveAssignmentDialog, CancelShiftDialog, AbsenceDecisionDialog } from "./schedule-confirm-dialogs";

export function ScheduleView(props: {
  team: boolean;
  showToast: ShowToast;
  dialog: Dialog | null;
  setDialog: (dialog: Dialog | null) => void;
  onCanManage: (canManage: boolean) => void;
}) {
  const r = useScheduleView(props);
  const { team, showToast, dialog, setDialog, mode, unitId, schedule, reload, data, day, run } = r;
  return (
    <>
      <ScheduleSummary r={r} />
      {schedule.error && <LoadError message={schedule.error} onRetry={reload} />}
      <section className="card schedule-card">
        <ScheduleCalendarHeader r={r} />
        {mode === "week" ? <ScheduleWeek r={r} /> : <ScheduleMonth r={r} />}
        <ScheduleDayDetail r={r} />
      </section>
      {data && (
        <AbsenceList
          data={data}
          team={team}
          run={(url, body, message) => void run(url, body, message)}
          setDialog={setDialog}
        />
      )}
      {data && dialog?.kind === "absence" && (
        <AbsenceEditor
          data={data}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            showToast(message);
          }}
        />
      )}
      {data && dialog?.kind === "duty" && (
        <DutyAssignmentEditor
          data={data}
          preset={{ day: dialog.day || day, careUnitId: unitId || null }}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            showToast(message);
          }}
        />
      )}
      {data && dialog?.kind === "assign" && (
        <AssignDialog
          shift={dialog.shift}
          data={data}
          onClose={() => setDialog(null)}
          onDone={(message) => {
            setDialog(null);
            showToast(message);
          }}
        />
      )}
      {dialog?.kind === "remove" && <RemoveAssignmentDialog r={r} />}
      {dialog?.kind === "cancelShift" && <CancelShiftDialog r={r} />}
      {(dialog?.kind === "reject" || dialog?.kind === "revoke") && <AbsenceDecisionDialog r={r} />}
    </>
  );
}

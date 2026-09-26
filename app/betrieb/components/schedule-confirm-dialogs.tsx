"use client";

import { EditorDialog, ReasonDialog, requestJson } from "@/app/components/workspace-ui";
import { ABSENCE_KINDS } from "@/lib/schedule-shared";
import { notifyOperationsChanged } from "./operations-ui";
import { shortDay, longDay, times } from "./schedule-utils";
import type { ScheduleViewState } from "./use-schedule-view";

export function RemoveAssignmentDialog({ r }: { r: ScheduleViewState }) {
  const { dialog, setDialog, busy, run } = r;
  if (dialog?.kind !== "remove") return null;
  return (
    <EditorDialog
      id="duty-remove"
      eyebrow="CareCore Schedule · Teamplanung"
      title="Einteilung entfernen"
      description={`${dialog.assignment.name} · ${dialog.shift.name} am ${longDay(dialog.shift.day)} (${times(dialog.shift)}). Der Platz bleibt als offener Dienst bestehen; die Person wird benachrichtigt.`}
      onClose={() => setDialog(null)}
      onSubmit={async () => {
        await run(`/api/schedule/assignments/${dialog.assignment.id}`, { action: "remove" }, "Einteilung entfernt");
        setDialog(null);
      }}
      saving={busy}
      error=""
      submitLabel="Entfernen"
      danger
    >
      {null}
    </EditorDialog>
  );
}

export function CancelShiftDialog({ r }: { r: ScheduleViewState }) {
  const { showToast, dialog, setDialog } = r;
  if (dialog?.kind !== "cancelShift") return null;
  return (
    <ReasonDialog
      eyebrow="CareCore Schedule · Teamplanung"
      title="Dienst streichen"
      description={`${dialog.shift.name} am ${longDay(dialog.shift.day)} wird nicht mehr benötigt.`}
      label="Grund"
      placeholder="z. B. Belegung gesunken, doppelt geplant"
      submitLabel="Dienst streichen"
      danger
      onClose={() => setDialog(null)}
      onConfirm={async (reason) => {
        await requestJson(`/api/schedule/shifts/${dialog.shift.id}`, {
          method: "POST",
          body: { action: "cancel", reason },
        });
        notifyOperationsChanged();
        setDialog(null);
        showToast("Dienst gestrichen");
      }}
    />
  );
}

export function AbsenceDecisionDialog({ r }: { r: ScheduleViewState }) {
  const { showToast, dialog, setDialog } = r;
  if (dialog?.kind !== "reject" && dialog?.kind !== "revoke") return null;
  return (
    <ReasonDialog
      eyebrow="CareCore Schedule · Abwesenheiten"
      title={dialog.kind === "reject" ? "Antrag ablehnen" : "Abwesenheit aufheben"}
      description={`${dialog.absence.name}: ${ABSENCE_KINDS[dialog.absence.kind]} ${shortDay(dialog.absence.startsOn)} – ${shortDay(dialog.absence.endsOn)}.${dialog.kind === "revoke" ? " Künftige Dienste werden der Person wieder zugeteilt." : ""}`}
      label="Begründung"
      placeholder="Die Person sieht diese Begründung."
      submitLabel={dialog.kind === "reject" ? "Ablehnen" : "Aufheben"}
      danger
      onClose={() => setDialog(null)}
      onConfirm={async (note) => {
        const result = await requestJson<{ affected: number }>(`/api/schedule/absences/${dialog.absence.id}`, {
          method: "POST",
          body: { action: dialog.kind, note },
        });
        notifyOperationsChanged();
        setDialog(null);
        showToast(
          dialog.kind === "reject"
            ? "Antrag abgelehnt"
            : `Abwesenheit aufgehoben · ${result.affected} ${result.affected === 1 ? "Dienst" : "Dienste"} wieder zugeteilt`,
        );
      }}
    />
  );
}

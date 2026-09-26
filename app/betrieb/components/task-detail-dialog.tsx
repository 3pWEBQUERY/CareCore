"use client";

import { useState } from "react";
import { EditorDialog, ReasonDialog, formatDateTime, requestJson, type ShowToast } from "@/app/components/workspace-ui";
import { TASK_PRIORITIES, TASK_RECURRENCE, type Task } from "@/lib/tasks-shared";
import { notifyOperationsChanged } from "./operations-ui";
import { statusLabel, statusTone } from "./task-utils";

export function TaskDetailDialog({
  task,
  canWrite,
  onClose,
  onEdit,
  onToggle,
  onChanged,
  showToast,
}: {
  task: Task;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onChanged: (message: string) => void;
  showToast: ShowToast;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const setStatus = async (status: "open" | "in_progress", message: string) => {
    setSaving(true);
    setError("");
    try {
      await requestJson(`/api/tasks/${task.id}/status`, { method: "POST", body: { status } });
      notifyOperationsChanged();
      onChanged(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  };
  const active = task.status === "open" || task.status === "in_progress";
  if (cancelling)
    return (
      <ReasonDialog
        eyebrow="CareCore Tasks"
        title="Aufgabe abbrechen"
        description={`„${task.title}“ wird nicht mehr durchgeführt. Die Aufgabe bleibt mit Begründung nachvollziehbar.`}
        label="Grund"
        placeholder="z. B. ärztlich abgesetzt, Bewohner ausgetreten, doppelt erfasst"
        submitLabel="Aufgabe abbrechen"
        danger
        onClose={() => setCancelling(false)}
        onConfirm={async (reason) => {
          await requestJson(`/api/tasks/${task.id}/status`, { method: "POST", body: { status: "cancelled", reason } });
          notifyOperationsChanged();
          showToast("Aufgabe abgebrochen");
          onChanged("Aufgabe abgebrochen");
        }}
      />
    );
  return (
    <EditorDialog
      id="task-detail"
      eyebrow={`CareCore Tasks · ${task.category}`}
      title={task.title}
      description={task.description || undefined}
      onClose={onClose}
      onSubmit={() => {
        if (!canWrite || task.status === "cancelled") onClose();
        else if (task.status === "completed") void setStatus("open", "Aufgabe wieder geöffnet");
        else onToggle();
      }}
      saving={saving}
      error={error}
      submitLabel={
        !canWrite || task.status === "cancelled"
          ? "Schliessen"
          : task.status === "completed"
            ? "Wieder öffnen"
            : "Als erledigt markieren"
      }
      extraActions={
        canWrite && active ? (
          <>
            {task.canEdit && (
              <button className="quiet-button" type="button" onClick={() => setCancelling(true)} disabled={saving}>
                Aufgabe abbrechen
              </button>
            )}
            {task.canEdit && (
              <button className="quiet-button" type="button" onClick={onEdit} disabled={saving}>
                Bearbeiten
              </button>
            )}
            <button
              className="quiet-button"
              type="button"
              disabled={saving}
              onClick={() =>
                void (task.status === "open"
                  ? setStatus("in_progress", "Aufgabe in Bearbeitung")
                  : setStatus("open", "Aufgabe wieder offen"))
              }
            >
              {task.status === "open" ? "Beginnen" : "Zurück auf offen"}
            </button>
          </>
        ) : null
      }
    >
      <dl className="area-editor-wide task-detail-list">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`status-badge ${statusTone(task)}`}>{statusLabel(task)}</span>
          </dd>
        </div>
        <div>
          <dt>Priorität</dt>
          <dd>{TASK_PRIORITIES[task.priority].label}</dd>
        </div>
        <div>
          <dt>Fällig</dt>
          <dd>{task.dueAt ? formatDateTime(task.dueAt) : "Ohne Termin"}</dd>
        </div>
        <div>
          <dt>Wiederholung</dt>
          <dd>{TASK_RECURRENCE[task.recurrence]}</dd>
        </div>
        <div>
          <dt>Bezug</dt>
          <dd>
            {task.residentName
              ? `${task.residentName}${task.room ? ` · ${task.room}` : ""}`
              : (task.careUnit ?? "Ohne Bewohnerbezug")}
          </dd>
        </div>
        <div>
          <dt>Verantwortlich</dt>
          <dd>{task.assigneeName ?? "Nicht zugewiesen"}</dd>
        </div>
        <div>
          <dt>Erstellt</dt>
          <dd>
            {formatDateTime(task.createdAt)} · {task.creatorName ?? "unbekannt"}
          </dd>
        </div>
        <div>
          <dt>Optionen</dt>
          <dd>
            {[
              task.teamVisible ? "Im Team sichtbar" : "Privat",
              task.remind ? "Erinnerung" : null,
              task.documentOnCompletion ? "Dokumentationspflicht" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </dd>
        </div>
        {task.completedAt && (
          <div className="wide">
            <dt>Erledigt</dt>
            <dd>
              {formatDateTime(task.completedAt)} · {task.completedByName ?? "unbekannt"}
              {task.completionNote ? ` – ${task.completionNote}` : ""}
            </dd>
          </div>
        )}
        {task.cancelReason && (
          <div className="wide">
            <dt>Abgebrochen</dt>
            <dd>{task.cancelReason}</dd>
          </div>
        )}
      </dl>
    </EditorDialog>
  );
}

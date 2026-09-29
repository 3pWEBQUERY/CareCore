"use client";

import { useState } from "react";
import { EditorDialog, requestJson, type ShowToast } from "@/app/components/workspace-ui";
import { notifyOperationsChanged } from "./operations-ui";
import { sendOrQueue } from "@/app/components/offline-queue";

// Completion with a note; the note goes into the care record when the task asks for it.
export function TaskCompleteDialog({
  task,
  onClose,
  onDone,
}: {
  task: { id: string; title: string; residentName: string | null; documentOnCompletion: boolean };
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <EditorDialog
      id="task-complete"
      eyebrow="CareCore Tasks · Abschluss"
      title={task.title}
      description={
        task.documentOnCompletion
          ? `Deine Notiz wird als Pflegedokumentation${task.residentName ? ` bei ${task.residentName}` : ""} gespeichert.`
          : "Optional: kurz festhalten, was erledigt wurde."
      }
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          const result = await sendOrQueue(
            `/api/tasks/${task.id}/status`,
            { status: "completed", note, completedAt: new Date().toISOString() },
            `Aufgabe erledigt · ${task.title}`,
            { field: "note", label: "Notiz" },
          );
          notifyOperationsChanged();
          onDone(
            result.queued
              ? "Aufgabe offline als erledigt vorgemerkt – wird gesendet, sobald die Verbindung zurück ist"
              : task.documentOnCompletion
                ? "Aufgabe erledigt und dokumentiert"
                : "Aufgabe erledigt",
          );
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel="Als erledigt markieren"
    >
      <label className="area-editor-wide">
        <span>{task.documentOnCompletion ? "Dokumentation" : "Notiz (optional)"}</span>
        <textarea
          autoFocus
          rows={5}
          maxLength={10000}
          required={task.documentOnCompletion}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Was wurde durchgeführt? Wirkung, Reaktion, Auffälligkeiten."
        />
      </label>
    </EditorDialog>
  );
}

// Toggles a task between done and open; tasks that need documentation open the completion dialog instead.
export function useTaskToggle(showToast: ShowToast, onChanged: () => void) {
  const [completing, setCompleting] = useState<Parameters<typeof TaskCompleteDialog>[0]["task"] | null>(null);
  const toggle = async (task: {
    id: string;
    title: string;
    done: boolean;
    residentName: string | null;
    documentOnCompletion: boolean;
  }) => {
    if (!task.done && task.documentOnCompletion) {
      setCompleting(task);
      return;
    }
    try {
      // Erledigen geht auch offline (wird nachgereicht); wieder öffnen nur mit Verbindung.
      const result = task.done
        ? (await requestJson(`/api/tasks/${task.id}/status`, { method: "POST", body: { status: "open" } }),
          { queued: false })
        : await sendOrQueue(
            `/api/tasks/${task.id}/status`,
            { status: "completed", completedAt: new Date().toISOString() },
            `Aufgabe erledigt · ${task.title}`,
          );
      notifyOperationsChanged();
      showToast(
        task.done
          ? "Aufgabe wieder geöffnet"
          : result.queued
            ? "Aufgabe offline als erledigt vorgemerkt – wird gesendet, sobald die Verbindung zurück ist"
            : "Aufgabe erledigt",
      );
      onChanged();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    }
  };
  const dialog = completing ? (
    <TaskCompleteDialog
      task={completing}
      onClose={() => setCompleting(null)}
      onDone={(message) => {
        setCompleting(null);
        showToast(message);
        onChanged();
      }}
    />
  ) : null;
  return { toggle, dialog };
}

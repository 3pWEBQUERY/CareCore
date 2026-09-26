"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DashboardNote } from "./dashboard-shared";

export function useDashboardNotes({ setToast }: { setToast: (message: string) => void }) {
  const [notes, setNotes] = useState<DashboardNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [noteEditor, setNoteEditor] = useState<DashboardNote | "new" | null>(null);
  const [viewingNote, setViewingNote] = useState<DashboardNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notePinned, setNotePinned] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteFormError, setNoteFormError] = useState("");
  const [noteConfirmDelete, setNoteConfirmDelete] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/notes", { cache: "no-store" });
      const data = (await response.json()) as { notes?: DashboardNote[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Notizen konnten nicht geladen werden.");
      setNotes(data.notes ?? []);
      setNotesError("");
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Notizen konnten nicht geladen werden.");
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotes();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadNotes]);

  function openNote(note: DashboardNote | "new") {
    setNoteEditor(note);
    setNoteTitle(note === "new" ? "" : note.title);
    setNoteBody(note === "new" ? "" : note.body);
    setNotePinned(note === "new" ? false : note.pinned);
    setNoteFormError("");
    setNoteConfirmDelete(false);
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteEditor) return;
    setNoteSaving(true);
    setNoteFormError("");
    try {
      const response = await fetch("/api/dashboard/notes", {
        method: noteEditor === "new" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: noteEditor === "new" ? undefined : noteEditor.id,
          title: noteTitle,
          body: noteBody,
          pinned: notePinned,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Notiz konnte nicht gespeichert werden.");
      setNoteEditor(null);
      setToast("Notiz gespeichert");
      await loadNotes();
    } catch (error) {
      setNoteFormError(error instanceof Error ? error.message : "Notiz konnte nicht gespeichert werden.");
    } finally {
      setNoteSaving(false);
    }
  }

  async function deleteNote() {
    if (!noteEditor || noteEditor === "new") return;
    setNoteSaving(true);
    setNoteFormError("");
    try {
      const response = await fetch("/api/dashboard/notes", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: noteEditor.id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Notiz konnte nicht gelöscht werden.");
      setNoteEditor(null);
      setToast("Notiz gelöscht");
      await loadNotes();
    } catch (error) {
      setNoteFormError(error instanceof Error ? error.message : "Notiz konnte nicht gelöscht werden.");
    } finally {
      setNoteSaving(false);
    }
  }
  return {
    notes,
    setNotes,
    notesLoading,
    setNotesLoading,
    notesError,
    setNotesError,
    noteEditor,
    setNoteEditor,
    viewingNote,
    setViewingNote,
    noteTitle,
    setNoteTitle,
    noteBody,
    setNoteBody,
    notePinned,
    setNotePinned,
    noteSaving,
    setNoteSaving,
    noteFormError,
    setNoteFormError,
    noteConfirmDelete,
    setNoteConfirmDelete,
    loadNotes,
    openNote,
    saveNote,
    deleteNote,
  };
}

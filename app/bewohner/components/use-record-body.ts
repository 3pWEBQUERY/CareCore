"use client";

import { useEffect, useState, type FormEvent } from "react";
import { type BodyPoint } from "./body-map-3d";
import { BodyObservation, ObservationDraft } from "./resident-record-data";
import type { ResidentRecordData } from "./resident-record-data";

export function useRecordBody({
  resident,
  onAction,
}: {
  resident: ResidentRecordData;
  onAction: (message: string) => void;
}) {
  const [activeBodyObservationId, setActiveBodyObservationId] = useState<string | null>(null);
  const [bodyObservations, setBodyObservations] = useState<BodyObservation[]>([]);
  const [bodyLoading, setBodyLoading] = useState(Boolean(resident.id));
  const [bodyError, setBodyError] = useState("");
  const [placingBodyPoint, setPlacingBodyPoint] = useState(false);
  const [bodyEditor, setBodyEditor] = useState<{ id: string | null; draft: ObservationDraft } | null>(null);
  const [bodySaving, setBodySaving] = useState(false);

  useEffect(() => {
    if (!bodyEditor) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBodyEditor(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [bodyEditor]);

  useEffect(() => {
    if (!resident.id) return;
    let active = true;
    const timer = window.setTimeout(() => {
      fetch(`/api/residents/${resident.id}/body-observations`, { cache: "no-store" })
        .then(async (response) => ({ response, data: await response.json().catch(() => null) }))
        .then(({ response, data }) => {
          if (!active) return;
          if (!response.ok) throw new Error(data?.error || "Körperstatus konnte nicht geladen werden.");
          setBodyObservations(data.observations ?? []);
          setBodyError("");
        })
        .catch((error) => {
          if (active)
            setBodyError(error instanceof Error ? error.message : "Körperstatus konnte nicht geladen werden.");
        })
        .finally(() => {
          if (active) setBodyLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [resident.id]);

  function newBodyObservation(point: BodyPoint) {
    setPlacingBodyPoint(false);
    setBodyError("");
    setBodyEditor({
      id: null,
      draft: { kind: "wound", label: "", location: "", status: "Beobachten", notes: "", ...point },
    });
  }

  function editBodyObservation(observation: BodyObservation) {
    setBodyEditor({
      id: observation.id,
      draft: {
        kind: observation.kind,
        label: observation.label,
        location: observation.location,
        status: observation.status,
        notes: observation.notes,
        x: Number(observation.body_x),
        y: Number(observation.body_y),
        z: Number(observation.body_z),
      },
    });
  }

  async function saveBodyObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resident.id || !bodyEditor) return;
    setBodySaving(true);
    setBodyError("");
    try {
      const url = `/api/residents/${resident.id}/body-observations${bodyEditor.id ? `/${bodyEditor.id}` : ""}`;
      const response = await fetch(url, {
        method: bodyEditor.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bodyEditor.draft),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Befund konnte nicht gespeichert werden.");
      setBodyObservations((current) =>
        bodyEditor.id
          ? current.map((item) => (item.id === bodyEditor.id ? data.observation : item))
          : [data.observation, ...current],
      );
      setActiveBodyObservationId(data.observation.id);
      setBodyEditor(null);
      onAction(bodyEditor.id ? "Körperbefund aktualisiert" : "Körperbefund gespeichert");
    } catch (error) {
      setBodyError(error instanceof Error ? error.message : "Befund konnte nicht gespeichert werden.");
    } finally {
      setBodySaving(false);
    }
  }

  async function archiveBodyObservation(observation: BodyObservation) {
    if (!resident.id || !window.confirm(`${observation.label} an ${observation.location} archivieren?`)) return;
    const response = await fetch(`/api/residents/${resident.id}/body-observations/${observation.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setBodyError("Befund konnte nicht archiviert werden.");
      return;
    }
    setBodyObservations((current) => current.filter((item) => item.id !== observation.id));
    setActiveBodyObservationId(null);
    onAction("Körperbefund archiviert");
  }
  return {
    activeBodyObservationId,
    setActiveBodyObservationId,
    bodyObservations,
    setBodyObservations,
    bodyLoading,
    setBodyLoading,
    bodyError,
    setBodyError,
    placingBodyPoint,
    setPlacingBodyPoint,
    bodyEditor,
    setBodyEditor,
    bodySaving,
    setBodySaving,
    newBodyObservation,
    editBodyObservation,
    saveBodyObservation,
    archiveBodyObservation,
  };
}

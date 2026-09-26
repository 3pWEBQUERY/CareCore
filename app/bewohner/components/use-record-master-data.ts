"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import type { ResidentRecordData } from "./resident-record-data";

export function useRecordMasterData({
  resident,
  setBodyError,
  onGenderChanged,
  onAction,
  onPhotoChanged,
  residentPhotoInputRef,
}: {
  resident: ResidentRecordData;
  setBodyError: (message: string) => void;
  onGenderChanged: ((residentId: string, gender: string) => void) | undefined;
  onAction: (message: string) => void;
  onPhotoChanged: (() => void) | undefined;
  residentPhotoInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [masterDataEditing, setMasterDataEditing] = useState(false);
  const [residentGender, setResidentGender] = useState(resident.gender ?? "unspecified");
  const [genderDraft, setGenderDraft] = useState(resident.gender ?? "unspecified");
  const [masterDataSaving, setMasterDataSaving] = useState(false);
  const [residentPhoto, setResidentPhoto] = useState<string | null>(null);
  const [residentPhotoSaving, setResidentPhotoSaving] = useState(false);
  const [firstName, ...lastNameParts] = resident.name.split(" ");
  const lastName = lastNameParts.join(" ");
  const genderLabel =
    { female: "Weiblich", male: "Männlich", diverse: "Divers", unspecified: "Keine Angabe" }[residentGender] ??
    "Keine Angabe";

  useEffect(() => {
    if (!resident.id) return;
    let active = true;
    fetch(`/api/residents/${resident.id}/photo`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => null) }))
      .then(({ response, data }) => {
        if (active && response.ok) setResidentPhoto(typeof data?.photoDataUrl === "string" ? data.photoDataUrl : null);
      })
      .catch(() => {
        if (active) setResidentPhoto(null);
      });
    return () => {
      active = false;
    };
  }, [resident.id]);

  async function saveGender() {
    if (!resident.id) {
      setBodyError("Diese Akte hat keine gespeicherte Bewohner-ID.");
      return;
    }
    setMasterDataSaving(true);
    try {
      const response = await fetch(`/api/residents/${resident.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gender: genderDraft }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Geschlecht konnte nicht gespeichert werden.");
      setResidentGender(data.gender);
      setMasterDataEditing(false);
      onGenderChanged?.(resident.id, data.gender);
      onAction("Geschlecht in den Stammdaten gespeichert");
    } catch (error) {
      onAction(error instanceof Error ? error.message : "Geschlecht konnte nicht gespeichert werden.");
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function uploadResidentPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!resident.id) {
      onAction("Dieses Bewohnerprofil kann nicht gespeichert werden.");
      return;
    }
    if (
      !file.type.startsWith("image/") ||
      !["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)
    ) {
      onAction("Bitte ein JPEG-, PNG-, WebP- oder HEIC-Bild auswählen.");
      event.currentTarget.value = "";
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      onAction("Das ausgewählte Bild darf höchstens 15 MB gross sein.");
      event.currentTarget.value = "";
      return;
    }
    setResidentPhotoSaving(true);
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 640;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Bild konnte nicht verarbeitet werden.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
      if (!blob) throw new Error("Bild konnte nicht verarbeitet werden.");
      if (blob.size > 1024 * 1024) {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.68));
      }
      if (!blob || blob.size > 1024 * 1024)
        throw new Error("Das Bild konnte nicht auf höchstens 1 MB verkleinert werden.");
      const photoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Bild konnte nicht gelesen werden."));
        reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
        reader.readAsDataURL(blob);
      });
      const response = await fetch(`/api/residents/${resident.id}/photo`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoDataUrl }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Bewohnerbild konnte nicht gespeichert werden.");
      setResidentPhoto(data.photoDataUrl);
      onPhotoChanged?.();
      onAction(`Bewohnerbild für ${resident.name} gespeichert`);
    } catch (error) {
      onAction(error instanceof Error ? error.message : "Bewohnerbild konnte nicht gespeichert werden.");
    } finally {
      setResidentPhotoSaving(false);
      if (residentPhotoInputRef.current) residentPhotoInputRef.current.value = "";
    }
  }
  return {
    masterDataEditing,
    setMasterDataEditing,
    residentGender,
    setResidentGender,
    genderDraft,
    setGenderDraft,
    masterDataSaving,
    setMasterDataSaving,
    residentPhoto,
    setResidentPhoto,
    residentPhotoSaving,
    setResidentPhotoSaving,
    firstName,
    lastNameParts,
    lastName,
    genderLabel,
    saveGender,
    uploadResidentPhoto,
  };
}

"use client";

import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from "react";
import { FileArrowUp, FileImage, FilePdf, X } from "@phosphor-icons/react";
import { RESIDENT_FILE_MAX_BYTES, RESIDENT_FILE_TYPES } from "@/lib/resident-record-shared";
import { fileSizeLabel } from "@/lib/documents-shared";

// Datei für ein Dokument der Bewohnerakte: PDF oder Bild (z. B. ein fotografierter Arztbericht), per Klick
// oder durch Hineinziehen. Nach der Auswahl erscheinen Name, Typ und Grösse, bei Bildern eine kleine Vorschau.
export default function DocumentFileField({
  file,
  onChange,
  onError,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const isImage = !!file && file.type.startsWith("image/");
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const pick = (next: File | null | undefined) => {
    if (!next) return;
    if (!(RESIDENT_FILE_TYPES as readonly string[]).includes(next.type)) {
      onError("Bitte ein PDF oder ein Bild (JPG, PNG, WebP) auswählen.");
      return;
    }
    if (next.size > RESIDENT_FILE_MAX_BYTES) {
      onError("Die Datei ist grösser als 4 MB.");
      return;
    }
    onError("");
    onChange(next);
  };
  const drop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0]);
  };
  const dragProps = {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: drop,
  };

  return (
    <div className="area-editor-wide document-file-field">
      <span className="document-file-label" id={`${inputId}-label`}>
        Dokument
      </span>
      <input
        ref={input}
        id={inputId}
        className="document-file-input"
        type="file"
        accept={RESIDENT_FILE_TYPES.join(",")}
        aria-labelledby={`${inputId}-label`}
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {file ? (
        <div className={`document-file-selected ${dragging ? "dragging" : ""}`} {...dragProps}>
          <span
            className={`document-file-thumb ${isImage ? "image" : "pdf"}`}
            style={preview ? { backgroundImage: `url(${preview})` } : undefined}
            aria-hidden="true"
          >
            {!preview && (isImage ? <FileImage /> : <FilePdf />)}
          </span>
          <span className="document-file-meta">
            <strong title={file.name}>{file.name}</strong>
            <small>
              {isImage ? "Bild" : "PDF"} · {fileSizeLabel(file.size)}
            </small>
          </span>
          <button type="button" className="document-file-change" onClick={() => input.current?.click()}>
            Andere Datei
          </button>
          <button
            type="button"
            className="document-file-remove"
            aria-label="Datei entfernen"
            onClick={() => onChange(null)}
          >
            <X />
          </button>
        </div>
      ) : (
        <label htmlFor={inputId} className={`document-file-drop ${dragging ? "dragging" : ""}`} {...dragProps}>
          <span className="document-file-drop-icon">
            <FileArrowUp />
          </span>
          <strong>PDF oder Bild auswählen</strong>
          <small>oder hierher ziehen · PDF, JPG, PNG, WebP · höchstens 4 MB</small>
        </label>
      )}
    </div>
  );
}

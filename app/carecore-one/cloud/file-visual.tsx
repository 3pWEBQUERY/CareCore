"use client";

import Image from "next/image";
import { File, FileImage, FilePdf, FileText } from "@phosphor-icons/react";

export type CloudFile = {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export const prettySize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const prettyDate = (value: string) =>
  new Intl.DateTimeFormat("de-CH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export const canPreview = (file: CloudFile) =>
  (file.mime_type.startsWith("image/") && file.mime_type !== "image/svg+xml") ||
  file.mime_type.startsWith("video/") ||
  file.mime_type.startsWith("audio/") ||
  file.mime_type === "application/pdf";

export function FileGlyph({ file }: { file: CloudFile }) {
  const Icon = file.mime_type.startsWith("image/")
    ? FileImage
    : file.mime_type === "application/pdf"
      ? FilePdf
      : file.mime_type.startsWith("text/")
        ? FileText
        : File;
  return (
    <span className="cloud-file-icon">
      <Icon aria-hidden="true" weight="regular" />
    </span>
  );
}

export function FileVisual({ file }: { file: CloudFile }) {
  if (file.mime_type.startsWith("image/") && file.mime_type !== "image/svg+xml") {
    return (
      <span className="cloud-file-thumb">
        <Image src={`/api/cloud/files/${file.id}?preview=1`} alt="" aria-hidden="true" fill sizes="56px" unoptimized />
      </span>
    );
  }
  if (file.mime_type === "application/pdf") {
    return (
      <span className="cloud-file-thumb cloud-pdf-thumb">
        <iframe
          src={`/api/cloud/files/${file.id}?preview=1#page=1&toolbar=0&navpanes=0`}
          title={`${file.name} – erste Seite`}
          tabIndex={-1}
        />
        <i>PDF</i>
      </span>
    );
  }
  return <FileGlyph file={file} />;
}

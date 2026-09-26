"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Archive,
  DownloadSimple,
  CloudArrowUp,
  File,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import ModulePageShell from "@/app/components/module-page-shell";
import { CloudFile, prettySize, prettyDate, canPreview, FileVisual } from "./file-visual";

export default function CloudWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<CloudFile | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/cloud/files", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Dateien konnten nicht geladen werden.");
      setFiles(data.files ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Dateien konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/cloud/files", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Dateien konnten nicht geladen werden.");
        if (active) {
          setFiles(data.files ?? []);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Dateien konnten nicht geladen werden.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!preview) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [preview]);
  const visibleFiles = useMemo(
    () =>
      files.filter((file) => file.name.toLocaleLowerCase("de-CH").includes(query.trim().toLocaleLowerCase("de-CH"))),
    [files, query],
  );
  const totalBytes = files.reduce((total, file) => total + Number(file.size_bytes), 0);

  async function upload(selected: FileList | null) {
    if (!selected?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(selected)) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/cloud/files", { method: "POST", body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(`${file.name}: ${data.error || "Upload fehlgeschlagen."}`);
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function rename(file: CloudFile) {
    const name = window.prompt("Datei umbenennen", file.name)?.trim();
    if (!name || name === file.name) return;
    const response = await fetch(`/api/cloud/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Datei konnte nicht umbenannt werden.");
      return;
    }
    setFiles((current) => current.map((item) => (item.id === file.id ? data.file : item)));
  }

  async function remove(file: CloudFile) {
    if (!window.confirm(`„${file.name}“ endgültig aus der Cloud löschen?`)) return;
    const response = await fetch(`/api/cloud/files/${file.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Datei konnte nicht gelöscht werden.");
      return;
    }
    setFiles((current) => current.filter((item) => item.id !== file.id));
  }

  return (
    <ModulePageShell activeModule="cloud" activeChild="Dateien" pageClass="cloud-page">
      {() => (
        <main className="workspace cloud-workspace">
          <header className="page-heading cloud-hero">
            <div className="heading-copy">
              <p className="eyebrow">CareCore One · Dateien</p>
              <h1>Cloud</h1>
              <p>Gemeinsame Dateien sicher an einem Ort organisieren.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
              <UploadSimple aria-hidden="true" />
              {busy ? "Wird hochgeladen …" : "Dateien hochladen"}
            </button>
            <input
              ref={inputRef}
              className="cloud-file-input"
              type="file"
              multiple
              onChange={(event) => void upload(event.target.files)}
              aria-label="Dateien auswählen"
            />
          </header>

          <section className="cloud-summary" aria-label="Cloud Übersicht">
            <article>
              <span className="cloud-summary-icon">
                <File aria-hidden="true" />
              </span>
              <div>
                <strong>{files.length}</strong>
                <span>Dateien</span>
              </div>
            </article>
            <article>
              <span className="cloud-summary-icon">
                <Archive aria-hidden="true" />
              </span>
              <div>
                <strong>{prettySize(totalBytes)}</strong>
                <span>Belegter Speicher</span>
              </div>
            </article>
            <div className="cloud-summary-note">
              <CloudArrowUp aria-hidden="true" />
              <span>Organisationsweite Ablage · bis 4 MB je Datei</span>
            </div>
          </section>

          <section className="cloud-panel">
            <header className="cloud-panel-head">
              <div>
                <p className="eyebrow">DATEIABLAGE</p>
                <h2>Alle Dateien</h2>
                <span>
                  {files.length} {files.length === 1 ? "Datei" : "Dateien"} in der gemeinsamen Cloud
                </span>
              </div>
              <label className="cloud-search">
                <MagnifyingGlass aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Datei suchen…"
                  aria-label="Dateien suchen"
                />
              </label>
            </header>
            {error && (
              <p className="cloud-error" role="alert">
                {error}
              </p>
            )}
            {loading ? (
              <div className="cloud-empty">Dateien werden geladen …</div>
            ) : visibleFiles.length ? (
              <div className="cloud-file-list">
                {visibleFiles.map((file) => (
                  <article className="cloud-file-row" key={file.id}>
                    {canPreview(file) ? (
                      <button
                        className="cloud-file-main"
                        type="button"
                        onClick={() => setPreview(file)}
                        aria-label={`${file.name} anzeigen`}
                      >
                        <FileVisual file={file} />
                        <span className="cloud-file-name">
                          <strong title={file.name}>{file.name}</strong>
                          <small>
                            {file.mime_type} · {prettySize(Number(file.size_bytes))}
                          </small>
                        </span>
                      </button>
                    ) : (
                      <div className="cloud-file-main">
                        <FileVisual file={file} />
                        <span className="cloud-file-name">
                          <strong title={file.name}>{file.name}</strong>
                          <small>
                            {file.mime_type} · {prettySize(Number(file.size_bytes))}
                          </small>
                        </span>
                      </div>
                    )}
                    <time dateTime={file.created_at}>{prettyDate(file.created_at)}</time>
                    <div className="cloud-actions">
                      <a
                        className="icon-button"
                        href={`/api/cloud/files/${file.id}`}
                        aria-label={`${file.name} herunterladen`}
                        title="Herunterladen"
                      >
                        <DownloadSimple aria-hidden="true" />
                      </a>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => void rename(file)}
                        aria-label={`${file.name} umbenennen`}
                        title="Umbenennen"
                      >
                        <PencilSimple aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={() => void remove(file)}
                        aria-label={`${file.name} löschen`}
                        title="Löschen"
                      >
                        <Trash aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cloud-empty">
                <span className="cloud-empty-icon">
                  <CloudArrowUp aria-hidden="true" />
                </span>
                <strong>{query ? "Keine passenden Dateien" : "Noch keine Dateien gespeichert"}</strong>
                <p>{query ? "Passe den Suchbegriff an." : "Lade eine Datei hoch, damit dein Team sie hier findet."}</p>
                {!query && (
                  <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>
                    <UploadSimple aria-hidden="true" />
                    Datei auswählen
                  </button>
                )}
              </div>
            )}
          </section>
          {preview && (
            <div
              className="cloud-preview-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setPreview(null);
              }}
            >
              <section
                className="cloud-preview-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={`Vorschau: ${preview.name}`}
              >
                <header>
                  <div>
                    <p className="eyebrow">DATEIVORSCHAU</p>
                    <h2>{preview.name}</h2>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => setPreview(null)}
                    aria-label="Vorschau schliessen"
                  >
                    <X aria-hidden="true" />
                  </button>
                </header>
                <div className="cloud-preview-content">
                  {preview.mime_type.startsWith("image/") ? (
                    <Image
                      src={`/api/cloud/files/${preview.id}?preview=1`}
                      alt={preview.name}
                      width={1400}
                      height={1000}
                      unoptimized
                    />
                  ) : preview.mime_type.startsWith("video/") ? (
                    <video src={`/api/cloud/files/${preview.id}?preview=1`} controls playsInline />
                  ) : preview.mime_type.startsWith("audio/") ? (
                    <audio src={`/api/cloud/files/${preview.id}?preview=1`} controls />
                  ) : preview.mime_type === "application/pdf" || preview.mime_type === "text/plain" ? (
                    <iframe src={`/api/cloud/files/${preview.id}?preview=1`} title={preview.name} />
                  ) : (
                    <div className="cloud-empty">
                      Für diesen Dateityp ist keine Vorschau verfügbar. Bitte herunterladen.
                    </div>
                  )}
                </div>
                <footer>
                  <span>
                    {preview.mime_type} · {prettySize(Number(preview.size_bytes))}
                  </span>
                  <a className="secondary-button" href={`/api/cloud/files/${preview.id}`}>
                    <DownloadSimple aria-hidden="true" />
                    Herunterladen
                  </a>
                </footer>
              </section>
            </div>
          )}
        </main>
      )}
    </ModulePageShell>
  );
}

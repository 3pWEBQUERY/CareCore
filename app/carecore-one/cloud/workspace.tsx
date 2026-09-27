"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Archive,
  DownloadSimple,
  CloudArrowUp,
  File,
  FolderPlus,
  FolderSimple,
  MagnifyingGlass,
  ShareNetwork,
  PencilSimple,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import ModulePageShell from "@/app/components/module-page-shell";
import { CloudFile, prettySize, prettyDate, canPreview, FileVisual } from "./file-visual";

type Folder = { id: string; name: string; files: number };
type Scope = "personal" | "shared";

// Texts per scope: "Meine Dateien" (only the uploader) and the house's "Gemeinsame Ablage".
const COPY = {
  personal: {
    child: "Meine Dateien",
    title: "Meine Dateien",
    lead: "Persönliche Dateien – nur für dich sichtbar.",
    note: "Nur für dich sichtbar · bis 4 MB je Datei",
    listTitle: "Alle Dateien",
    count: "in deiner persönlichen Ablage",
    empty: "Lade eine Datei hoch, um sie hier abzulegen.",
  },
  shared: {
    child: "Gemeinsame Ablage",
    title: "Gemeinsame Ablage",
    lead: "Dateien für das ganze Haus – für alle Mitarbeitenden sichtbar.",
    note: "Für das ganze Haus sichtbar · bis 4 MB je Datei",
    listTitle: "Alle Dateien",
    count: "in der gemeinsamen Ablage",
    empty: "Lade eine Datei hoch, damit das ganze Team sie hier findet.",
  },
} as const;

const GENERAL = "general";

export default function CloudWorkspace({ scope = "personal" }: { scope?: Scope }) {
  const copy = COPY[scope];
  const shared = scope === "shared";
  const endpoint = `/api/cloud/files${shared ? "?scope=shared" : ""}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [canManage, setCanManage] = useState(false);
  // "" = all files, GENERAL = files without folder, otherwise a folder id.
  const [folder, setFolder] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<CloudFile | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Dateien konnten nicht geladen werden.");
      setFiles(data.files ?? []);
      setFolders(data.folders ?? []);
      setCanManage(Boolean(data.canManage));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Dateien konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Dateien konnten nicht geladen werden.");
        if (active) {
          setFiles(data.files ?? []);
          setFolders(data.folders ?? []);
          setCanManage(Boolean(data.canManage));
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
  }, [endpoint]);
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
      files.filter(
        (file) =>
          (!folder || (folder === GENERAL ? !file.folder_id : file.folder_id === folder)) &&
          file.name.toLocaleLowerCase("de-CH").includes(query.trim().toLocaleLowerCase("de-CH")),
      ),
    [files, query, folder],
  );
  const activeFolder = folders.find((item) => item.id === folder);
  const folderName = (id: string | null | undefined) => folders.find((item) => item.id === id)?.name ?? "Allgemein";
  const totalBytes = files.reduce((total, file) => total + Number(file.size_bytes), 0);

  async function upload(selected: FileList | null) {
    if (!selected?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(selected)) {
        const form = new FormData();
        form.append("file", file);
        form.append("scope", scope);
        if (shared && activeFolder) form.append("folderId", activeFolder.id);
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
    if (!window.confirm(`„${file.name}“ endgültig löschen?`)) return;
    const response = await fetch(`/api/cloud/files/${file.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Datei konnte nicht gelöscht werden.");
      return;
    }
    setFiles((current) => current.filter((item) => item.id !== file.id));
    if (shared) void load();
  }

  async function send(url: string, method: string, body: unknown, fallback: string) {
    setError("");
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || fallback);
      return null;
    }
    return data;
  }

  // Moves a personal file into the house's shared storage.
  async function share(file: CloudFile) {
    if (!window.confirm(`„${file.name}“ in die gemeinsame Ablage verschieben? Danach sehen sie alle Mitarbeitenden.`))
      return;
    const data = await send(
      `/api/cloud/files/${file.id}`,
      "PATCH",
      { share: true },
      "Datei konnte nicht geteilt werden.",
    );
    if (data) setFiles((current) => current.filter((item) => item.id !== file.id));
  }

  async function move(file: CloudFile, folderId: string) {
    const data = await send(
      `/api/cloud/files/${file.id}`,
      "PATCH",
      { folderId: folderId === GENERAL ? null : folderId },
      "Datei konnte nicht verschoben werden.",
    );
    if (data) await load();
  }

  async function createFolder() {
    const name = window.prompt("Neuer Ordner")?.trim();
    if (!name) return;
    const data = await send("/api/cloud/folders", "POST", { name }, "Ordner konnte nicht angelegt werden.");
    if (data) {
      await load();
      setFolder(data.id);
    }
  }

  async function renameFolder(item: Folder) {
    const name = window.prompt("Ordner umbenennen", item.name)?.trim();
    if (!name || name === item.name) return;
    if (await send(`/api/cloud/folders/${item.id}`, "PATCH", { name }, "Ordner konnte nicht umbenannt werden."))
      await load();
  }

  async function removeFolder(item: Folder) {
    if (!window.confirm(`Ordner „${item.name}“ löschen? Die Dateien bleiben unter „Allgemein“ erhalten.`)) return;
    if (await send(`/api/cloud/folders/${item.id}`, "DELETE", undefined, "Ordner konnte nicht gelöscht werden.")) {
      setFolder("");
      await load();
    }
  }

  return (
    <ModulePageShell activeModule="cloud" activeChild={copy.child} pageClass="cloud-page">
      {() => (
        <main className="workspace cloud-workspace">
          <header className="page-heading cloud-hero">
            <div className="heading-copy">
              <p className="eyebrow">CareCore One · Cloud</p>
              <h1>{copy.title}</h1>
              <p>{copy.lead}</p>
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
              <span>{copy.note}</span>
            </div>
          </section>

          <section className="cloud-panel">
            <header className="cloud-panel-head">
              <div>
                <p className="eyebrow">DATEIABLAGE</p>
                <h2>{activeFolder ? activeFolder.name : folder === GENERAL ? "Allgemein" : copy.listTitle}</h2>
                <span>
                  {visibleFiles.length} {visibleFiles.length === 1 ? "Datei" : "Dateien"} {copy.count}
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
            {shared && (
              <div className="cloud-folders" role="group" aria-label="Ordner">
                {[
                  { id: "", name: "Alle", files: files.length },
                  { id: GENERAL, name: "Allgemein", files: files.filter((file) => !file.folder_id).length },
                  ...folders,
                ].map((item) => (
                  <button
                    className={folder === item.id ? "active" : ""}
                    type="button"
                    key={item.id || "all"}
                    aria-pressed={folder === item.id}
                    onClick={() => setFolder(item.id)}
                  >
                    <FolderSimple aria-hidden="true" />
                    {item.name}
                    <em>{item.files}</em>
                  </button>
                ))}
                {canManage && (
                  <button className="cloud-folder-add" type="button" onClick={() => void createFolder()}>
                    <FolderPlus aria-hidden="true" />
                    Ordner
                  </button>
                )}
                {canManage && activeFolder && (
                  <span className="cloud-folder-tools">
                    <button type="button" onClick={() => void renameFolder(activeFolder)}>
                      Umbenennen
                    </button>
                    <button type="button" className="danger" onClick={() => void removeFolder(activeFolder)}>
                      Löschen
                    </button>
                  </span>
                )}
              </div>
            )}
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
                            {shared
                              ? `${file.uploaded_by_name ?? "Unbekannt"} · ${folder ? "" : `${folderName(file.folder_id)} · `}${prettySize(Number(file.size_bytes))}`
                              : `${file.mime_type} · ${prettySize(Number(file.size_bytes))}`}
                          </small>
                        </span>
                      </button>
                    ) : (
                      <div className="cloud-file-main">
                        <FileVisual file={file} />
                        <span className="cloud-file-name">
                          <strong title={file.name}>{file.name}</strong>
                          <small>
                            {shared
                              ? `${file.uploaded_by_name ?? "Unbekannt"} · ${folder ? "" : `${folderName(file.folder_id)} · `}${prettySize(Number(file.size_bytes))}`
                              : `${file.mime_type} · ${prettySize(Number(file.size_bytes))}`}
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
                      {shared && file.can_edit && folders.length > 0 && (
                        <select
                          className="cloud-move"
                          value={file.folder_id ?? GENERAL}
                          onChange={(event) => void move(file, event.target.value)}
                          aria-label={`${file.name} in Ordner verschieben`}
                          title="In Ordner verschieben"
                        >
                          <option value={GENERAL}>Allgemein</option>
                          {folders.map((item) => (
                            <option value={item.id} key={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {!shared && (
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => void share(file)}
                          aria-label={`${file.name} in die gemeinsame Ablage verschieben`}
                          title="In gemeinsame Ablage verschieben"
                        >
                          <ShareNetwork aria-hidden="true" />
                        </button>
                      )}
                      {file.can_edit !== false && (
                        <>
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
                        </>
                      )}
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
                <p>{query ? "Passe den Suchbegriff an." : copy.empty}</p>
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

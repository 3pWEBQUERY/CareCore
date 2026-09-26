"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";
import {
  EditorDialog,
  LoadError,
  ReasonDialog,
  formatDate,
  requestJson,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUS,
  DOCUMENT_TYPES,
  PREVIEW_TYPES,
  fileSizeLabel,
  fileTypeLabel,
  type DocumentKind,
  type DocumentsPayload,
  type LibraryDocument,
} from "@/lib/documents-shared";
import { ScheduleDatePicker, ScheduleSelect } from "@/app/betrieb/components/operations-ui";
import { PersonalFrame, PersonalSummary, SearchField } from "../../components/personal-ui";

type Folder = {
  id: string;
  label: string;
  detail: string;
  icon: ModuleIconName;
  match: (d: LibraryDocument) => boolean;
};

const current = (d: LibraryDocument) => d.status === "active" || d.status === "draft";
const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

function statusOf(d: LibraryDocument, today: string) {
  if (d.status !== "active") return DOCUMENT_STATUS[d.status];
  if (d.kind === "standard") {
    if (d.reviewDueOn && d.reviewDueOn < today) return { label: "Prüfung fällig", tone: "critical" };
    if (d.requiresAck && !d.acknowledgedAt) return { label: "Bestätigen", tone: "attention" };
    if (!d.readAt) return { label: "Neu", tone: "info" };
    return { label: "Verbindlich", tone: "stable" };
  }
  return DOCUMENT_STATUS.active;
}

function fileIcon(d: LibraryDocument): ModuleIconName {
  if (d.kind === "standard") return d.category === "Hygiene" ? "check" : d.category === "Weisung" ? "docs" : "quality";
  if (d.category === "Notfall") return "alert";
  if (d.category === "Formulare" || d.category === "Vorlagen") return "note";
  return "docs";
}

const fileUrl = (d: LibraryDocument) =>
  d.fileId
    ? `/api/cloud/files/${d.fileId}${d.mimeType && PREVIEW_TYPES.includes(d.mimeType) ? "?preview=1" : ""}`
    : null;

async function postForm(url: string, form: FormData) {
  const response = await fetch(url, { method: "POST", body: form });
  const data = (await response.json().catch(() => ({}))) as { error?: string; id?: string };
  if (!response.ok) throw new Error(data.error || "Speichern fehlgeschlagen.");
  return data;
}

function UploadDialog({
  data,
  onClose,
  onSaved,
}: {
  data: DocumentsPayload;
  onClose: () => void;
  onSaved: (message: string, id?: string) => void;
}) {
  const standards = data.kind === "standard";
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[data.kind][0]);
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState(false);
  const [requiresAck, setRequiresAck] = useState(true);
  const [reviewDueOn, setReviewDueOn] = useState(addDays(data.today, 730));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <EditorDialog
      id="document-upload"
      eyebrow={standards ? "CareCore Docs · Standards" : "CareCore Docs · Ablage"}
      title={standards ? "Weisung veröffentlichen" : "Dokument hochladen"}
      description={
        standards
          ? "Freigegebene Standards sind verbindlich. Mit Lesebestätigung erhalten alle Mitarbeitenden eine Benachrichtigung."
          : "PDF, Word, Excel, PowerPoint, Text oder Bild bis 4 MB."
      }
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          const form = new FormData();
          form.set("kind", data.kind);
          form.set("title", title);
          form.set("category", category);
          form.set("description", description);
          form.set("status", draft ? "draft" : "active");
          if (standards) {
            form.set("requiresAck", String(requiresAck));
            form.set("reviewDueOn", reviewDueOn);
          }
          if (file) form.set("file", file);
          const result = await postForm("/api/documents", form);
          onSaved(
            draft ? "Entwurf gespeichert" : standards ? "Standard veröffentlicht" : "Dokument hochgeladen",
            result.id,
          );
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel={draft ? "Als Entwurf speichern" : standards ? "Freigeben & veröffentlichen" : "Hochladen"}
    >
      <label className="area-editor-wide">
        <span>Datei</span>
        <input
          type="file"
          required
          accept={DOCUMENT_TYPES.join(",")}
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            setFile(next);
            if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
          }}
        />
      </label>
      <label className="area-editor-wide">
        <span>Titel</span>
        <input value={title} maxLength={220} required onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Kategorie</span>
        <ScheduleSelect
          label="Kategorie"
          value={category}
          options={[...DOCUMENT_CATEGORIES[data.kind]]}
          onChange={setCategory}
        />
      </label>
      <label>
        <span>Status</span>
        <ScheduleSelect
          label="Status"
          value={draft ? "Entwurf" : standards ? "Freigegeben" : "Aktuell"}
          options={[standards ? "Freigegeben" : "Aktuell", "Entwurf"]}
          onChange={(value) => setDraft(value === "Entwurf")}
        />
      </label>
      {standards && (
        <label>
          <span>Überprüfen bis</span>
          <ScheduleDatePicker label="Überprüfen bis" value={reviewDueOn} onChange={setReviewDueOn} />
        </label>
      )}
      {standards && (
        <fieldset className="duty-assignment-options">
          <legend>Kenntnisnahme</legend>
          <div className="area-service-options">
            <label className={requiresAck ? "selected" : ""}>
              <input type="checkbox" checked={requiresAck} onChange={(event) => setRequiresAck(event.target.checked)} />
              <span>Lesebestätigung verlangen</span>
            </label>
          </div>
        </fieldset>
      )}
      <label className="area-editor-wide">
        <span>Beschreibung</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
    </EditorDialog>
  );
}

function VersionDialog({
  doc,
  onClose,
  onSaved,
}: {
  doc: LibraryDocument;
  onClose: () => void;
  onSaved: (message: string, id?: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <EditorDialog
      id="document-version"
      eyebrow="CareCore Docs · Versionen"
      title={`Neue Version: ${doc.title}`}
      description={`Version ${doc.versionNo + 1} ersetzt die aktuelle Version ${doc.versionNo}; frühere Versionen bleiben abrufbar.${doc.kind === "standard" && doc.requiresAck ? " Alle müssen die neue Version erneut bestätigen." : ""}`}
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          const form = new FormData();
          if (file) form.set("file", file);
          form.set("changeNote", note);
          form.set("status", draft ? "draft" : "active");
          const result = await postForm(`/api/documents/${doc.id}`, form);
          onSaved(
            draft ? "Neue Version als Entwurf gespeichert" : `Version ${doc.versionNo + 1} veröffentlicht`,
            result.id,
          );
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel={draft ? "Als Entwurf speichern" : "Version veröffentlichen"}
    >
      <label className="area-editor-wide">
        <span>Datei</span>
        <input
          type="file"
          required
          accept={DOCUMENT_TYPES.join(",")}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <label className="area-editor-wide">
        <span>Was hat sich geändert?</span>
        <textarea rows={3} maxLength={1000} required value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <label>
        <span>Status</span>
        <ScheduleSelect
          label="Status"
          value={draft ? "Entwurf" : "Sofort gültig"}
          options={["Sofort gültig", "Entwurf"]}
          onChange={(value) => setDraft(value === "Entwurf")}
        />
      </label>
    </EditorDialog>
  );
}

function EditDialog({
  doc,
  onClose,
  onSaved,
}: {
  doc: LibraryDocument;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [category, setCategory] = useState(doc.category);
  const [description, setDescription] = useState(doc.description ?? "");
  const [requiresAck, setRequiresAck] = useState(doc.requiresAck);
  const [reviewDueOn, setReviewDueOn] = useState(doc.reviewDueOn ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const standards = doc.kind === "standard";
  return (
    <EditorDialog
      id="document-edit"
      eyebrow="CareCore Docs"
      title="Angaben bearbeiten"
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          await requestJson(`/api/documents/${doc.id}`, {
            method: "POST",
            body: { action: "update", title, category, description, requiresAck, reviewDueOn: reviewDueOn || null },
          });
          onSaved("Angaben gespeichert");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel="Speichern"
    >
      <label className="area-editor-wide">
        <span>Titel</span>
        <input value={title} maxLength={220} required onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Kategorie</span>
        <ScheduleSelect
          label="Kategorie"
          value={category}
          options={[...DOCUMENT_CATEGORIES[doc.kind]]}
          onChange={setCategory}
        />
      </label>
      {standards && (
        <label>
          <span>Überprüfen bis</span>
          <ScheduleDatePicker
            label="Überprüfen bis"
            value={reviewDueOn || addDays(doc.createdAt.slice(0, 10), 730)}
            onChange={setReviewDueOn}
          />
        </label>
      )}
      {standards && (
        <fieldset className="area-editor-wide duty-assignment-options">
          <legend>Kenntnisnahme</legend>
          <div className="area-service-options">
            <label className={requiresAck ? "selected" : ""}>
              <input type="checkbox" checked={requiresAck} onChange={(event) => setRequiresAck(event.target.checked)} />
              <span>Lesebestätigung verlangen</span>
            </label>
          </div>
        </fieldset>
      )}
      <label className="area-editor-wide">
        <span>Beschreibung</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
    </EditorDialog>
  );
}

type Dialog = { kind: "upload" } | { kind: "version" | "edit" | "archive"; doc: LibraryDocument };

function DocumentsView({
  kind,
  showToast,
  dialog,
  setDialog,
  onData,
}: {
  kind: DocumentKind;
  showToast: ShowToast;
  dialog: Dialog | null;
  setDialog: (dialog: Dialog | null) => void;
  onData: (data: DocumentsPayload | undefined) => void;
}) {
  const standards = kind === "standard";
  const params = useSearchParams();
  const [folder, setFolder] = useState("all");
  const [filter, setFilter] = useState("Alle");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("document"));
  const library = useApiData<DocumentsPayload>(`/api/documents?kind=${kind}`);
  const { reload } = library;
  const data = library.data;
  useEffect(() => onData(data), [data, onData]);
  const today = data?.today ?? "";
  const docs = data?.documents ?? [];
  const me = data?.currentUserId;

  const folders: Folder[] = standards
    ? [
        {
          id: "all",
          label: "Alle Standards",
          detail: "verbindliche Versionen",
          icon: "quality",
          match: (d) => d.status === "active",
        },
        {
          id: "ack",
          label: "Zu bestätigen",
          detail: "Lesebestätigung offen",
          icon: "check",
          match: (d) => d.status === "active" && d.requiresAck && !d.acknowledgedAt,
        },
        {
          id: "review",
          label: "Zur Prüfung",
          detail: "Entwürfe & fällige Überprüfung",
          icon: "alert",
          match: (d) =>
            d.status === "draft" || (d.status === "active" && !!d.reviewDueOn && d.reviewDueOn <= addDays(today, 30)),
        },
        { id: "archive", label: "Archiv", detail: "Frühere Versionen", icon: "building", match: (d) => !current(d) },
      ]
    : [
        {
          id: "all",
          label: "Alle Dokumente",
          detail: "aktuelle Dateien",
          icon: "docs",
          match: (d) => d.status === "active",
        },
        {
          id: "mine",
          label: "Meine Dokumente",
          detail: "von dir hochgeladen",
          icon: "note",
          match: (d) => current(d) && d.uploadedById === me,
        },
        ...DOCUMENT_CATEGORIES.document.map((category): Folder => ({
          id: category,
          label: category,
          detail: "Kategorie",
          icon: category === "Notfall" ? "alert" : category === "Organisation" ? "building" : "docs",
          match: (d) => current(d) && d.category === category,
        })),
        { id: "archive", label: "Archiv", detail: "Frühere Versionen", icon: "building", match: (d) => !current(d) },
      ];
  const activeFolder = folders.find((f) => f.id === folder) ?? folders[0];
  const filters = standards
    ? ["Alle", ...DOCUMENT_CATEGORIES.standard]
    : ["Alle", "Aktuell", "Entwurf", "PDF", "Word", "Excel", "Bild"];
  const needle = query.trim().toLocaleLowerCase("de-CH");
  const visible = docs
    .filter(activeFolder.match)
    .filter((d) => {
      if (filter === "Alle") return true;
      if (standards) return d.category === filter;
      if (filter === "Aktuell") return d.status === "active";
      if (filter === "Entwurf") return d.status === "draft";
      return fileTypeLabel(d.mimeType) === filter;
    })
    .filter(
      (d) =>
        !needle ||
        `${d.title} ${d.description ?? ""} ${d.category} ${d.fileName ?? ""}`
          .toLocaleLowerCase("de-CH")
          .includes(needle),
    );
  const selected = docs.find((d) => d.id === selectedId) ?? visible[0] ?? null;
  const versions: LibraryDocument[] = [];
  for (let d = selected; d?.previousId;) {
    const previous = docs.find((x) => x.id === d!.previousId);
    if (!previous) break;
    versions.push(previous);
    d = previous;
  }

  const run = async (url: string, body: unknown, message?: string) => {
    try {
      await requestJson(url, { method: "POST", body });
      if (message) showToast(message);
      reload();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    }
  };
  const markRead = (d: LibraryDocument) => {
    if (!d.readAt) void run(`/api/documents/${d.id}`, { action: "read" });
  };
  const done = (message: string, id?: string) => {
    setDialog(null);
    showToast(message);
    if (id) setSelectedId(id);
    reload();
  };

  const activeDocs = docs.filter((d) => d.status === "active");
  return (
    <>
      <PersonalSummary
        items={
          standards
            ? [
                { icon: "docs", value: String(activeDocs.length), label: "Standards" },
                {
                  icon: "check",
                  value: String(activeDocs.filter((d) => !d.requiresAck || d.acknowledgedAt).length),
                  label: "von dir bestätigt",
                  tone: "info",
                },
                {
                  icon: "alert",
                  value: String(activeDocs.filter((d) => d.requiresAck && !d.acknowledgedAt).length),
                  label: "zu bestätigen",
                  tone: "attention",
                },
                {
                  icon: "alert",
                  value: String(activeDocs.filter((d) => d.reviewDueOn && d.reviewDueOn < today).length),
                  label: "Überprüfung überfällig",
                  tone: "critical",
                },
              ]
            : [
                { icon: "docs", value: String(activeDocs.length), label: "Dokumente" },
                {
                  icon: "check",
                  value: String(activeDocs.filter((d) => d.readAt).length),
                  label: "von dir geöffnet",
                  tone: "info",
                },
                {
                  icon: "note",
                  value: String(docs.filter((d) => d.status === "draft").length),
                  label: "Entwürfe",
                  tone: "attention",
                },
                {
                  icon: "team",
                  value: String(docs.filter((d) => current(d) && d.uploadedById === me).length),
                  label: "von dir hochgeladen",
                },
              ]
        }
      />
      {library.error && <LoadError message={library.error} onRetry={reload} />}
      <div className={`documents-layout ${standards ? "documents-standards-layout" : "documents-library-layout"}`}>
        <aside className="card documents-folders">
          <div className="card-header">
            <div>
              <p className="eyebrow">{standards ? "Standardsammlung" : "Ablage"}</p>
              <h2 className="card-title">{standards ? "Weisungen" : "Dokumente"}</h2>
            </div>
          </div>
          {folders.map((f) => (
            <button
              className={`documents-folder ${f.id === activeFolder.id ? "active" : ""}`}
              type="button"
              key={f.id}
              aria-pressed={f.id === activeFolder.id}
              onClick={() => {
                setFolder(f.id);
                setSelectedId(null);
              }}
            >
              <ModuleIcon name={f.icon} />
              <span>
                <strong>{f.label}</strong>
                <small>{f.detail}</small>
              </span>
              <b>{docs.filter(f.match).length}</b>
            </button>
          ))}
        </aside>
        <section className="card documents-library">
          <div className="documents-library-header">
            <div>
              <p className="eyebrow">{standards ? "Versionen und Freigaben" : "Dateibibliothek"}</p>
              <h2 className="card-title">{activeFolder.label}</h2>
              <p className="card-subtitle">
                {visible.length} von {docs.filter(activeFolder.match).length} Dateien sichtbar
              </p>
            </div>
            <div className="documents-library-actions">
              <SearchField
                label={standards ? "Standards durchsuchen" : "Dokumente durchsuchen"}
                query={query}
                setQuery={setQuery}
                placeholder={standards ? "Standards suchen…" : "Dokumente suchen…"}
              />
              {data?.canUpload && (
                <button className="secondary-button" type="button" onClick={() => setDialog({ kind: "upload" })}>
                  <ModuleIcon name="plus" /> {standards ? "Veröffentlichen" : "Hochladen"}
                </button>
              )}
            </div>
          </div>
          <div className="documents-filter-row operations-filter-buttons">
            {filters.map((item) => (
              <button
                className={filter === item ? "active" : ""}
                type="button"
                key={item}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="documents-table-head">
            <span>{standards ? "Standard" : "Name"}</span>
            <span>{standards ? "Freigabe" : "Zuletzt geändert"}</span>
            <span>Status</span>
            <span />
          </div>
          <div className="documents-table">
            {visible.map((d) => {
              const status = statusOf(d, today);
              const url = fileUrl(d);
              return (
                <article className={selected?.id === d.id ? "selected" : ""} key={d.id}>
                  <button className="documents-row-main" type="button" onClick={() => setSelectedId(d.id)}>
                    <span className={`documents-file-icon ${status.tone}`}>
                      <ModuleIcon name={fileIcon(d)} />
                    </span>
                    <span>
                      <strong>{d.title}</strong>
                      <small>{d.description ?? `${d.category} · Version ${d.versionNo}`}</small>
                    </span>
                  </button>
                  <span className="documents-row-meta">
                    {standards
                      ? d.approvedAt
                        ? `Freigegeben ${formatDate(d.approvedAt)} · V${d.versionNo}`
                        : `Entwurf · V${d.versionNo}`
                      : [fileTypeLabel(d.mimeType), fileSizeLabel(d.sizeBytes), formatDate(d.createdAt)]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                  <span className={`status-badge ${status.tone}`}>{status.label}</span>
                  {url ? (
                    <a
                      className="quiet-button"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        setSelectedId(d.id);
                        markRead(d);
                      }}
                    >
                      Öffnen
                    </a>
                  ) : (
                    <button className="quiet-button" type="button" onClick={() => setSelectedId(d.id)}>
                      Details
                    </button>
                  )}
                </article>
              );
            })}
            {data && visible.length === 0 && (
              <div className="resident-empty">
                <ModuleIcon name={docs.length ? "search" : "docs"} />
                <strong>
                  {docs.length
                    ? "Keine Dokumente gefunden"
                    : standards
                      ? "Noch keine Standards"
                      : "Noch keine Dokumente"}
                </strong>
                <p>
                  {docs.length
                    ? "Ordner, Suchbegriff oder Filter anpassen."
                    : "Über „Hochladen“ legst du das erste Dokument ab."}
                </p>
              </div>
            )}
            {!data && library.loading && <p className="list-hint">Dokumente werden geladen …</p>}
          </div>
        </section>
        <aside className="card documents-preview">
          {selected ? (
            <DocumentPreview
              doc={selected}
              data={data!}
              versions={versions}
              today={today}
              onOpen={() => markRead(selected)}
              onAck={() =>
                void run(`/api/documents/${selected.id}`, { action: "ack" }, "Gelesen & verstanden bestätigt")
              }
              onPublish={() => void run(`/api/documents/${selected.id}`, { action: "publish" }, "Freigegeben")}
              setDialog={setDialog}
            />
          ) : (
            <div className="card-header">
              <div>
                <p className="eyebrow">{standards ? "Freigabedetail" : "Vorschau"}</p>
                <h2 className="card-title">Kein Dokument ausgewählt</h2>
              </div>
            </div>
          )}
        </aside>
      </div>
      {data && dialog?.kind === "upload" && <UploadDialog data={data} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.kind === "version" && <VersionDialog doc={dialog.doc} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.kind === "edit" && <EditDialog doc={dialog.doc} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.kind === "archive" && (
        <ReasonDialog
          eyebrow="CareCore Docs"
          title={standards ? "Standard archivieren" : "Dokument archivieren"}
          description={`„${dialog.doc.title}“ wird ins Archiv verschoben und ist nicht mehr gültig. Es bleibt nachvollziehbar.`}
          label="Grund"
          placeholder="z. B. ersetzt durch neue Vorlage, nicht mehr in Gebrauch"
          submitLabel="Archivieren"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            await requestJson(`/api/documents/${dialog.doc.id}`, {
              method: "POST",
              body: { action: "archive", reason },
            });
            done("Ins Archiv verschoben");
          }}
        />
      )}
    </>
  );
}

function DocumentPreview({
  doc,
  data,
  versions,
  today,
  onOpen,
  onAck,
  onPublish,
  setDialog,
}: {
  doc: LibraryDocument;
  data: DocumentsPayload;
  versions: LibraryDocument[];
  today: string;
  onOpen: () => void;
  onAck: () => void;
  onPublish: () => void;
  setDialog: (dialog: Dialog) => void;
}) {
  const standards = doc.kind === "standard";
  const status = statusOf(doc, today);
  const url = fileUrl(doc);
  const canPublish = doc.status === "draft" && doc.canEdit && (!standards || data.canManage);
  return (
    <>
      <div className="card-header">
        <div>
          <p className="eyebrow">{standards ? "Freigabedetail" : "Vorschau"}</p>
          <h2 className="card-title">{doc.title}</h2>
          <p className="card-subtitle">
            {doc.category} · Version {doc.versionNo}
          </p>
        </div>
        <span className={`documents-preview-badge ${status.tone}`}>
          <ModuleIcon name={fileIcon(doc)} />
        </span>
      </div>
      <div className="documents-preview-page">
        <ModuleIcon name={standards ? "quality" : "docs"} />
        <strong>{doc.fileName ?? "Keine Datei hinterlegt"}</strong>
        <small>{doc.description ?? "Keine Beschreibung."}</small>
        <span>
          {[fileTypeLabel(doc.mimeType), fileSizeLabel(doc.sizeBytes)].filter(Boolean).join(" · ")} · hochgeladen{" "}
          {formatDate(doc.createdAt)}
          {doc.uploadedByName ? ` von ${doc.uploadedByName}` : ""}
        </span>
      </div>
      <dl className="documents-facts">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`status-badge ${status.tone}`}>{status.label}</span>
          </dd>
        </div>
        {standards && (
          <div>
            <dt>Freigabe</dt>
            <dd>
              {doc.approvedAt
                ? `${formatDate(doc.approvedAt)} · ${doc.approvedByName ?? "Qualitätsmanagement"}`
                : "ausstehend"}
            </dd>
          </div>
        )}
        {standards && doc.reviewDueOn && (
          <div>
            <dt>Überprüfen bis</dt>
            <dd className={doc.reviewDueOn < today ? "overdue" : ""}>{formatDate(doc.reviewDueOn)}</dd>
          </div>
        )}
        {standards && doc.requiresAck && (
          <div>
            <dt>Kenntnisnahme</dt>
            <dd>
              {doc.acknowledgedAt
                ? `Von dir bestätigt am ${formatDate(doc.acknowledgedAt)}`
                : "Von dir noch nicht bestätigt"}
              {data.canManage ? ` · ${doc.ackCount}/${data.audience} im Team` : ""}
            </dd>
          </div>
        )}
        {doc.changeNote && (
          <div>
            <dt>Änderung</dt>
            <dd>{doc.changeNote}</dd>
          </div>
        )}
        {doc.archiveReason && (
          <div>
            <dt>Archiviert</dt>
            <dd>{doc.archiveReason}</dd>
          </div>
        )}
        {versions.length > 0 && (
          <div>
            <dt>Frühere Versionen</dt>
            <dd className="documents-versions">
              {versions.map((v) =>
                fileUrl(v) ? (
                  <a key={v.id} href={fileUrl(v)!} target="_blank" rel="noreferrer">
                    Version {v.versionNo} · {formatDate(v.createdAt)}
                  </a>
                ) : (
                  <span key={v.id}>Version {v.versionNo}</span>
                ),
              )}
            </dd>
          </div>
        )}
      </dl>
      {url ? (
        <a className="primary-button" href={url} target="_blank" rel="noreferrer" onClick={onOpen}>
          {standards ? "Standard öffnen" : "Dokument öffnen"}
        </a>
      ) : (
        <button className="primary-button" type="button" disabled>
          Keine Datei hinterlegt
        </button>
      )}
      <div className="documents-preview-actions">
        {standards && doc.status === "active" && doc.requiresAck && !doc.acknowledgedAt && (
          <button className="secondary-button" type="button" onClick={onAck}>
            Gelesen & verstanden
          </button>
        )}
        {canPublish && (
          <button className="secondary-button" type="button" onClick={onPublish}>
            Freigeben
          </button>
        )}
        {doc.canEdit && current(doc) && (
          <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "version", doc })}>
            Neue Version
          </button>
        )}
        {doc.canEdit && current(doc) && (
          <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "edit", doc })}>
            Bearbeiten
          </button>
        )}
        {doc.canEdit && current(doc) && (
          <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "archive", doc })}>
            Archivieren
          </button>
        )}
      </div>
    </>
  );
}

export default function DocumentsWorkspace({ kind }: { kind: DocumentKind }) {
  const standards = kind === "standard";
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [canUpload, setCanUpload] = useState(false);
  const onData = useCallback((data: DocumentsPayload | undefined) => setCanUpload(Boolean(data?.canUpload)), []);
  return (
    <PersonalFrame
      module="docs"
      child={standards ? "Standards & Weisungen" : "Dokumente"}
      view={standards ? "standards" : "documents"}
      eyebrow="CareCore Docs"
      title={standards ? "Standards & Weisungen" : "Dokumente"}
      description={
        standards
          ? "Aktuelle Standards, Weisungen und Versionen im schnellen Zugriff."
          : "Zentrale Ablage für Formulare, Vorlagen und Arbeitsunterlagen."
      }
      action={
        canUpload
          ? {
              label: standards ? "Weisung veröffentlichen" : "Dokument hochladen",
              onClick: () => setDialog({ kind: "upload" }),
            }
          : null
      }
    >
      {(showToast) => (
        // DocumentsView reads ?document= (useSearchParams), which needs a Suspense boundary on a static page.
        <Suspense fallback={null}>
          <DocumentsView kind={kind} showToast={showToast} dialog={dialog} setDialog={setDialog} onData={onData} />
        </Suspense>
      )}
    </PersonalFrame>
  );
}

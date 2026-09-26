"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";
import {
  EditorDialog,
  LoadError,
  formatDate,
  requestJson,
  timeInZurich,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import {
  CERTIFICATE_TYPES,
  COMPLIANCE_STATES,
  TRAINING_CATEGORIES,
  TRAINING_FORMATS,
  type ComplianceRow,
  type ComplianceState,
  type LearningPayload,
  type Training,
  type TrainingFormat,
} from "@/lib/learning-shared";
import { ScheduleDatePicker, ScheduleSelect } from "@/app/betrieb/components/operations-ui";
import { PersonalFrame, PersonalSummary, SearchField } from "../../components/personal-ui";

const CATEGORY_ICONS: Record<string, ModuleIconName> = {
  Pflege: "residents",
  Medikation: "med",
  Wundmanagement: "wounds",
  Hygiene: "check",
  Notfall: "alert",
  Sicherheit: "quality",
  Kommunikation: "team",
  Organisation: "docs",
};
const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
const ME = "Nur ich";
const ALL_PEOPLE = "Alle Mitarbeitenden";
const NO_SESSION = "Ohne Termin anmelden";

const zurichDay = (value: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date(value));
const sessionLabel = (s: Training["sessions"][number]) =>
  `${formatDate(zurichDay(s.startsAt))} ${timeInZurich(new Date(s.startsAt))}–${timeInZurich(new Date(s.endsAt))}${s.location ? ` · ${s.location}` : ""}${s.capacity ? ` · ${s.booked}/${s.capacity} Plätze` : ""}`;

function trainingState(t: Training) {
  const e = t.enrollment;
  if (e?.status === "completed") return { label: "Abgeschlossen", tone: "stable" };
  if (e?.status === "in_progress") return { label: `In Bearbeitung · ${e.progress} %`, tone: "info" };
  if (e?.assignedByName) return { label: "Zugewiesen", tone: "attention" };
  if (e) return { label: "Angemeldet", tone: "attention" };
  if (t.mandatory) return { label: "Pflicht", tone: "critical" };
  return { label: "Verfügbar", tone: "info" };
}

function trainingMeta(t: Training, now: number) {
  const parts: string[] = [TRAINING_FORMATS[t.format]];
  if (t.durationMinutes)
    parts.push(
      t.durationMinutes >= 60
        ? `${String(Math.round((t.durationMinutes / 60) * 10) / 10).replace(".", ",")} h`
        : `${t.durationMinutes} Minuten`,
    );
  const booked = t.sessions.find((s) => s.mine);
  const next = t.sessions.find((s) => Date.parse(s.startsAt) > now);
  if (booked) parts.push(`Dein Termin ${formatDate(zurichDay(booked.startsAt))}`);
  else if (t.enrollment?.dueOn) parts.push(`Frist ${formatDate(t.enrollment.dueOn)}`);
  else if (next) parts.push(`Nächster Termin ${formatDate(zurichDay(next.startsAt))}`);
  return parts.join(" · ");
}

function complianceText(row: ComplianceRow, today: string) {
  const e = row.enrollment;
  if (row.state === "missing")
    return e?.dueOn ? `Noch kein Nachweis · Frist ${formatDate(e.dueOn)}` : "Noch kein Nachweis im Kompetenzprofil.";
  if (row.state === "expired") return `Abgelaufen seit ${formatDate(e?.validUntil ?? today)}. Auffrischung nötig.`;
  if (row.state === "pending")
    return `Nachweis vom ${formatDate(e?.completedAt ?? null)} – Prüfung durch die Leitung ausstehend.`;
  if (!e?.validUntil) return `Nachweis vom ${formatDate(e?.completedAt ?? null)} · unbefristet gültig.`;
  const days = Math.round((Date.parse(e.validUntil) - Date.parse(today)) / 86_400_000);
  return row.state === "due_soon"
    ? `Läuft in ${days} Tagen ab (${formatDate(e.validUntil)}).`
    : `Gültig bis ${formatDate(e.validUntil)}.`;
}

const STATE_ORDER: ComplianceState[] = ["expired", "missing", "due_soon", "pending", "valid"];
const STATE_ICON: Record<ComplianceState, ModuleIconName> = {
  expired: "alert",
  missing: "alert",
  due_soon: "calendar",
  pending: "docs",
  valid: "check",
};

async function postForm(url: string, form: FormData) {
  const response = await fetch(url, { method: "POST", body: form });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Speichern fehlgeschlagen.");
}

function EvidenceDialog({
  data,
  trainingId,
  userId,
  onClose,
  onSaved,
}: {
  data: LearningPayload;
  trainingId: string | null;
  userId: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [training, setTraining] = useState(
    trainingId ?? data.trainings.find((t) => t.mandatory)?.id ?? data.trainings[0]?.id ?? "",
  );
  const [person, setPerson] = useState(userId ?? data.currentUserId);
  const [completedOn, setCompletedOn] = useState(data.today);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = data.trainings.find((t) => t.id === training);
  const personName = data.people.find((p) => p.id === person)?.name ?? "Ich";
  return (
    <EditorDialog
      id="learning-evidence"
      eyebrow="CareCore Learn · Nachweise"
      title="Nachweis erfassen"
      description={
        data.canManage
          ? "Von der Leitung erfasste Nachweise gelten sofort als geprüft."
          : "Die Leitung prüft deinen Nachweis und bestätigt ihn im Kompetenzprofil."
      }
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          const form = new FormData();
          form.set("trainingId", training);
          if (person !== data.currentUserId) form.set("userId", person);
          form.set("completedOn", completedOn);
          form.set("note", note);
          if (file) form.set("certificate", file);
          await postForm("/api/learning/evidence", form);
          onSaved(`Nachweis „${selected?.title ?? ""}“ gespeichert`);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel="Nachweis speichern"
    >
      <label className="area-editor-wide">
        <span>Schulung</span>
        <ScheduleSelect
          label="Schulung"
          value={selected?.title ?? "Schulung wählen"}
          options={data.trainings.map((t) => t.title)}
          onChange={(title) => setTraining(data.trainings.find((t) => t.title === title)?.id ?? "")}
        />
      </label>
      {data.canManage && (
        <label>
          <span>Person</span>
          <ScheduleSelect
            label="Person"
            value={personName}
            options={data.people.map((p) => p.name)}
            onChange={(name) => setPerson(data.people.find((p) => p.name === name)?.id ?? data.currentUserId)}
          />
        </label>
      )}
      <label>
        <span>Abgeschlossen am</span>
        <ScheduleDatePicker label="Abgeschlossen am" value={completedOn} onChange={setCompletedOn} />
      </label>
      <label className="area-editor-wide">
        <span>Zertifikat (PDF oder Bild, max. 4 MB)</span>
        <input
          type="file"
          accept={CERTIFICATE_TYPES.join(",")}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <label className="area-editor-wide">
        <span>Bemerkung</span>
        <input
          value={note}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
          placeholder="z. B. Kursanbieter, Punktzahl"
        />
      </label>
      {selected?.validForMonths && (
        <p className="area-editor-wide list-hint">Gültigkeit: {selected.validForMonths} Monate ab Abschlussdatum.</p>
      )}
    </EditorDialog>
  );
}

function EnrollDialog({
  training,
  onClose,
  onSaved,
}: {
  training: Training;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [now] = useState(() => Date.now());
  const open = training.sessions.filter(
    (s) => Date.parse(s.startsAt) > now && (!s.capacity || s.booked < s.capacity || s.mine),
  );
  const [session, setSession] = useState(training.enrollment?.sessionId ?? open[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const label = open.find((s) => s.id === session);
  return (
    <EditorDialog
      id="learning-enroll"
      eyebrow={`CareCore Learn · ${TRAINING_FORMATS[training.format]}`}
      title={training.enrollment ? "Termin wählen" : `Anmelden: ${training.title}`}
      description={training.description ?? undefined}
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          await requestJson("/api/learning/enrollments", {
            method: "POST",
            body: { trainingId: training.id, sessionId: session || null },
          });
          onSaved(session ? "Für den Termin angemeldet" : "Für die Schulung angemeldet");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Anmeldung fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel="Anmelden"
    >
      <label className="area-editor-wide">
        <span>Termin</span>
        <ScheduleSelect
          label="Termin"
          value={label ? sessionLabel(label) : NO_SESSION}
          options={[...open.map(sessionLabel), NO_SESSION]}
          onChange={(value) => setSession(open.find((s) => sessionLabel(s) === value)?.id ?? "")}
        />
      </label>
      {!open.length && (
        <p className="area-editor-wide list-hint">
          Aktuell sind keine Termine offen. Du wirst ohne Termin angemeldet und kannst später einen wählen.
        </p>
      )}
    </EditorDialog>
  );
}

function ProgressDialog({
  training,
  onClose,
  onSaved,
}: {
  training: Training;
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const [progress, setProgress] = useState(training.enrollment?.progress ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <EditorDialog
      id="learning-progress"
      eyebrow="CareCore Learn · Fortschritt"
      title={training.title}
      description="Melde, wie weit du bist. Den Abschluss erfasst du anschliessend als Nachweis."
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        try {
          await requestJson(`/api/learning/enrollments/${training.enrollment?.id}`, {
            method: "POST",
            body: { action: "progress", progress },
          });
          onSaved(`Fortschritt ${progress} % gespeichert`);
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
        <span>Fortschritt</span>
        <ScheduleSelect
          label="Fortschritt"
          value={`${progress} %`}
          options={["0 %", "25 %", "50 %", "75 %", "100 %"]}
          onChange={(value) => setProgress(Number.parseInt(value, 10))}
        />
      </label>
    </EditorDialog>
  );
}

function TrainingEditor({
  data,
  training,
  onClose,
  onSaved,
}: {
  data: LearningPayload;
  training: Training | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [title, setTitle] = useState(training?.title ?? "");
  const [description, setDescription] = useState(training?.description ?? "");
  const [category, setCategory] = useState(training?.category ?? "Pflege");
  const [format, setFormat] = useState<TrainingFormat>(training?.format ?? "presence");
  const [duration, setDuration] = useState(String(training?.durationMinutes ?? ""));
  const [mandatory, setMandatory] = useState(training?.mandatory ?? false);
  const [validFor, setValidFor] = useState(String(training?.validForMonths ?? ""));
  const [link, setLink] = useState(training?.linkUrl ?? "");
  const [roles, setRoles] = useState<string[]>(training?.requiredRoles ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <EditorDialog
      id="training-editor"
      eyebrow="CareCore Learn · Kurskatalog"
      title={training ? "Schulung bearbeiten" : "Schulung anlegen"}
      description="Pflichtschulungen erscheinen im Kompetenzprofil der betroffenen Rollen; mit Gültigkeit werden Auffrischungen automatisch fällig."
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          const body = {
            title,
            description,
            category,
            format,
            durationMinutes: duration ? Number(duration) : null,
            mandatory,
            validForMonths: validFor ? Number(validFor) : null,
            linkUrl: link,
            requiredRoles: mandatory ? roles : [],
          };
          if (training)
            await requestJson(`/api/learning/trainings/${training.id}`, {
              method: "POST",
              body: { action: "update", ...body },
            });
          else await requestJson("/api/learning/trainings", { method: "POST", body });
          onSaved(training ? "Schulung gespeichert" : `Schulung „${title}“ angelegt`);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel={training ? "Speichern" : "Anlegen"}
    >
      <label className="area-editor-wide">
        <span>Titel</span>
        <input value={title} maxLength={220} required autoFocus onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Kategorie</span>
        <ScheduleSelect label="Kategorie" value={category} options={[...TRAINING_CATEGORIES]} onChange={setCategory} />
      </label>
      <label>
        <span>Format</span>
        <ScheduleSelect
          label="Format"
          value={TRAINING_FORMATS[format]}
          options={Object.values(TRAINING_FORMATS)}
          onChange={(value) =>
            setFormat(
              (Object.keys(TRAINING_FORMATS) as TrainingFormat[]).find((k) => TRAINING_FORMATS[k] === value) ??
                "presence",
            )
          }
        />
      </label>
      <label>
        <span>Dauer (Minuten)</span>
        <input
          type="number"
          min={5}
          max={2400}
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </label>
      <label>
        <span>Gültigkeit (Monate, leer = unbefristet)</span>
        <input type="number" min={1} max={120} value={validFor} onChange={(event) => setValidFor(event.target.value)} />
      </label>
      {format === "elearning" && (
        <label className="area-editor-wide">
          <span>Kurslink</span>
          <input
            value={link}
            maxLength={1000}
            placeholder="https://…"
            onChange={(event) => setLink(event.target.value)}
          />
        </label>
      )}
      <label className="area-editor-wide">
        <span>Beschreibung</span>
        <textarea
          rows={3}
          maxLength={5000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <fieldset className="area-editor-wide duty-assignment-options">
        <legend>Pflichtschulung</legend>
        <div className="area-service-options">
          <label className={mandatory ? "selected" : ""}>
            <input type="checkbox" checked={mandatory} onChange={(event) => setMandatory(event.target.checked)} />
            <span>Pflichtnachweis</span>
          </label>
          {mandatory &&
            data.roles.map((role) => (
              <label key={role.key} className={roles.includes(role.key) ? "selected" : ""}>
                <input
                  type="checkbox"
                  checked={roles.includes(role.key)}
                  onChange={() =>
                    setRoles((current) =>
                      current.includes(role.key) ? current.filter((r) => r !== role.key) : [...current, role.key],
                    )
                  }
                />
                <span>{role.name}</span>
              </label>
            ))}
        </div>
        {mandatory && <p className="list-hint">Keine Rolle gewählt = gilt für alle Mitarbeitenden.</p>}
      </fieldset>
    </EditorDialog>
  );
}

function SessionDialog({
  data,
  training,
  onClose,
  onSaved,
}: {
  data: LearningPayload;
  training: Training;
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const [date, setDate] = useState(data.today);
  const [start, setStart] = useState("13:30");
  const [end, setEnd] = useState("16:30");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("12");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <EditorDialog
      id="training-session"
      eyebrow="CareCore Learn · Termine"
      title={`Termin für „${training.title}“`}
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          await requestJson(`/api/learning/trainings/${training.id}`, {
            method: "POST",
            body: { action: "session", date, start, end, location, capacity: capacity ? Number(capacity) : null },
          });
          onSaved("Termin hinzugefügt");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel="Termin hinzufügen"
    >
      <label>
        <span>Datum</span>
        <ScheduleDatePicker label="Datum" value={date} onChange={setDate} />
      </label>
      <label>
        <span>Plätze</span>
        <input type="number" min={1} max={500} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
      </label>
      <label>
        <span>Beginn</span>
        <input type="time" value={start} required onChange={(event) => setStart(event.target.value)} />
      </label>
      <label>
        <span>Ende</span>
        <input type="time" value={end} required onChange={(event) => setEnd(event.target.value)} />
      </label>
      <label className="area-editor-wide">
        <span>Ort</span>
        <input
          value={location}
          maxLength={180}
          placeholder="z. B. Schulungsraum EG"
          onChange={(event) => setLocation(event.target.value)}
        />
      </label>
    </EditorDialog>
  );
}

function AssignDialog({
  data,
  training,
  onClose,
  onSaved,
}: {
  data: LearningPayload;
  training: Training;
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [dueOn, setDueOn] = useState(data.today);
  const [withDue, setWithDue] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <EditorDialog
      id="training-assign"
      eyebrow="CareCore Learn · Zuweisung"
      title={`„${training.title}“ zuweisen`}
      description="Die Personen werden benachrichtigt und sehen die Schulung in ihrem Lernplan."
      onClose={onClose}
      onSubmit={async () => {
        setSaving(true);
        setError("");
        try {
          const result = await requestJson<{ assigned: number }>(`/api/learning/trainings/${training.id}`, {
            method: "POST",
            body: { action: "assign", userIds: selected, dueOn: withDue ? dueOn : null },
          });
          onSaved(`${result.assigned} ${result.assigned === 1 ? "Person" : "Personen"} zugewiesen`);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
          setSaving(false);
        }
      }}
      saving={saving}
      error={error}
      submitLabel="Zuweisen"
    >
      <fieldset className="area-editor-wide duty-assignment-options">
        <legend>Personen</legend>
        <div className="area-service-options">
          {data.people.map((person) => (
            <label key={person.id} className={selected.includes(person.id) ? "selected" : ""}>
              <input
                type="checkbox"
                checked={selected.includes(person.id)}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id],
                  )
                }
              />
              <span>{person.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        <span>Frist</span>
        <ScheduleDatePicker label="Frist" value={dueOn} onChange={setDueOn} />
      </label>
      <fieldset className="duty-assignment-options">
        <legend>Frist</legend>
        <div className="area-service-options">
          <label className={withDue ? "selected" : ""}>
            <input type="checkbox" checked={withDue} onChange={(event) => setWithDue(event.target.checked)} />
            <span>Mit Frist</span>
          </label>
        </div>
      </fieldset>
    </EditorDialog>
  );
}

type Dialog =
  | { kind: "evidence"; trainingId: string | null; userId: string | null }
  | { kind: "enroll" | "progress" | "session" | "assign" | "archive"; training: Training }
  | { kind: "training"; training: Training | null };

function LearningView({
  compliance,
  showToast,
  dialog,
  setDialog,
  onData,
  searchRef,
}: {
  compliance: boolean;
  showToast: ShowToast;
  dialog: Dialog | null;
  setDialog: (dialog: Dialog | null) => void;
  onData: (data: LearningPayload | undefined) => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [person, setPerson] = useState(ME);
  const [filter, setFilter] = useState("Alle");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [now] = useState(() => Date.now());
  const learning = useApiData<LearningPayload>(
    `/api/learning${compliance && person !== ME ? `?userId=${person === ALL_PEOPLE ? "all" : person}` : ""}`,
  );
  const { reload } = learning;
  const data = learning.data;
  useEffect(() => onData(data), [data, onData]);
  const today = data?.today ?? "";
  const needle = query.trim().toLocaleLowerCase("de-CH");
  const done = (message: string) => {
    setDialog(null);
    showToast(message);
    reload();
  };
  const run = async (url: string, body: unknown, message: string) => {
    try {
      await requestJson(url, { method: "POST", body });
      showToast(message);
      reload();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    }
  };

  // --- Meine Schulungen ---
  const trainings = data?.trainings ?? [];
  const mine = trainings.filter((t) => t.enrollment);
  const active = mine.filter((t) => t.enrollment && t.enrollment.status !== "completed");
  const completedCount = mine.filter((t) => t.enrollment?.completedAt).length;
  const courseFilters = ["Alle", "Meine Kurse", "Pflicht", "E-Learning", "Präsenz", "Abgeschlossen"];
  const courses = trainings.filter((t) => {
    if (filter === "Meine Kurse" && !t.enrollment) return false;
    if (filter === "Pflicht" && !t.mandatory) return false;
    if (filter === "E-Learning" && t.format !== "elearning") return false;
    if (filter === "Präsenz" && t.format !== "presence") return false;
    if (filter === "Abgeschlossen" && !t.enrollment?.completedAt) return false;
    return !needle || `${t.title} ${t.description ?? ""} ${t.category}`.toLocaleLowerCase("de-CH").includes(needle);
  });
  const focusTraining =
    trainings.find((t) => t.id === selectedId) ??
    [...active].sort((a, b) => (a.enrollment?.dueOn ?? "9999").localeCompare(b.enrollment?.dueOn ?? "9999"))[0] ??
    trainings[0] ??
    null;
  const upcoming = trainings
    .flatMap((t) =>
      t.sessions.filter((s) => Date.parse(s.startsAt) > now && (showAll || s.mine)).map((s) => ({ t, s })),
    )
    .sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt));
  const dueCourses = showAll ? [] : active.filter((t) => t.enrollment?.dueOn && !t.sessions.some((s) => s.mine));

  // --- Pflichtnachweise ---
  const rows = data?.compliance ?? [];
  const complianceFilters = ["Alle", "Offen", "Bald fällig", "Abgelaufen", "Prüfung ausstehend", "Gültig"];
  const stateFor: Record<string, ComplianceState> = {
    Offen: "missing",
    "Bald fällig": "due_soon",
    Abgelaufen: "expired",
    "Prüfung ausstehend": "pending",
    Gültig: "valid",
  };
  const register = rows
    .filter((row) => filter === "Alle" || !compliance || row.state === stateFor[filter])
    .filter(
      (row) => !needle || `${row.title} ${row.userName} ${row.category}`.toLocaleLowerCase("de-CH").includes(needle),
    )
    .sort(
      (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) || a.title.localeCompare(b.title, "de-CH"),
    );
  const focusRow = rows.find((row) => row.key === selectedId) ?? register[0] ?? null;
  const valid = rows.filter((row) => row.state === "valid" || row.state === "due_soon").length;
  const deadlines = rows
    .filter((row) => showAll || row.state !== "valid")
    .filter((row) => row.deadline || row.state === "missing")
    .sort((a, b) => (a.deadline ?? "0000").localeCompare(b.deadline ?? "0000"));
  const team = compliance && person !== ME;

  const percent = compliance
    ? rows.length
      ? Math.round((valid / rows.length) * 100)
      : 100
    : mine.length
      ? Math.round((completedCount / mine.length) * 100)
      : 0;

  return (
    <>
      <PersonalSummary
        items={
          compliance
            ? [
                { icon: "docs", value: String(valid), label: "Nachweise gültig" },
                {
                  icon: "alert",
                  value: String(rows.filter((r) => r.state === "due_soon").length),
                  label: "bald fällig",
                  tone: "attention",
                },
                {
                  icon: "alert",
                  value: String(rows.filter((r) => r.state === "missing" || r.state === "expired").length),
                  label: "offen oder abgelaufen",
                  tone: "critical",
                },
                { icon: "check", value: data ? `${percent} %` : "–", label: "Vollständigkeit" },
              ]
            : [
                { icon: "learn", value: String(active.length), label: "Kurse aktiv" },
                {
                  icon: "check",
                  value: active.length
                    ? `${Math.round(active.reduce((s, t) => s + (t.enrollment?.progress ?? 0), 0) / active.length)} %`
                    : "–",
                  label: "Fortschritt aktiver Kurse",
                  tone: "info",
                },
                {
                  icon: "calendar",
                  value: String(
                    trainings.flatMap((t) => t.sessions).filter((s) => s.mine && Date.parse(s.startsAt) > now).length,
                  ),
                  label: "Termine geplant",
                  tone: "attention",
                },
                { icon: "docs", value: String(completedCount), label: "Nachweise" },
              ]
        }
      />
      {learning.error && <LoadError message={learning.error} onRetry={reload} />}
      <div className={`learning-layout ${compliance ? "learning-compliance-layout" : "learning-personal-layout"}`}>
        <section className="card learning-progress-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">{compliance ? (team ? "Team" : "Kompetenzprofil") : "Persönlicher Lernpfad"}</p>
              <h2 className="card-title">{compliance ? "Pflichtnachweise" : "Dein Fortschritt"}</h2>
              <p className="card-subtitle">
                {compliance
                  ? `${valid} von ${rows.length} Nachweisen gültig`
                  : `${completedCount} von ${mine.length} Lernzielen abgeschlossen`}
              </p>
            </div>
            <span className="learning-progress-value">{data ? `${percent} %` : "–"}</span>
          </div>
          <div className="learning-progress-bar">
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="learning-progress-meta">
            <span>{compliance ? "Sicherheitsstandard Pflege" : `Lernjahr ${today.slice(0, 4)}`}</span>
            <strong>
              {compliance
                ? `${rows.filter((r) => r.state === "due_soon").length} bald fällig`
                : `noch ${active.length} ${active.length === 1 ? "Kurs" : "Kurse"} offen`}
            </strong>
          </div>
          {compliance && focusRow && (
            <div className="learning-focus">
              <span className={`governance-focus-icon ${COMPLIANCE_STATES[focusRow.state].tone}`}>
                <ModuleIcon name={STATE_ICON[focusRow.state]} />
              </span>
              <div>
                <p className="eyebrow">{team ? focusRow.userName : "Nächster Nachweis"}</p>
                <h3>{focusRow.title}</h3>
                <p>{complianceText(focusRow, today)}</p>
              </div>
              <div className="learning-focus-actions">
                {focusRow.enrollment?.certificateFileId && (
                  <a
                    className="quiet-button"
                    href={`/api/cloud/files/${focusRow.enrollment.certificateFileId}?preview=1`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Zertifikat
                  </a>
                )}
                {data?.canManage && focusRow.state === "pending" && focusRow.enrollment && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      void run(
                        `/api/learning/enrollments/${focusRow.enrollment!.id}`,
                        { action: "verify" },
                        "Nachweis bestätigt",
                      )
                    }
                  >
                    Bestätigen
                  </button>
                )}
                {(focusRow.userId === data?.currentUserId || data?.canManage) && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      setDialog({ kind: "evidence", trainingId: focusRow.trainingId, userId: focusRow.userId })
                    }
                  >
                    Nachweis erfassen
                  </button>
                )}
              </div>
            </div>
          )}
          {!compliance && focusTraining && (
            <FocusTraining training={focusTraining} data={data!} setDialog={setDialog} run={run} />
          )}
          {data && ((compliance && !rows.length) || (!compliance && !trainings.length)) && (
            <p className="list-hint learning-empty">
              {compliance
                ? "Für diese Auswahl sind keine Pflichtnachweise hinterlegt."
                : "Noch keine Schulungen im Katalog."}
            </p>
          )}
        </section>
        <section className="card learning-catalog-card">
          <div className="learning-catalog-header" ref={searchRef}>
            <div>
              <p className="eyebrow">{compliance ? "Nachweisregister" : "Kurskatalog"}</p>
              <h2 className="card-title">{compliance ? "Pflichtnachweise" : "Meine Schulungen"}</h2>
              <p className="card-subtitle">
                {compliance ? `${register.length} Nachweise` : `${courses.length} passende Schulungen`}
              </p>
            </div>
            <div className="learning-catalog-tools">
              {compliance && data?.canManage && (
                <ScheduleSelect
                  label="Person"
                  value={
                    person === ME || person === ALL_PEOPLE
                      ? person
                      : (data.people.find((p) => p.id === person)?.name ?? ME)
                  }
                  options={[ME, ALL_PEOPLE, ...data.people.map((p) => p.name)]}
                  onChange={(value) => {
                    setSelectedId(null);
                    setPerson(
                      value === ME || value === ALL_PEOPLE
                        ? value
                        : (data.people.find((p) => p.name === value)?.id ?? ME),
                    );
                  }}
                />
              )}
              <SearchField
                label={compliance ? "Nachweise durchsuchen" : "Kurse durchsuchen"}
                query={query}
                setQuery={setQuery}
                placeholder={compliance ? "Nachweise suchen…" : "Kurse suchen…"}
              />
            </div>
          </div>
          <div className="learning-filter-row operations-filter-buttons">
            {(compliance ? complianceFilters : courseFilters).map((item) => (
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
          <div className="learning-course-grid">
            {compliance
              ? register.map((row) => (
                  <button
                    className={`learning-course ${focusRow?.key === row.key ? "selected" : ""}`}
                    type="button"
                    key={row.key}
                    onClick={() => setSelectedId(row.key)}
                  >
                    <span className={`learning-course-icon ${COMPLIANCE_STATES[row.state].tone}`}>
                      <ModuleIcon name={STATE_ICON[row.state]} />
                    </span>
                    <span>
                      <strong>
                        {row.title}
                        {team ? ` · ${row.userName}` : ""}
                      </strong>
                      <small>{complianceText(row, today)}</small>
                    </span>
                    <span className={`status-badge ${COMPLIANCE_STATES[row.state].tone}`}>
                      {COMPLIANCE_STATES[row.state].label}
                    </span>
                    <em>
                      {row.enrollment?.completedAt
                        ? `Nachweis vom ${formatDate(row.enrollment.completedAt)}`
                        : row.category}
                      {row.enrollment?.certificateName ? " · Zertifikat" : ""}
                    </em>
                  </button>
                ))
              : courses.map((t) => {
                  const state = trainingState(t);
                  return (
                    <button
                      className={`learning-course ${focusTraining?.id === t.id ? "selected" : ""}`}
                      type="button"
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <span
                        className={`learning-course-icon ${state.tone === "critical" ? "critical" : state.tone === "stable" ? "stable" : ""}`}
                      >
                        <ModuleIcon name={CATEGORY_ICONS[t.category] ?? "learn"} />
                      </span>
                      <span>
                        <strong>{t.title}</strong>
                        <small>{t.description ?? `${t.category}${t.mandatory ? " · Pflichtschulung" : ""}`}</small>
                      </span>
                      <span className={`status-badge ${state.tone}`}>{state.label}</span>
                      <em>{trainingMeta(t, now)}</em>
                    </button>
                  );
                })}
          </div>
          {data && (compliance ? !register.length : !courses.length) && (
            <div className="resident-empty">
              <ModuleIcon name="search" />
              <strong>Nichts gefunden</strong>
              <p>Suchbegriff oder Filter anpassen.</p>
            </div>
          )}
        </section>
        <aside className="card learning-calendar-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">{compliance ? "Fristen" : "Termine"}</p>
              <h2 className="card-title">
                {compliance ? "Fällige Nachweise" : showAll ? "Alle Kurstermine" : "Deine nächsten Kurse"}
              </h2>
            </div>
            <ModuleIcon name={compliance ? "alert" : "calendar"} className="learning-calendar-icon" />
          </div>
          {compliance
            ? deadlines.slice(0, showAll ? 50 : 4).map((row) => (
                <div className="learning-session" key={row.key}>
                  <strong>{row.deadline ? row.deadline.slice(8, 10) : "–"}</strong>
                  <span>
                    <b>
                      {row.title}
                      {team ? ` · ${row.userName}` : ""}
                    </b>
                    <small>
                      {row.deadline
                        ? `${MONTHS[Number(row.deadline.slice(5, 7)) - 1]} ${row.deadline.slice(0, 4)} · `
                        : ""}
                      {COMPLIANCE_STATES[row.state].label.toLowerCase()}
                    </small>
                  </span>
                </div>
              ))
            : [
                ...upcoming.slice(0, showAll ? 50 : 4).map(({ t, s }) => (
                  <div className="learning-session" key={s.id}>
                    <strong>{zurichDay(s.startsAt).slice(8, 10)}</strong>
                    <span>
                      <b>{t.title}</b>
                      <small>
                        {MONTHS[Number(zurichDay(s.startsAt).slice(5, 7)) - 1]} · {timeInZurich(new Date(s.startsAt))}{" "}
                        Uhr
                        {s.location ? ` · ${s.location}` : ""}
                        {showAll && s.mine ? " · angemeldet" : ""}
                      </small>
                    </span>
                  </div>
                )),
                ...dueCourses.slice(0, 3).map((t) => (
                  <div className="learning-session" key={`due-${t.id}`}>
                    <strong>{t.enrollment!.dueOn!.slice(8, 10)}</strong>
                    <span>
                      <b>{t.title}</b>
                      <small>
                        {MONTHS[Number(t.enrollment!.dueOn!.slice(5, 7)) - 1]} · Frist · {TRAINING_FORMATS[t.format]}
                      </small>
                    </span>
                  </div>
                )),
              ]}
          {data && (compliance ? !deadlines.length : !upcoming.length && !dueCourses.length) && (
            <p className="list-hint learning-empty">
              {compliance
                ? "Keine offenen Fristen – alles aktuell."
                : showAll
                  ? "Keine Kurstermine geplant."
                  : "Du bist für keinen Termin angemeldet."}
            </p>
          )}
          <button className="quiet-button" type="button" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Nur meine" : compliance ? "Alle Fristen" : "Alle Termine"} <ModuleIcon name="chevron" />
          </button>
        </aside>
      </div>
      {data && dialog?.kind === "evidence" && (
        <EvidenceDialog
          data={data}
          trainingId={dialog.trainingId}
          userId={dialog.userId}
          onClose={() => setDialog(null)}
          onSaved={done}
        />
      )}
      {dialog?.kind === "enroll" && (
        <EnrollDialog training={dialog.training} onClose={() => setDialog(null)} onSaved={done} />
      )}
      {dialog?.kind === "progress" && (
        <ProgressDialog training={dialog.training} onClose={() => setDialog(null)} onSaved={done} />
      )}
      {data && dialog?.kind === "training" && (
        <TrainingEditor data={data} training={dialog.training} onClose={() => setDialog(null)} onSaved={done} />
      )}
      {data && dialog?.kind === "session" && (
        <SessionDialog data={data} training={dialog.training} onClose={() => setDialog(null)} onSaved={done} />
      )}
      {data && dialog?.kind === "assign" && (
        <AssignDialog data={data} training={dialog.training} onClose={() => setDialog(null)} onSaved={done} />
      )}
      {dialog?.kind === "archive" && (
        <EditorDialog
          id="training-archive"
          eyebrow="CareCore Learn · Kurskatalog"
          title="Schulung archivieren"
          description={`„${dialog.training.title}“ wird aus dem Katalog und den Pflichtnachweisen entfernt. Bestehende Nachweise bleiben im Protokoll erhalten.`}
          onClose={() => setDialog(null)}
          onSubmit={async () => {
            await run(`/api/learning/trainings/${dialog.training.id}`, { action: "archive" }, "Schulung archiviert");
            setDialog(null);
          }}
          saving={false}
          error=""
          submitLabel="Archivieren"
          danger
        >
          {null}
        </EditorDialog>
      )}
    </>
  );
}

function FocusTraining({
  training,
  data,
  setDialog,
  run,
}: {
  training: Training;
  data: LearningPayload;
  setDialog: (dialog: Dialog) => void;
  run: (url: string, body: unknown, message: string) => Promise<void>;
}) {
  const e = training.enrollment;
  const activeEnrollment = e && e.status !== "completed";
  const booked = training.sessions.find((s) => s.mine);
  const state = trainingState(training);
  return (
    <>
      <div className="learning-focus">
        <span
          className={`governance-focus-icon ${state.tone === "critical" ? "critical" : state.tone === "stable" ? "stable" : ""}`}
        >
          <ModuleIcon name={CATEGORY_ICONS[training.category] ?? "learn"} />
        </span>
        <div>
          <p className="eyebrow">
            {activeEnrollment ? "Als Nächstes" : training.enrollment?.completedAt ? "Abgeschlossen" : "Im Katalog"} ·{" "}
            {state.label}
          </p>
          <h3>{training.title}</h3>
          <p>
            {booked
              ? `Dein Termin: ${sessionLabel(booked)}`
              : e?.dueOn && activeEnrollment
                ? `Frist ${formatDate(e.dueOn)}${e.assignedByName ? ` · zugewiesen von ${e.assignedByName}` : ""}`
                : e?.completedAt
                  ? `Abgeschlossen am ${formatDate(e.completedAt)}${e.validUntil ? ` · gültig bis ${formatDate(e.validUntil)}` : ""}`
                  : (training.description ?? trainingMeta(training, Date.parse(data.today)))}
          </p>
        </div>
        <div className="learning-focus-actions">
          {training.linkUrl && activeEnrollment && (
            <a className="quiet-button" href={training.linkUrl} target="_blank" rel="noreferrer">
              Kurs öffnen
            </a>
          )}
          {activeEnrollment && training.format === "elearning" && (
            <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "progress", training })}>
              Fortschritt
            </button>
          )}
          {activeEnrollment && !e?.assignedByName && (
            <button
              className="quiet-button"
              type="button"
              onClick={() => void run(`/api/learning/enrollments/${e!.id}`, { action: "withdraw" }, "Abgemeldet")}
            >
              Abmelden
            </button>
          )}
          {activeEnrollment && training.format !== "elearning" && training.sessions.length > 0 && (
            <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "enroll", training })}>
              {booked ? "Termin ändern" : "Termin wählen"}
            </button>
          )}
          {activeEnrollment ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setDialog({ kind: "evidence", trainingId: training.id, userId: null })}
            >
              Abschluss melden
            </button>
          ) : (
            <button className="secondary-button" type="button" onClick={() => setDialog({ kind: "enroll", training })}>
              {e?.completedAt ? "Auffrischen" : "Anmelden"}
            </button>
          )}
        </div>
      </div>
      {data.canManage && (
        <div className="learning-manage">
          <span>
            Leitung · {training.enrolledCount} {training.enrolledCount === 1 ? "Anmeldung" : "Anmeldungen"}
          </span>
          <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "assign", training })}>
            Zuweisen
          </button>
          <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "session", training })}>
            Termin hinzufügen
          </button>
          <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "training", training })}>
            Bearbeiten
          </button>
          <button className="quiet-button" type="button" onClick={() => setDialog({ kind: "archive", training })}>
            Archivieren
          </button>
          {training.sessions
            .filter((s) => Date.parse(s.startsAt) > Date.parse(data.today))
            .map((s) => (
              <span className="learning-manage-session" key={s.id}>
                {sessionLabel(s)}
                <button type="button" onClick={() => void run(`/api/learning/sessions/${s.id}`, {}, "Termin abgesagt")}>
                  Absagen
                </button>
              </span>
            ))}
        </div>
      )}
    </>
  );
}

export default function LearningWorkspace({ compliance }: { compliance: boolean }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [canManage, setCanManage] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const onData = useCallback((data: LearningPayload | undefined) => setCanManage(Boolean(data?.canManage)), []);
  return (
    <PersonalFrame
      module="learn"
      child={compliance ? "Pflichtnachweise" : "Meine Schulungen"}
      view={compliance ? "compliance" : "learning"}
      eyebrow="CareCore Learn"
      title={compliance ? "Pflichtnachweise" : "Meine Schulungen"}
      description={
        compliance
          ? "Kompetenzen und Nachweise für einen sicheren Pflegealltag."
          : "Dein Lernplan, Fortschritt und anstehende Weiterbildungen."
      }
      action={
        compliance
          ? {
              label: "Nachweis erfassen",
              onClick: () => setDialog({ kind: "evidence", trainingId: null, userId: null }),
            }
          : canManage
            ? { label: "Schulung anlegen", onClick: () => setDialog({ kind: "training", training: null }) }
            : {
                label: "Schulung suchen",
                icon: "search",
                onClick: () => {
                  searchRef.current?.scrollIntoView({ block: "center" });
                  searchRef.current?.querySelector("input")?.focus();
                },
              }
      }
    >
      {(showToast) => (
        <LearningView
          compliance={compliance}
          showToast={showToast}
          dialog={dialog}
          setDialog={setDialog}
          onData={onData}
          searchRef={searchRef}
        />
      )}
    </PersonalFrame>
  );
}

"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ModulePageShell from "@/app/components/module-page-shell";
import { EditorDialog } from "@/app/components/workspace-ui";
import type { SettingsPayload } from "@/lib/roster/settings-service";
import { formatDate, formatHours, zurichHolidays } from "@/lib/roster/time";
import {
  ABSENCE_LABELS,
  CATEGORY_LABELS,
  EXCLUSION_LABELS,
  WEEKDAY_SHORT,
  type AbsenceKind,
  type ExclusionCategory,
  type ShiftCategory,
  type ShiftTypeInfo,
} from "@/lib/roster/types";
import { rosterRequest, useRosterData } from "./roster-api";
import { CareOptionSelect } from "@/app/components/care-form-controls";

const TABS = ["Diensttypen", "Mindestbesetzung", "Regelwerk", "Feiertage", "Personal"] as const;
type Tab = (typeof TABS)[number];
type ShowToast = (message: string) => void;

export default function SettingsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (TABS.find((t) => t === params.get("bereich")) ?? "Diensttypen") as Tab;
  const unitParam = params.get("einheit");
  const { data, error, reload } = useRosterData<SettingsPayload>(
    `/api/dienstplan/settings${unitParam ? `?einheit=${unitParam}` : ""}`,
  );
  const go = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  return (
    <ModulePageShell pageClass="roster-page">
      {(showToast) => (
        <main className="workspace roster-workspace">
          <header className="page-heading roster-heading">
            <div className="heading-copy">
              <p className="eyebrow">Leitung · Dienstplan</p>
              <h1>Einstellungen</h1>
              <p>Diensttypen, Mindestbesetzung, Regelwerk, Feiertage und Personal. Jede Änderung wird protokolliert.</p>
            </div>
          </header>
          <section className="roster-toolbar">
            <div className="roster-settings-tabs" role="tablist" aria-label="Bereiche">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={t === tab}
                  className={t === tab ? "active" : ""}
                  onClick={() => go({ bereich: t })}
                >
                  {t}
                </button>
              ))}
            </div>
            {data && data.units.length > 1 && (
              <CareOptionSelect
                label="Wohnbereich"
                value={data.unitId ?? ""}
                onChange={(value) => go({ einheit: value })}
                options={[...data.units.map((unit) => ({ value: String(unit.id), label: String(unit.name) }))]}
              />
            )}
          </section>
          {error && !data && (
            <section className="critical-alert" role="alert">
              <div>
                <strong>Einstellungen konnten nicht geladen werden</strong>
                <p>{error.message}</p>
              </div>
              <button className="secondary-button" type="button" onClick={reload}>
                Erneut laden
              </button>
            </section>
          )}
          {!data && !error && (
            <div className="roster-skeleton">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} />
              ))}
            </div>
          )}
          {data && tab === "Diensttypen" && <ShiftTypesTab data={data} reload={reload} showToast={showToast} />}
          {data && tab === "Mindestbesetzung" && <StaffingTab data={data} reload={reload} showToast={showToast} />}
          {data && tab === "Regelwerk" && (
            <RulesTab key={data.unitId ?? "org"} data={data} reload={reload} showToast={showToast} />
          )}
          {data && tab === "Feiertage" && <HolidaysTab data={data} reload={reload} showToast={showToast} />}
          {data && tab === "Personal" && <PeopleTab data={data} reload={reload} showToast={showToast} />}
        </main>
      )}
    </ModulePageShell>
  );
}

type TabProps = { data: SettingsPayload; reload: () => void; showToast: ShowToast };

async function act(run: () => Promise<unknown>, done: string, reload: () => void, showToast: ShowToast) {
  try {
    await run();
    showToast(done);
    reload();
  } catch (cause) {
    showToast(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
  }
}

// --- Diensttypen ---------------------------------------------------------------------------------

function ShiftTypesTab({ data, reload, showToast }: TabProps) {
  const [editing, setEditing] = useState<(ShiftTypeInfo & { used?: boolean }) | "new" | null>(null);
  const qualification = (id: string) => data.qualifications.find((q) => q.id === id)?.code ?? "?";
  return (
    <section className="card roster-card">
      <div className="roster-section-head">
        <div>
          <h2>Diensttypen</h2>
          <p>
            Diensttypen mit Diensten werden deaktiviert statt gelöscht. Farben erscheinen immer zusammen mit dem Kürzel.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={() => setEditing("new")}>
          Diensttyp hinzufügen
        </button>
      </div>
      <div className="roster-table-wrap">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Kürzel</th>
              <th>Name</th>
              <th>Kategorie</th>
              <th>Zeiten</th>
              <th className="number">Pause</th>
              <th className="number">Anrechnung</th>
              <th>Qualifikation</th>
              <th>Gültig für</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.shiftTypes.map((type) => (
              <tr key={type.id}>
                <td>
                  <span className="roster-type-dot" style={{ background: type.color }} /> <strong>{type.code}</strong>
                </td>
                <td>{type.name}</td>
                <td>
                  {CATEGORY_LABELS[type.category]}
                  {type.absenceKind ? ` · ${ABSENCE_LABELS[type.absenceKind]}` : ""}
                </td>
                <td>
                  {type.startTime}–{type.endTime}
                  {type.endTime <= type.startTime ? " (+1)" : ""}
                </td>
                <td className="number">{type.breakMinutes} Min</td>
                <td className="number">
                  {type.category === "ABSENCE"
                    ? type.creditsTarget
                      ? "Tagessoll"
                      : "keine"
                    : `${Math.round(type.workTimeFactor * 100)} %`}
                </td>
                <td>{type.requiredQualificationIds.map(qualification).join(", ") || "–"}</td>
                <td>
                  {type.careUnitId
                    ? (data.units.find((u) => u.id === type.careUnitId)?.name ?? "Wohnbereich")
                    : "Organisation"}
                </td>
                <td>
                  <span className={`roster-pill ${type.active ? "ok" : ""}`}>{type.active ? "aktiv" : "inaktiv"}</span>
                </td>
                <td>
                  <div className="roster-row-actions">
                    <button className="secondary-button" type="button" onClick={() => setEditing(type)}>
                      Bearbeiten
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        void act(
                          () =>
                            rosterRequest(`/api/dienstplan/settings/shift-types/${type.id}`, {
                              method: "PATCH",
                              body: { active: !type.active },
                            }),
                          type.active ? "Diensttyp deaktiviert" : "Diensttyp aktiviert",
                          reload,
                          showToast,
                        )
                      }
                    >
                      {type.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                    {!type.used && (
                      <button
                        className="appointment-danger-button"
                        type="button"
                        onClick={() =>
                          window.confirm(`Diensttyp „${type.name}“ löschen?`) &&
                          void act(
                            () =>
                              rosterRequest(`/api/dienstplan/settings/shift-types/${type.id}`, { method: "DELETE" }),
                            "Diensttyp gelöscht",
                            reload,
                            showToast,
                          )
                        }
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <ShiftTypeEditor
          data={data}
          type={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            showToast(message);
            reload();
          }}
        />
      )}
    </section>
  );
}

function ShiftTypeEditor({
  data,
  type,
  onClose,
  onSaved,
}: {
  data: SettingsPayload;
  type: ShiftTypeInfo | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState({
    name: type?.name ?? "",
    code: type?.code ?? "",
    category: (type?.category ?? "WORK") as ShiftCategory,
    absenceKind: (type?.absenceKind ?? "VACATION") as AbsenceKind,
    startTime: type?.startTime ?? "07:00",
    endTime: type?.endTime ?? "15:30",
    breakMinutes: type?.breakMinutes ?? 30,
    color: type?.color ?? "#2563eb",
    workTimeFactor: type?.workTimeFactor ?? 1,
    creditsTarget: type?.creditsTarget ?? false,
    requiredQualificationIds: type?.requiredQualificationIds ?? [],
    sortOrder: type?.sortOrder ?? 100,
    scope: type ? (type.careUnitId ?? "org") : data.isAdmin ? "org" : (data.unitId ?? "org"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const body = { ...form, unitId: form.scope === "org" ? null : form.scope };
      if (type) await rosterRequest(`/api/dienstplan/settings/shift-types/${type.id}`, { method: "PATCH", body });
      else await rosterRequest("/api/dienstplan/settings/shift-types", { method: "POST", body });
      onSaved(type ? "Diensttyp gespeichert" : "Diensttyp angelegt");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  };
  return (
    <EditorDialog
      id="roster-type"
      eyebrow="Dienstplan · Einstellungen"
      title={type ? `${type.code} · ${type.name}` : "Diensttyp hinzufügen"}
      description="Endet ein Dienst vor oder zu seiner Beginnzeit, endet er am Folgetag (z. B. Nachtdienst)."
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
      submitLabel="Speichern"
    >
      <label>
        <span>Name</span>
        <input value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} required />
      </label>
      <label>
        <span>Kürzel (max. 8)</span>
        <input value={form.code} maxLength={8} onChange={(e) => set("code", e.target.value.toUpperCase())} required />
      </label>
      <label>
        <span>Kategorie</span>
        <CareOptionSelect
          label="Kategorie"
          value={form.category}
          onChange={(value) => set("category", value as ShiftCategory)}
          options={[
            ...(Object.keys(CATEGORY_LABELS) as ShiftCategory[]).map((key) => ({
              value: String(key),
              label: String(CATEGORY_LABELS[key]),
            })),
          ]}
        />
      </label>
      {form.category === "ABSENCE" ? (
        <label>
          <span>Art der Abwesenheit</span>
          <CareOptionSelect
            label="Art der Abwesenheit"
            value={form.absenceKind}
            onChange={(value) => set("absenceKind", value as AbsenceKind)}
            options={[
              ...(Object.keys(ABSENCE_LABELS) as AbsenceKind[]).map((key) => ({
                value: String(key),
                label: String(ABSENCE_LABELS[key]),
              })),
            ]}
          />
        </label>
      ) : (
        <label>
          <span>Anrechnung auf die Arbeitszeit (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(form.workTimeFactor * 100)}
            onChange={(e) => set("workTimeFactor", Number(e.target.value) / 100)}
          />
        </label>
      )}
      <label>
        <span>Beginn</span>
        <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
      </label>
      <label>
        <span>Ende</span>
        <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
      </label>
      <label>
        <span>Pause (Minuten)</span>
        <input
          type="number"
          min={0}
          max={240}
          value={form.breakMinutes}
          onChange={(e) => set("breakMinutes", Number(e.target.value))}
        />
      </label>
      <label>
        <span>Farbe</span>
        <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} />
      </label>
      {form.category === "ABSENCE" && (
        <label className="area-editor-wide roster-checkbox">
          <input
            type="checkbox"
            checked={form.creditsTarget}
            onChange={(e) => set("creditsTarget", e.target.checked)}
          />
          <span>Wird mit dem Tagessoll auf die Sollzeit angerechnet (z. B. Urlaub, Krankheit)</span>
        </label>
      )}
      {form.category !== "ABSENCE" && (
        <fieldset className="area-editor-wide">
          <legend>Erforderliche Qualifikation</legend>
          <div className="roster-chips-select">
            {data.qualifications.map((q) => (
              <label className="roster-checkbox" key={q.id}>
                <input
                  type="checkbox"
                  checked={form.requiredQualificationIds.includes(q.id)}
                  onChange={(e) =>
                    set(
                      "requiredQualificationIds",
                      e.target.checked
                        ? [...form.requiredQualificationIds, q.id]
                        : form.requiredQualificationIds.filter((id) => id !== q.id),
                    )
                  }
                />
                <span>{q.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!type && (
        <label>
          <span>Gültig für</span>
          <CareOptionSelect
            label="Gültig für"
            value={form.scope}
            onChange={(value) => set("scope", value)}
            options={[
              ...(data.isAdmin ? [{ value: "org", label: "Ganze Organisation" }] : []),
              ...data.units.map((unit) => ({ value: String(unit.id), label: `Nur ${unit.name}` })),
            ]}
          />
        </label>
      )}
      <label>
        <span>Reihenfolge</span>
        <input
          type="number"
          min={0}
          max={1000}
          value={form.sortOrder}
          onChange={(e) => set("sortOrder", Number(e.target.value))}
        />
      </label>
    </EditorDialog>
  );
}

// --- Mindestbesetzung ----------------------------------------------------------------------------

function StaffingTab({ data, reload, showToast }: TabProps) {
  const types = data.shiftTypes.filter((t) => t.category !== "ABSENCE" && t.active);
  const [editing, setEditing] = useState<ShiftTypeInfo | null>(null);
  const [exception, setException] = useState({ date: "", shiftTypeId: types[0]?.id ?? "", minCount: 1, maxCount: "" });
  const cell = (typeId: string, weekday: number) =>
    data.staffing.find((s) => s.shiftTypeId === typeId && s.weekday === weekday);
  const exceptions = data.staffing.filter((s) => s.date);
  if (!data.unitId) return <p className="roster-muted">Kein Wohnbereich gewählt.</p>;
  return (
    <>
      <section className="card roster-card">
        <div className="roster-section-head">
          <div>
            <h2>Mindestbesetzung je Wochentag</h2>
            <p>
              Mindestens / höchstens Personen je Diensttyp. Unterbesetzung ist im Entwurf eine Warnung und muss beim
              Veröffentlichen bestätigt werden.
            </p>
          </div>
        </div>
        <div className="roster-table-wrap">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Diensttyp</th>
                {WEEKDAY_SHORT.map((day) => (
                  <th key={day} className="number">
                    {day}
                  </th>
                ))}
                <th>Fachpersonen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {types.map((type) => {
                const qualified = data.staffing.find((s) => s.shiftTypeId === type.id && s.qualificationId && !s.date);
                return (
                  <tr key={type.id}>
                    <td>
                      <span className="roster-type-dot" style={{ background: type.color }} />{" "}
                      <strong>{type.code}</strong> {type.name}
                    </td>
                    {WEEKDAY_SHORT.map((day, index) => {
                      const value = cell(type.id, index + 1);
                      return (
                        <td key={day} className="number">
                          {value ? `${value.minCount}${value.maxCount !== null ? `–${value.maxCount}` : "+"}` : "–"}
                        </td>
                      );
                    })}
                    <td>
                      {qualified
                        ? `mind. ${qualified.minQualified} ${data.qualifications.find((q) => q.id === qualified.qualificationId)?.code ?? ""}`
                        : "–"}
                    </td>
                    <td>
                      <button className="secondary-button" type="button" onClick={() => setEditing(type)}>
                        Bearbeiten
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card roster-card">
        <div className="roster-section-head">
          <div>
            <h2>Ausnahmen für einzelne Tage</h2>
            <p>Ein Datum überschreibt die Vorgabe des Wochentags (z. B. Festtag, Ausflug).</p>
          </div>
        </div>
        <div className="roster-form-grid">
          <label>
            Datum
            <input
              type="date"
              value={exception.date}
              onChange={(e) => setException({ ...exception, date: e.target.value })}
            />
          </label>
          <label>
            Diensttyp
            <CareOptionSelect
              label="Diensttyp"
              value={exception.shiftTypeId}
              onChange={(value) => setException({ ...exception, shiftTypeId: value })}
              options={[...types.map((t) => ({ value: String(t.id), label: `${t.code} · ${t.name}` }))]}
            />
          </label>
          <label>
            Mindestens
            <input
              type="number"
              min={0}
              max={50}
              value={exception.minCount}
              onChange={(e) => setException({ ...exception, minCount: Number(e.target.value) })}
            />
          </label>
          <label>
            Höchstens (optional)
            <input
              type="number"
              min={0}
              max={50}
              value={exception.maxCount}
              onChange={(e) => setException({ ...exception, maxCount: e.target.value })}
            />
          </label>
        </div>
        <div className="roster-form-actions">
          <button
            className="primary-button"
            type="button"
            disabled={!exception.date}
            onClick={() =>
              void act(
                () =>
                  rosterRequest("/api/dienstplan/settings/staffing", {
                    method: "POST",
                    body: {
                      unitId: data.unitId,
                      shiftTypeId: exception.shiftTypeId,
                      date: exception.date,
                      minCount: exception.minCount,
                      maxCount: exception.maxCount || null,
                    },
                  }),
                "Ausnahme gespeichert",
                reload,
                showToast,
              )
            }
          >
            Ausnahme speichern
          </button>
        </div>
        {exceptions.length > 0 && (
          <div className="roster-table-wrap">
            <table className="roster-table">
              <tbody>
                {exceptions.map((s) => (
                  <tr key={s.id}>
                    <td>{formatDate(s.date!, true)}</td>
                    <td>{types.find((t) => t.id === s.shiftTypeId)?.name ?? "Diensttyp"}</td>
                    <td className="number">
                      {s.minCount}
                      {s.maxCount !== null ? `–${s.maxCount}` : "+"}
                    </td>
                    <td>
                      <button
                        className="appointment-danger-button"
                        type="button"
                        onClick={() =>
                          void act(
                            () => rosterRequest(`/api/dienstplan/settings/staffing/${s.id}`, { method: "DELETE" }),
                            "Ausnahme gelöscht",
                            reload,
                            showToast,
                          )
                        }
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editing && (
        <StaffingEditor
          data={data}
          type={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            showToast("Mindestbesetzung gespeichert");
            reload();
          }}
        />
      )}
    </>
  );
}

function StaffingEditor({
  data,
  type,
  onClose,
  onSaved,
}: {
  data: SettingsPayload;
  type: ShiftTypeInfo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = (weekday: number) => data.staffing.find((s) => s.shiftTypeId === type.id && s.weekday === weekday);
  const qualified = data.staffing.find((s) => s.shiftTypeId === type.id && s.qualificationId && !s.date);
  const [rows, setRows] = useState(
    WEEKDAY_SHORT.map((_, index) => ({
      min: existing(index + 1)?.minCount?.toString() ?? "",
      max: existing(index + 1)?.maxCount?.toString() ?? "",
    })),
  );
  const [qualificationId, setQualificationId] = useState(qualified?.qualificationId ?? "");
  const [minQualified, setMinQualified] = useState(qualified?.minQualified ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      for (const [index, row] of rows.entries()) {
        const current = existing(index + 1);
        if (row.min === "") {
          if (current) await rosterRequest(`/api/dienstplan/settings/staffing/${current.id}`, { method: "DELETE" });
          continue;
        }
        await rosterRequest("/api/dienstplan/settings/staffing", {
          method: "POST",
          body: {
            unitId: data.unitId,
            shiftTypeId: type.id,
            weekday: index + 1,
            minCount: Number(row.min),
            maxCount: row.max === "" ? null : Number(row.max),
            qualificationId: qualificationId || null,
            minQualified: qualificationId ? minQualified : null,
          },
        });
      }
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  };
  return (
    <EditorDialog
      id="roster-staffing"
      eyebrow="Dienstplan · Mindestbesetzung"
      title={`${type.code} · ${type.name}`}
      description="Leer lassen = keine Vorgabe für diesen Wochentag."
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
      submitLabel="Speichern"
    >
      {WEEKDAY_SHORT.map((day, index) => (
        <fieldset key={day}>
          <legend>{day}</legend>
          <div className="roster-row-actions">
            <input
              className="roster-inline-input"
              type="number"
              min={0}
              max={50}
              placeholder="min"
              aria-label={`${day} mindestens`}
              value={rows[index].min}
              onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, min: e.target.value } : r)))}
            />
            <input
              className="roster-inline-input"
              type="number"
              min={0}
              max={50}
              placeholder="max"
              aria-label={`${day} höchstens`}
              value={rows[index].max}
              onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, max: e.target.value } : r)))}
            />
          </div>
        </fieldset>
      ))}
      <label>
        <span>Mindestens qualifiziert (optional)</span>
        <CareOptionSelect
          label="Mindestens qualifiziert"
          value={qualificationId}
          onChange={(value) => setQualificationId(value)}
          options={[
            { value: "", label: "keine Vorgabe" },
            ...data.qualifications.map((q) => ({ value: String(q.id), label: String(q.name) })),
          ]}
        />
      </label>
      {qualificationId && (
        <label>
          <span>Anzahl</span>
          <input
            type="number"
            min={1}
            max={50}
            value={minQualified}
            onChange={(e) => setMinQualified(Number(e.target.value))}
          />
        </label>
      )}
    </EditorDialog>
  );
}

// --- Regelwerk -----------------------------------------------------------------------------------

const RULE_FIELDS = [
  ["weeklyNormMinutes", "Wochenarbeitszeit bei 100 %", "h"],
  ["minRestMinutes", "Mindest-Ruhezeit zwischen Diensten", "h"],
  ["maxDailyWorkMinutes", "Max. Netto-Arbeitszeit pro Dienst", "h"],
  ["maxWeeklyWorkMinutes", "Max. Netto-Arbeitszeit pro Woche", "h"],
  ["deviationThresholdMinutes", "Warnung ab Zeitabweichung", "min"],
  ["missingClockOutAfterMinutes", "Fehlendes Ausstempeln melden nach", "min"],
  ["clockInEarliestMinutes", "Einstempeln frühestens vor Dienstbeginn", "min"],
] as const;

function RulesTab({ data, reload, showToast }: TabProps) {
  const [scope, setScope] = useState<"unit" | "org">(data.hasUnitOverride || !data.isAdmin ? "unit" : "org");
  const [rules, setRules] = useState(data.ruleSet);
  const [confirm, setConfirm] = useState(false);
  const toHours = (minutes: number) => String(Math.round((minutes / 60) * 100) / 100);
  const save = (extra: Record<string, unknown> = {}) =>
    act(
      () =>
        rosterRequest("/api/dienstplan/settings/rules", {
          method: "PUT",
          body: { ...rules, unitId: scope === "unit" ? data.unitId : null, confirmValues: confirm, ...extra },
        }),
      extra.action === "removeOverride"
        ? "Wohnbereich nutzt wieder das Regelwerk der Organisation"
        : "Regelwerk gespeichert",
      reload,
      showToast,
    );
  return (
    <section className="card roster-card">
      <div className="roster-section-head">
        <div>
          <h2>Regelwerk</h2>
          <p>
            Grenzwerte für Ruhezeit, Arbeitszeit, Pausen und Zeiterfassung. Keine Werte im Code – jede Änderung wird
            protokolliert.
          </p>
        </div>
        <CareOptionSelect
          label="Gültigkeit"
          value={scope}
          onChange={(value) => setScope(value as "unit" | "org")}
          options={[
            ...(data.isAdmin ? [{ value: "org", label: "Ganze Organisation" }] : []),
            ...(data.unitId
              ? [{ value: "unit", label: `Nur ${data.units.find((u) => u.id === data.unitId)?.name} (Überschreibung)` }]
              : []),
          ]}
        />
      </div>
      {!data.ruleSet.valuesConfirmed && (
        <p className="roster-alert" style={{ margin: 16 }}>
          Beispielwerte (Schweizer ArG) – rechtlich prüfen. Die Werte hängen von Arbeitsgesetz, Gesamtarbeitsvertrag und
          Betrieb ab.
        </p>
      )}
      <div className="roster-form-grid">
        {RULE_FIELDS.map(([key, label, unit]) => (
          <label key={key}>
            {label} ({unit})
            <input
              type="number"
              step={unit === "h" ? 0.25 : 1}
              value={unit === "h" ? toHours(rules[key]) : rules[key]}
              onChange={(e) =>
                setRules({
                  ...rules,
                  [key]: unit === "h" ? Math.round(Number(e.target.value) * 60) : Number(e.target.value),
                })
              }
            />
            {unit === "h" && <small>{formatHours(rules[key])}</small>}
          </label>
        ))}
        <label>
          Max. Arbeitstage am Stück
          <input
            type="number"
            min={1}
            max={31}
            value={rules.maxConsecutiveWorkDays}
            onChange={(e) => setRules({ ...rules, maxConsecutiveWorkDays: Number(e.target.value) })}
          />
        </label>
        <label>
          Nachtfenster ab
          <input
            type="time"
            value={rules.nightStart}
            onChange={(e) => setRules({ ...rules, nightStart: e.target.value })}
          />
        </label>
        <label>
          Nachtfenster bis
          <input
            type="time"
            value={rules.nightEnd}
            onChange={(e) => setRules({ ...rules, nightEnd: e.target.value })}
          />
        </label>
        <label>
          Zeitzone
          <input value={rules.timezone} onChange={(e) => setRules({ ...rules, timezone: e.target.value })} />
        </label>
        <label>
          KI-Läufe pro Stunde und Person
          <input
            type="number"
            min={0}
            max={100}
            value={rules.aiRunsPerHour}
            onChange={(e) => setRules({ ...rules, aiRunsPerHour: Number(e.target.value) })}
          />
        </label>
        <fieldset>
          <legend>Pausenstaffel (Arbeitszeit mehr als … → Pause)</legend>
          {rules.breakRules.map((rule, index) => (
            <div className="roster-row-actions" key={index}>
              <input
                className="roster-inline-input"
                type="number"
                aria-label="Arbeitszeit in Minuten"
                value={rule.minWorkMinutes}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    breakRules: rules.breakRules.map((r, i) =>
                      i === index ? { ...r, minWorkMinutes: Number(e.target.value) } : r,
                    ),
                  })
                }
              />
              Min →
              <input
                className="roster-inline-input"
                type="number"
                aria-label="Pause in Minuten"
                value={rule.minBreakMinutes}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    breakRules: rules.breakRules.map((r, i) =>
                      i === index ? { ...r, minBreakMinutes: Number(e.target.value) } : r,
                    ),
                  })
                }
              />
              Min Pause
            </div>
          ))}
        </fieldset>
        <label className="roster-checkbox">
          <input
            type="checkbox"
            checked={rules.autoSwapApproval}
            onChange={(e) => setRules({ ...rules, autoSwapApproval: e.target.checked })}
          />
          Diensttausch automatisch genehmigen
        </label>
        <label className="roster-checkbox">
          <input
            type="checkbox"
            checked={rules.allowShiftTakeover}
            onChange={(e) => setRules({ ...rules, allowShiftTakeover: e.target.checked })}
          />
          Dienstübernahme ohne Gegendienst erlauben
        </label>
        <label className="roster-checkbox">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          Werte sind rechtlich geprüft und bestätigt
        </label>
      </div>
      <div className="roster-form-actions">
        {scope === "unit" && data.hasUnitOverride && (
          <button className="secondary-button" type="button" onClick={() => void save({ action: "removeOverride" })}>
            Überschreibung entfernen
          </button>
        )}
        <button className="primary-button" type="button" onClick={() => void save()}>
          Regelwerk speichern
        </button>
      </div>
    </section>
  );
}

// --- Feiertage -----------------------------------------------------------------------------------

function HolidaysTab({ data, reload, showToast }: TabProps) {
  const year = new Date().getFullYear();
  const [form, setForm] = useState({ date: "", name: "" });
  return (
    <section className="card roster-card">
      <div className="roster-section-head">
        <div>
          <h2>Feiertage</h2>
          <p>Feiertage senken das Monatssoll und werden für Feiertagsstunden ausgewertet.</p>
        </div>
        <div className="roster-row-actions">
          {[year, year + 1].map((y) => (
            <button
              key={y}
              className="secondary-button"
              type="button"
              onClick={() =>
                void act(
                  () =>
                    rosterRequest("/api/dienstplan/settings/holidays", {
                      method: "POST",
                      body: { action: "importZurich", year: y },
                    }),
                  `${zurichHolidays(y).length} Feiertage ${y} (Kanton Zürich) übernommen`,
                  reload,
                  showToast,
                )
              }
            >
              Kanton Zürich {y} übernehmen
            </button>
          ))}
        </div>
      </div>
      <div className="roster-form-grid">
        <label>
          Datum
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label>
          Bezeichnung
          <input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
      </div>
      <div className="roster-form-actions">
        <button
          className="primary-button"
          type="button"
          disabled={!form.date || !form.name.trim()}
          onClick={() =>
            void act(
              () => rosterRequest("/api/dienstplan/settings/holidays", { method: "POST", body: form }),
              "Feiertag gespeichert",
              reload,
              showToast,
            ).then(() => setForm({ date: "", name: "" }))
          }
        >
          Feiertag hinzufügen
        </button>
      </div>
      <div className="roster-table-wrap">
        <table className="roster-table">
          <tbody>
            {data.holidays.map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.date, true)}</td>
                <td>{h.name}</td>
                <td>
                  <button
                    className="appointment-danger-button"
                    type="button"
                    onClick={() =>
                      void act(
                        () => rosterRequest(`/api/dienstplan/settings/holidays/${h.id}`, { method: "DELETE" }),
                        "Feiertag gelöscht",
                        reload,
                        showToast,
                      )
                    }
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
            {!data.holidays.length && (
              <tr>
                <td className="roster-muted">Noch keine Feiertage gepflegt.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// --- Personal ------------------------------------------------------------------------------------

type Person = SettingsPayload["employees"][number];

function PeopleTab({ data, reload, showToast }: TabProps) {
  const [editing, setEditing] = useState<Person | null>(null);
  const [qualification, setQualification] = useState({ code: "", name: "", grantsMedication: false });
  const qualificationCodes = (person: Person) =>
    person.qualifications
      .map((q) => data.qualifications.find((x) => x.id === q.qualificationId)?.code ?? "?")
      .join(", ") || "–";
  return (
    <>
      <section className="card roster-card">
        <div className="roster-section-head">
          <div>
            <h2>Personal im Wohnbereich</h2>
            <p>
              Pensum, Anstellung, Wohnbereiche (Springer), Leitung, Qualifikationen und ausgeschlossene Dienste – ohne
              Angabe von Gründen.
            </p>
          </div>
        </div>
        <div className="roster-table-wrap">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="number">Pensum</th>
                <th>Anstellung</th>
                <th>Qualifikation</th>
                <th>Nicht einplanbar für</th>
                <th>Wohnbereiche</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.employees.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{person.name}</strong>{" "}
                    {!person.active && <span className="roster-pill attention">inaktiv</span>}
                  </td>
                  <td className="number">{person.pensumPercent} %</td>
                  <td>
                    {person.employmentStart ? formatDate(person.employmentStart, true) : "–"} bis{" "}
                    {person.employmentEnd ? formatDate(person.employmentEnd, true) : "offen"}
                  </td>
                  <td>{qualificationCodes(person)}</td>
                  <td>
                    {person.excludedCategories.map((c) => EXCLUSION_LABELS[c as ExclusionCategory]).join(", ") || "–"}
                  </td>
                  <td>
                    {person.unitIds
                      .map((id) => data.units.find((u) => u.id === id)?.name ?? "anderer Bereich")
                      .join(", ")}
                  </td>
                  <td>
                    <button className="secondary-button" type="button" onClick={() => setEditing(person)}>
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card roster-card">
        <div className="roster-section-head">
          <div>
            <h2>Qualifikationen</h2>
            <p>
              {data.qualifications
                .map((q) => `${q.code} (${q.name}${q.grantsMedication ? ", Medikation" : ""})`)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="roster-form-grid">
          <label>
            Kürzel
            <input
              value={qualification.code}
              maxLength={24}
              onChange={(e) => {
                // Bekanntes Kürzel: Bezeichnung und Medikationsrecht übernehmen, damit nichts unbemerkt zurückgesetzt wird.
                const known = data.qualifications.find((q) => q.code === e.target.value.trim().toUpperCase());
                setQualification(
                  known
                    ? { code: e.target.value, name: known.name, grantsMedication: known.grantsMedication }
                    : { ...qualification, code: e.target.value },
                );
              }}
            />
          </label>
          <label>
            Bezeichnung
            <input
              value={qualification.name}
              maxLength={120}
              onChange={(e) => setQualification({ ...qualification, name: e.target.value })}
            />
          </label>
          <label className="area-editor-wide roster-checkbox">
            <input
              type="checkbox"
              checked={qualification.grantsMedication}
              onChange={(e) => setQualification({ ...qualification, grantsMedication: e.target.checked })}
            />
            <span>Berechtigt zur Medikation (Rollen wie „Pflege“ erhalten das Medikationsrecht nur damit)</span>
          </label>
        </div>
        <div className="roster-form-actions">
          <button
            className="primary-button"
            type="button"
            disabled={!qualification.code.trim() || !qualification.name.trim()}
            onClick={() =>
              void act(
                () => rosterRequest("/api/dienstplan/settings/qualifications", { method: "POST", body: qualification }),
                "Qualifikation gespeichert",
                reload,
                showToast,
              ).then(() => setQualification({ code: "", name: "", grantsMedication: false }))
            }
          >
            Qualifikation speichern
          </button>
        </div>
      </section>
      {editing && (
        <PersonEditor
          data={data}
          person={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            showToast("Personalprofil gespeichert");
            reload();
          }}
        />
      )}
    </>
  );
}

function PersonEditor({
  data,
  person,
  onClose,
  onSaved,
}: {
  data: SettingsPayload;
  person: Person;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    pensumPercent: person.pensumPercent,
    employmentStart: person.employmentStart ?? "",
    employmentEnd: person.employmentEnd ?? "",
    active: person.active,
    excludedCategories: person.excludedCategories,
    unitIds: person.unitIds,
    leadUnitIds: person.leadUnitIds,
    qualifications: person.qualifications,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toggle = (list: string[], value: string, on: boolean) =>
    on ? [...new Set([...list, value])] : list.filter((v) => v !== value);
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await rosterRequest(`/api/dienstplan/settings/employees/${person.id}`, {
        method: "PATCH",
        body: { ...form, employmentStart: form.employmentStart || null, employmentEnd: form.employmentEnd || null },
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  };
  return (
    <EditorDialog
      id="roster-person"
      eyebrow="Dienstplan · Personal"
      title={person.name}
      description="Gründe für Einschränkungen werden bewusst nicht gespeichert."
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
      submitLabel="Speichern"
    >
      <label>
        <span>Pensum (%)</span>
        <input
          type="number"
          min={1}
          max={100}
          value={form.pensumPercent}
          onChange={(e) => setForm({ ...form, pensumPercent: Number(e.target.value) })}
        />
      </label>
      <label className="roster-checkbox">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        <span>Aktiv (planbar)</span>
      </label>
      <label>
        <span>Eintritt</span>
        <input
          type="date"
          value={form.employmentStart}
          onChange={(e) => setForm({ ...form, employmentStart: e.target.value })}
        />
      </label>
      <label>
        <span>Austritt</span>
        <input
          type="date"
          value={form.employmentEnd}
          onChange={(e) => setForm({ ...form, employmentEnd: e.target.value })}
        />
      </label>
      <fieldset className="area-editor-wide">
        <legend>Nicht einplanbar für</legend>
        <div className="roster-chips-select">
          {(Object.keys(EXCLUSION_LABELS) as ExclusionCategory[]).map((key) => (
            <label className="roster-checkbox" key={key}>
              <input
                type="checkbox"
                checked={form.excludedCategories.includes(key)}
                onChange={(e) =>
                  setForm({ ...form, excludedCategories: toggle(form.excludedCategories, key, e.target.checked) })
                }
              />
              <span>{EXCLUSION_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="area-editor-wide">
        <legend>Wohnbereiche (planbar / Leitung)</legend>
        {data.units.map((unit) => (
          <div className="roster-chips-select" key={unit.id}>
            <label className="roster-checkbox">
              <input
                type="checkbox"
                checked={form.unitIds.includes(unit.id)}
                onChange={(e) => setForm({ ...form, unitIds: toggle(form.unitIds, unit.id, e.target.checked) })}
              />
              <span>{unit.name}: planbar</span>
            </label>
            <label className="roster-checkbox">
              <input
                type="checkbox"
                checked={form.leadUnitIds.includes(unit.id)}
                onChange={(e) => setForm({ ...form, leadUnitIds: toggle(form.leadUnitIds, unit.id, e.target.checked) })}
              />
              <span>Leitung</span>
            </label>
          </div>
        ))}
      </fieldset>
      <fieldset className="area-editor-wide">
        <legend>Qualifikationen</legend>
        {data.qualifications.map((q) => {
          const grant = form.qualifications.find((g) => g.qualificationId === q.id);
          return (
            <div className="roster-chips-select" key={q.id}>
              <label className="roster-checkbox">
                <input
                  type="checkbox"
                  checked={!!grant}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      qualifications: e.target.checked
                        ? [...form.qualifications, { qualificationId: q.id, validFrom: "2000-01-01", validUntil: null }]
                        : form.qualifications.filter((g) => g.qualificationId !== q.id),
                    })
                  }
                />
                <span>{q.name}</span>
              </label>
              {grant && (
                <label className="roster-checkbox">
                  <span>gültig bis</span>
                  <input
                    type="date"
                    style={{ width: 150 }}
                    value={grant.validUntil ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        qualifications: form.qualifications.map((g) =>
                          g.qualificationId === q.id ? { ...g, validUntil: e.target.value || null } : g,
                        ),
                      })
                    }
                  />
                </label>
              )}
            </div>
          );
        })}
      </fieldset>
    </EditorDialog>
  );
}

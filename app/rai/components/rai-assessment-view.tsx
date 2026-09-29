"use client";

import { useEffect, useRef, useState } from "react";
import { ModuleIcon, type ModuleIconName } from "@/app/components/module-icon";
import { CareDatePicker, CareSelect, formatCareDate } from "@/app/components/care-form-controls";
import { useCareResident, useTerms } from "@/app/components/care-context";
import HeaderResidentHint from "@/app/components/header-resident-hint";
import {
  LoadError,
  formatDate,
  formatDateTime,
  requestJson,
  todayInZurich,
  useApiData,
} from "@/app/components/workspace-ui";
import {
  RAI_DOMAINS,
  RAI_INSTRUMENTS,
  RAI_SCORES,
  raiProgress,
  scoreFromLabel,
  scoreLabel,
  type RaiDomain,
  type RaiResidentDetail,
} from "@/lib/rai-shared";

const SAVE_EVENT = "carecore:rai-save";
const UNSET_SCORE = "Noch nicht eingeschätzt";
const NOBODY = "Noch nicht festgelegt";

// The header button "Erfassung speichern" saves the open form as draft.
export const requestRaiSave = () => window.dispatchEvent(new Event(SAVE_EVENT));

// interRAI assessment of the resident chosen in the header.
export function AssessmentView({ showToast }: { showToast: (message: string) => void }) {
  const [residentId] = useCareResident();
  const detail = useApiData<RaiResidentDetail>(residentId ? `/api/rai/residents/${residentId}` : null);
  if (!residentId) return <HeaderResidentHint loading={false} missing={false} />;
  if (detail.error && !detail.data)
    return /nicht gefunden/i.test(detail.error) ? (
      <HeaderResidentHint loading={false} missing />
    ) : (
      <LoadError message={detail.error} onRetry={detail.reload} />
    );
  if (!detail.data || detail.data.resident.id !== residentId) return <HeaderResidentHint loading missing={false} />;
  const data = detail.data;
  return (
    <AssessmentForm
      key={`${residentId}-${data.draft?.id ?? "new"}-${data.history[0]?.id ?? ""}`}
      data={data}
      reload={detail.reload}
      showToast={showToast}
    />
  );
}

function AssessmentForm({
  data,
  reload,
  showToast,
}: {
  data: RaiResidentDetail;
  reload: () => void;
  showToast: (message: string) => void;
}) {
  const t = useTerms();
  const { resident, draft, history, people } = data;
  const last = history[0] ?? null;
  const [instrument, setInstrument] = useState(draft?.instrument ?? last?.instrument ?? RAI_INSTRUMENTS[0]);
  const [assessorId, setAssessorId] = useState(draft?.assessorId ?? last?.assessorId ?? null);
  const [date, setDate] = useState(
    draft?.status === "in_progress" && draft.assessedOn ? draft.assessedOn : todayInZurich(),
  );
  const [scores, setScores] = useState<Partial<Record<RaiDomain, number>>>(draft?.scores ?? {});
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [savedAt, setSavedAt] = useState(draft?.status === "in_progress" ? draft.updatedAt : null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const progress = raiProgress(scores, notes);
  const complete = RAI_DOMAINS.every((domain) => scores[domain.id] !== undefined);
  const assessorName = people.find((person) => person.id === assessorId)?.name ?? NOBODY;
  const change =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setDirty(true);
    };

  const save = async (finish: boolean) => {
    setSaving(true);
    try {
      await requestJson(`/api/rai/residents/${resident.id}`, {
        method: "PUT",
        body: { instrument, assessorId, assessedOn: date, scores, notes, complete: finish },
      });
      setSavedAt(new Date().toISOString());
      setDirty(false);
      showToast(
        finish ? `interRAI-Erfassung für ${resident.name} abgeschlossen` : `Entwurf für ${resident.name} gespeichert`,
      );
      if (finish) reload();
    } catch (reason) {
      showToast((reason as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onSave = () => void saveRef.current(false);
    window.addEventListener(SAVE_EVENT, onSave);
    return () => window.removeEventListener(SAVE_EVENT, onSave);
  }, []);

  return (
    <section className="rai-assessment-layout">
      <section className="card rai-assessment-form">
        <div className="rai-card-header">
          <div>
            <p className="eyebrow">{draft?.status === "in_progress" ? "Erfassung fortsetzen" : "Neue Erfassung"}</p>
            <h2 className="card-title">interRAI · {resident.name}</h2>
            <p className="card-subtitle">
              {[resident.room, resident.unit].filter(Boolean).join(" · ")} · {t.one} in der Kopfzeile
            </p>
          </div>
          <span className={`status-badge ${complete ? "stable" : "info"}`}>Entwurf · {progress}%</span>
        </div>
        <div className="area-editor-grid rai-form-grid">
          <label>
            Instrument
            <CareSelect
              label="Instrument"
              value={instrument}
              options={RAI_INSTRUMENTS}
              onChange={change(setInstrument)}
            />
          </label>
          <label>
            RAI Verantwortliche
            <CareSelect
              label="RAI Verantwortliche"
              value={assessorName}
              options={[NOBODY, ...people.map((person) => person.name)]}
              onChange={change((name: string) =>
                setAssessorId(people.find((person) => person.name === name)?.id ?? null),
              )}
            />
          </label>
          <label>
            Erfassungsdatum
            <CareDatePicker label="Erfassungsdatum" value={date} onChange={change(setDate)} />
          </label>
          <label>
            Fällig
            <input value={draft?.dueOn ? formatDate(draft.dueOn) : "–"} readOnly aria-readonly="true" />
          </label>
        </div>
        <div className="rai-domain-grid">
          {RAI_DOMAINS.map((domain) => (
            <article className="rai-domain-card" key={domain.id}>
              <div>
                <span className="rai-domain-icon">
                  <ModuleIcon name={domain.icon as ModuleIconName} />
                </span>
                <span>
                  <strong>{domain.id}</strong>
                  <small>{domain.description}</small>
                </span>
              </div>
              <CareSelect
                label={`${domain.id} Einschätzung`}
                value={scoreLabel(scores[domain.id]) ?? UNSET_SCORE}
                options={[UNSET_SCORE, ...RAI_SCORES]}
                onChange={change((value: string) =>
                  setScores((current) => ({ ...current, [domain.id]: scoreFromLabel(value) })),
                )}
              />
            </article>
          ))}
        </div>
        <label className="rai-notes-field">
          Fachliche Notiz
          <textarea
            value={notes}
            onChange={(event) => change(setNotes)(event.target.value)}
            placeholder="Beobachtungen, Ressourcen und Begründung der Einschätzung …"
            rows={6}
            maxLength={8000}
          />
        </label>
        <div className="rai-form-footer">
          <span>
            <ModuleIcon name={dirty ? "note" : "check"} />{" "}
            {dirty
              ? "Ungespeicherte Änderungen"
              : savedAt
                ? `Entwurf gespeichert · ${formatDateTime(savedAt)}`
                : "Noch nicht gespeichert"}
          </span>
          <div className="rai-form-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={() => void save(false)}>
              Entwurf speichern
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={saving || !complete}
              title={complete ? undefined : "Alle Bereiche einschätzen, um abzuschliessen"}
              onClick={() => void save(true)}
            >
              Erfassung abschliessen <ModuleIcon name="check" />
            </button>
          </div>
        </div>
      </section>
      <aside className="rai-assessment-side">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Kontext</p>
              <h2 className="card-title">Erfassungsstatus</h2>
            </div>
          </div>
          <div className="rai-context-list">
            <div>
              <span>{t.one}</span>
              <strong>{resident.name}</strong>
            </div>
            <div>
              <span>Instrument</span>
              <strong>{instrument}</strong>
            </div>
            <div>
              <span>Datum</span>
              <strong>{formatCareDate(date)}</strong>
            </div>
            <div>
              <span>Verantwortlich</span>
              <strong>{assessorName}</strong>
            </div>
            <div>
              <span>Letzter Abschluss</span>
              <strong>{last?.completedAt ? formatDate(last.completedAt) : "–"}</strong>
            </div>
          </div>
        </section>
        {history.length > 0 && (
          <section className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Verlauf</p>
                <h2 className="card-title">Abgeschlossene Erfassungen</h2>
              </div>
            </div>
            <div className="rai-context-list">
              {history.map((item) => {
                const values = Object.values(item.scores);
                const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
                return (
                  <div key={item.id} title={item.notes || undefined}>
                    <span>
                      {formatDate(item.assessedOn)} · {item.instrument}
                    </span>
                    <strong>{average === null ? "–" : `Ø ${average.toFixed(1).replace(".", ",")}`}</strong>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <section className="card rai-safety-card">
          <ModuleIcon name="quality" />
          <h2 className="card-title">Fachliche Verantwortung</h2>
          <p>
            Die Einschätzung bleibt ein Entwurf, bis sie abgeschlossen wird. Danach ist die nächste Folgeerfassung in
            sechs Monaten fällig.
          </p>
        </section>
      </aside>
    </section>
  );
}

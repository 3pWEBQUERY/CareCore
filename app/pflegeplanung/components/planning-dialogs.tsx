"use client";

import { useState, type ReactNode } from "react";
import { CareDatePicker, CareSelect } from "@/app/components/care-form-controls";
import { EditorDialog, requestJson, todayInZurich } from "@/app/components/workspace-ui";
import {
  GOAL_CATEGORIES,
  OUTCOME_LABELS,
  RESPONSIBLE_ROLES,
  type CareGoal,
  type CarePlan,
  type Intervention,
  type Outcome,
} from "@/lib/care-planning-shared";

const plusDays = (days: number) => {
  const date = new Date(`${todayInZurich()}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

// Shared submit handling for the planning dialogs.
function useSave(onSaved: (message: string) => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (request: () => Promise<unknown>, message: string) => {
    setSaving(true);
    setError("");
    try {
      await request();
      onSaved(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  };
  return { saving, error, save };
}

type DialogProps = { residentName: string; onClose: () => void; onSaved: (message: string) => void };

export function PlanDialog({
  residentId,
  plan,
  staff,
  residentName,
  onClose,
  onSaved,
}: DialogProps & { residentId: string; plan: CarePlan | null; staff: Array<{ id: string; name: string }> }) {
  const [form, setForm] = useState({
    careLevel: plan?.careLevel ?? "",
    focus: plan?.focus ?? "",
    ownerId: plan?.ownerId ?? "",
    startsOn: plan?.startsOn ?? todayInZurich(),
    reviewOn: plan?.reviewOn ?? plusDays(90),
  });
  const { saving, error, save } = useSave(onSaved);
  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const owner = staff.find((u) => u.id === form.ownerId);
  return (
    <EditorDialog
      id="care-plan"
      eyebrow={`CareCore Plan · ${residentName}`}
      title={plan ? "Pflegeplan bearbeiten" : "Pflegeplan anlegen"}
      description="Der Pflegeplan bündelt Probleme, Ziele und Massnahmen. Zum Überprüfungsdatum erscheint er unter „Auswertung“."
      onClose={onClose}
      onSubmit={() =>
        save(
          () =>
            plan
              ? requestJson(`/api/care-planning/plans/${plan.id}`, {
                  method: "PATCH",
                  body: { ...form, ownerId: form.ownerId || null },
                })
              : requestJson("/api/care-planning/plans", {
                  method: "POST",
                  body: { ...form, residentId, ownerId: form.ownerId || null },
                }),
          plan ? "Pflegeplan aktualisiert" : `Pflegeplan für ${residentName} angelegt`,
        )
      }
      saving={saving}
      error={error}
      submitLabel={plan ? "Änderungen speichern" : "Pflegeplan anlegen"}
    >
      <label className="area-editor-wide">
        <span>Pflegefokus</span>
        <textarea
          required
          rows={3}
          maxLength={4000}
          value={form.focus}
          onChange={(e) => set("focus", e.target.value)}
          placeholder="z. B. Mobilität erhalten und Stürze vermeiden; Diabetes stabil einstellen"
        />
      </label>
      <label>
        <span>Pflegestufe</span>
        <input
          maxLength={80}
          value={form.careLevel}
          onChange={(e) => set("careLevel", e.target.value)}
          placeholder="z. B. Pflegestufe 4"
        />
      </label>
      <label>
        <span>Bezugspflege</span>
        <CareSelect
          label="Bezugspflege"
          value={owner?.name ?? "Nicht festgelegt"}
          options={["Nicht festgelegt", ...staff.map((u) => u.name)]}
          onChange={(v) => set("ownerId", staff.find((u) => u.name === v)?.id ?? "")}
        />
      </label>
      <label>
        <span>Gültig ab</span>
        <CareDatePicker label="Gültig ab" value={form.startsOn} onChange={(v) => set("startsOn", v)} />
      </label>
      <label>
        <span>Überprüfung am</span>
        <CareDatePicker label="Überprüfung am" value={form.reviewOn} onChange={(v) => set("reviewOn", v)} />
      </label>
    </EditorDialog>
  );
}

export function GoalDialog({
  planId,
  goal,
  residentName,
  onClose,
  onSaved,
}: DialogProps & { planId: string; goal: CareGoal | null }) {
  const [form, setForm] = useState({
    category:
      goal?.category && (GOAL_CATEGORIES as readonly string[]).includes(goal.category)
        ? goal.category
        : GOAL_CATEGORIES[0],
    problem: goal?.problem ?? "",
    resources: goal?.resources ?? "",
    statement: goal?.statement ?? "",
    targetDate: goal?.targetDate ?? plusDays(28),
  });
  const { saving, error, save } = useSave(onSaved);
  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <EditorDialog
      id="care-goal"
      eyebrow={`CareCore Plan · ${residentName}`}
      title={goal ? "Pflegeziel bearbeiten" : "Pflegeziel hinzufügen"}
      description="Problem → Ressourcen → Ziel. Das Ziel möglichst konkret und überprüfbar formulieren (wer, was, wie gut, bis wann)."
      onClose={onClose}
      onSubmit={() =>
        save(
          () =>
            goal
              ? requestJson(`/api/care-planning/goals/${goal.id}`, { method: "PATCH", body: form })
              : requestJson(`/api/care-planning/plans/${planId}/goals`, { method: "POST", body: form }),
          goal ? "Pflegeziel aktualisiert" : "Pflegeziel hinzugefügt",
        )
      }
      saving={saving}
      error={error}
      submitLabel={goal ? "Änderungen speichern" : "Ziel hinzufügen"}
    >
      <label>
        <span>Pflegebereich</span>
        <CareSelect
          label="Pflegebereich"
          value={form.category}
          options={[...GOAL_CATEGORIES]}
          onChange={(v) => set("category", v)}
        />
      </label>
      <label>
        <span>Überprüfung am</span>
        <CareDatePicker label="Überprüfung am" value={form.targetDate} onChange={(v) => set("targetDate", v)} />
      </label>
      <label className="area-editor-wide">
        <span>Pflegeproblem</span>
        <textarea
          required
          rows={2}
          maxLength={4000}
          value={form.problem}
          onChange={(e) => set("problem", e.target.value)}
          placeholder="z. B. Gangunsicherheit nach Sturz am 12.09., Angst vor erneutem Sturz"
        />
      </label>
      <label className="area-editor-wide">
        <span>Ressourcen</span>
        <textarea
          rows={2}
          maxLength={4000}
          value={form.resources}
          onChange={(e) => set("resources", e.target.value)}
          placeholder="z. B. motiviert, nutzt Rollator, gute Kooperation"
        />
      </label>
      <label className="area-editor-wide">
        <span>Ziel</span>
        <textarea
          required
          rows={2}
          maxLength={2000}
          value={form.statement}
          onChange={(e) => set("statement", e.target.value)}
          placeholder="z. B. Herr Müller geht mit Rollator und Begleitung 20 m im Korridor ohne Sturz."
        />
      </label>
    </EditorDialog>
  );
}

export function InterventionDialog({
  goal,
  intervention,
  residentName,
  onClose,
  onSaved,
}: DialogProps & { goal: CareGoal; intervention: Intervention | null }) {
  const [form, setForm] = useState({
    title: intervention?.title ?? "",
    instructions: intervention?.instructions ?? "",
    frequency: intervention?.frequency ?? "",
    responsibleRole: intervention?.responsibleRole ?? RESPONSIBLE_ROLES[0],
  });
  const { saving, error, save } = useSave(onSaved);
  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <EditorDialog
      id="care-intervention"
      eyebrow={`CareCore Plan · ${residentName}`}
      title={intervention ? "Massnahme bearbeiten" : "Massnahme planen"}
      description={`Zum Ziel: ${goal.statement}`}
      onClose={onClose}
      onSubmit={() =>
        save(
          () =>
            intervention
              ? requestJson(`/api/care-planning/interventions/${intervention.id}`, { method: "PATCH", body: form })
              : requestJson(`/api/care-planning/goals/${goal.id}/interventions`, { method: "POST", body: form }),
          intervention ? "Massnahme aktualisiert" : "Massnahme geplant",
        )
      }
      saving={saving}
      error={error}
      submitLabel={intervention ? "Änderungen speichern" : "Massnahme speichern"}
    >
      <label className="area-editor-wide">
        <span>Massnahme</span>
        <input
          required
          maxLength={220}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="z. B. Begleitetes Gehtraining mit Rollator"
        />
      </label>
      <label>
        <span>Häufigkeit</span>
        <input
          required
          maxLength={100}
          value={form.frequency}
          onChange={(e) => set("frequency", e.target.value)}
          placeholder="z. B. 2× täglich, vor dem Mittagessen"
        />
      </label>
      <label>
        <span>Zuständig</span>
        <CareSelect
          label="Zuständig"
          value={form.responsibleRole}
          options={[...RESPONSIBLE_ROLES]}
          onChange={(v) => set("responsibleRole", v)}
        />
      </label>
      <label className="area-editor-wide">
        <span>Durchführung</span>
        <textarea
          rows={3}
          maxLength={4000}
          value={form.instructions}
          onChange={(e) => set("instructions", e.target.value)}
          placeholder="Vorgehen, Hilfsmittel, worauf achten, was dokumentieren"
        />
      </label>
    </EditorDialog>
  );
}

export function EvaluationDialog({ goal, residentName, onClose, onSaved }: DialogProps & { goal: CareGoal }) {
  const [outcome, setOutcome] = useState<Outcome>("partially");
  const [note, setNote] = useState("");
  const [nextReviewOn, setNextReviewOn] = useState(plusDays(28));
  const [closeGoal, setCloseGoal] = useState(false);
  const { saving, error, save } = useSave(onSaved);
  const closes = outcome === "achieved" || (outcome === "not_achieved" && closeGoal);
  const outcomeButtons: ReactNode = (
    <div className="appointment-kind-switch area-editor-wide" role="group" aria-label="Ergebnis">
      {(Object.keys(OUTCOME_LABELS) as Outcome[]).map((key) => (
        <button
          type="button"
          key={key}
          className={outcome === key ? "active" : ""}
          aria-pressed={outcome === key}
          onClick={() => setOutcome(key)}
        >
          {OUTCOME_LABELS[key]}
        </button>
      ))}
    </div>
  );
  return (
    <EditorDialog
      id="care-evaluation"
      eyebrow={`CareCore Plan · ${residentName}`}
      title="Ziel evaluieren"
      description={goal.statement}
      onClose={onClose}
      onSubmit={() =>
        save(
          () =>
            requestJson(`/api/care-planning/goals/${goal.id}/evaluations`, {
              method: "POST",
              body: { outcome, note, nextReviewOn: closes ? null : nextReviewOn, closeGoal },
            }),
          `Evaluation gespeichert · ${OUTCOME_LABELS[outcome]}`,
        )
      }
      saving={saving}
      error={error}
      submitLabel="Evaluation speichern"
    >
      {outcomeButtons}
      <label className="area-editor-wide">
        <span>Begründung</span>
        <textarea
          required
          rows={4}
          maxLength={4000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Beobachtungen, Veränderungen seit der letzten Überprüfung, Anpassungen der Massnahmen"
        />
      </label>
      {outcome === "not_achieved" && (
        <label className="form-checkbox area-editor-wide">
          <input type="checkbox" checked={closeGoal} onChange={(e) => setCloseGoal(e.target.checked)} />
          Ziel nicht weiterverfolgen (abschliessen) – sonst bleibt es mit neuem Termin aktiv
        </label>
      )}
      {!closes && (
        <label>
          <span>Nächste Überprüfung</span>
          <CareDatePicker label="Nächste Überprüfung" value={nextReviewOn} onChange={setNextReviewOn} />
        </label>
      )}
    </EditorDialog>
  );
}

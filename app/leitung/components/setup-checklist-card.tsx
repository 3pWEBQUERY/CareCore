"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { requestJson } from "@/app/components/workspace-ui";
import type { SetupChecklist } from "@/lib/setup-checklist";

// Ersteinrichtung: offene Schritte einer neuen Installation. Erscheint nur, solange etwas offen ist und die
// Liste nicht ausgeblendet wurde.
export function SetupChecklistCard({ showToast }: { showToast: (message: string) => void }) {
  const [checklist, setChecklist] = useState<SetupChecklist | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let live = true;
    requestJson<SetupChecklist>("/api/admin/setup")
      .then((result) => live && setChecklist(result))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  if (!checklist || checklist.dismissed) return null;
  const open = checklist.steps.filter((step) => !step.done).length;
  if (!open) return null;
  const done = checklist.steps.length - open;

  const dismiss = () => {
    setSaving(true);
    requestJson<SetupChecklist>("/api/admin/setup", { method: "PATCH", body: { dismissed: true } })
      .then((result) => {
        setChecklist(result);
        showToast("Ersteinrichtung ausgeblendet");
      })
      .catch((reason: Error) => showToast(reason.message))
      .finally(() => setSaving(false));
  };

  return (
    <section className="card setup-checklist" aria-labelledby="setup-checklist-title">
      <div className="card-header">
        <div>
          <p className="eyebrow">Ersteinrichtung</p>
          <h2 className="card-title" id="setup-checklist-title">
            CareCore einrichten
          </h2>
          <p className="card-subtitle">
            {done} von {checklist.steps.length} Schritten erledigt
          </p>
        </div>
        <button className="quiet-button" type="button" disabled={saving} onClick={dismiss}>
          Ausblenden
        </button>
      </div>
      <ol className="setup-checklist-steps">
        {checklist.steps.map((step) => (
          <li key={step.id} className={step.done ? "done" : ""}>
            <span className="setup-checklist-mark" aria-hidden="true">
              {step.done ? <ModuleIcon name="check" /> : null}
            </span>
            <span className="setup-checklist-copy">
              <strong>
                {step.label}
                <span className="setup-checklist-state">{step.done ? " – erledigt" : " – offen"}</span>
              </strong>
              <small>{step.detail}</small>
            </span>
            {!step.done && step.href && (
              <Link className="secondary-button" href={step.href}>
                Öffnen
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

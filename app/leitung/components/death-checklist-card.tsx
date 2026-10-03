"use client";

import { useState } from "react";
import { EditorDialog, requestJson, useApiData } from "@/app/components/workspace-ui";
import { DEATH_CHECKLIST_MAX_ITEMS } from "@/lib/end-of-life-shared";

// Checkliste nach einem Todesfall: Die Einrichtung legt ihre Punkte selbst fest (keine Vorgabe). Beim Erfassen eines
// Todesfalls werden sie für die Person übernommen; spätere Änderungen gelten für künftige Todesfälle.
export function DeathChecklistCard({ showToast }: { showToast: (message: string) => void }) {
  const data = useApiData<{ items: string[] }>("/api/admin/death-checklist");
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const items = data.data?.items ?? [];
  return (
    <section className="card admin-terminology-card admin-retention-card" aria-labelledby="admin-death-checklist-title">
      <div className="card-header">
        <div>
          <p className="eyebrow">Lebensende</p>
          <h2 className="card-title" id="admin-death-checklist-title">
            Checkliste nach einem Todesfall
          </h2>
          <p className="card-subtitle">
            {items.length
              ? `${items.length} ${items.length === 1 ? "Punkt" : "Punkte"} · wird beim Erfassen eines Todesfalls übernommen`
              : "Noch keine Punkte festgelegt – die Einrichtung bestimmt sie selbst"}
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          disabled={!data.data}
          onClick={() => {
            setError("");
            setDraft(items.join("\n"));
          }}
        >
          {items.length ? "Bearbeiten" : "Festlegen"}
        </button>
      </div>
      <div className="admin-retention-list">
        {data.error && <p className="list-hint">{data.error}</p>}
        {items.map((item, index) => (
          <div className="admin-retention-row" key={item}>
            <span>
              <strong>
                {index + 1}. {item}
              </strong>
            </span>
          </div>
        ))}
      </div>
      {draft !== null && (
        <EditorDialog
          id="death-checklist"
          eyebrow="Konfiguration · Lebensende"
          title="Checkliste nach einem Todesfall"
          description={`Ein Punkt pro Zeile, höchstens ${DEATH_CHECKLIST_MAX_ITEMS}. Änderungen gelten für künftige Todesfälle; bereits übernommene Checklisten bleiben unverändert.`}
          onClose={() => setDraft(null)}
          onSubmit={async () => {
            setSaving(true);
            setError("");
            try {
              await requestJson("/api/admin/death-checklist", {
                method: "PUT",
                body: { items: draft.split("\n") },
              });
              setDraft(null);
              data.reload();
              showToast("Checkliste nach einem Todesfall gespeichert");
            } catch (cause) {
              setError((cause as Error).message);
            } finally {
              setSaving(false);
            }
          }}
          saving={saving}
          error={error}
          submitLabel="Checkliste speichern"
        >
          <label className="area-editor-wide">
            <span>Punkte</span>
            <textarea
              rows={8}
              placeholder={
                "z. B.\nÄrztin bzw. Arzt informiert\nAngehörige informiert\nBestattungsunternehmen beauftragt"
              }
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
        </EditorDialog>
      )}
    </section>
  );
}

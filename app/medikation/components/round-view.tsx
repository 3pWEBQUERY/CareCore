"use client";

import { useState } from "react";
import { CareDatePicker, CareSelect } from "@/app/components/care-form-controls";
import { ModuleIcon } from "@/app/components/module-page-shell";
import {
  ROUNDS,
  administrationLabels,
  roundForTime,
  type AdministrationStatus,
  type RoundDose,
  type RoundKey,
} from "@/lib/medication-shared";
import {
  EmptyState,
  LoadError,
  PageHeading,
  ReasonDialog,
  SummaryTiles,
  formatDateTime,
  requestJson,
  timeInZurich,
  todayInZurich,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import type { ResidentsPayload } from "./plan-view";

const statusTone: Record<RoundDose["status"], string> = {
  scheduled: "info",
  administered: "stable",
  declined: "critical",
  omitted: "attention",
  delayed: "attention",
};

const reasonCopy: Record<
  Exclude<AdministrationStatus, "administered">,
  { title: string; label: string; placeholder: string }
> = {
  declined: {
    title: "Verweigerung dokumentieren",
    label: "Begründung",
    placeholder: "z. B. Bewohner lehnt Einnahme ab, Arzt informiert",
  },
  omitted: {
    title: "Auslassung dokumentieren",
    label: "Begründung",
    placeholder: "z. B. nüchtern für Untersuchung, laut Arzt pausiert",
  },
  delayed: {
    title: "Verschiebung dokumentieren",
    label: "Begründung und neue Zeit",
    placeholder: "z. B. schläft, Gabe um 09:00 nachholen",
  },
};

export default function RoundView({ showToast }: { showToast: ShowToast }) {
  const [round, setRound] = useState<RoundKey>(() => roundForTime(timeInZurich()));
  const [date, setDate] = useState(todayInZurich);
  const [pending, setPending] = useState<{
    dose: RoundDose;
    status: Exclude<AdministrationStatus, "administered">;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const permissions = useApiData<ResidentsPayload>("/api/medication/residents");
  const canManage = permissions.data?.canManage ?? false;
  const { data, error, loading, reload } = useApiData<{ date: string; doses: RoundDose[] }>(
    `/api/medication/round?round=${round}&date=${date}`,
  );
  const doses = data?.doses ?? [];
  const documented = doses.filter((dose) => dose.status !== "scheduled").length;
  const residentsInRound = new Set(doses.map((dose) => dose.residentId)).size;
  const changed = doses.filter((dose) => dose.orderChangedRecently);
  const percent = doses.length ? Math.round((documented / doses.length) * 100) : 0;
  const keyOf = (dose: RoundDose) => `${dose.orderId}-${dose.scheduledAt}`;

  async function documentDose(dose: RoundDose, status: AdministrationStatus, note?: string) {
    setBusy(keyOf(dose));
    try {
      const result = await requestJson<{ stockNote: string | null }>("/api/medication/round", {
        method: "POST",
        body: { orderId: dose.orderId, scheduledAt: dose.scheduledAt, status, note },
      });
      showToast(
        `${dose.residentName}: ${dose.medication} – ${administrationLabels[status]} dokumentiert${result.stockNote ? `. ${result.stockNote}` : ""}`,
      );
      setPending(null);
      reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="CareCore Med"
        title="Medikamentenrunde"
        description="Geplante Gaben vorbereiten, prüfen und direkt dokumentieren."
      />
      <SummaryTiles
        label="Status der Medikamentenrunde"
        tiles={[
          { icon: "residents", value: residentsInRound, caption: "Bewohner in der Runde" },
          { icon: "check", value: documented, caption: "Gaben dokumentiert" },
          { icon: "alert", value: doses.length - documented, caption: "noch offen", tone: "attention" },
          { icon: "med", value: doses.length, caption: "Einzelgaben geplant", tone: "info" },
        ]}
      />
      {changed.length > 0 && (
        <section className="critical-alert">
          <span className="critical-symbol">
            <ModuleIcon name="alert" />
          </span>
          <div>
            <strong>Geänderte Verordnungen in den letzten 48 Stunden</strong>
            <p>{[...new Set(changed.map((dose) => `${dose.residentName}: ${dose.medication}`))].join(" · ")}</p>
          </div>
        </section>
      )}
      {error && <LoadError message={error} onRetry={reload} />}
      <section className="card med-round-card">
        <div className="med-round-toolbar">
          <div>
            <h2 className="card-title">{ROUNDS[round].label.split(" · ")[0]}</h2>
            <p className="card-subtitle">
              {documented} von {doses.length} Gaben dokumentiert
            </p>
          </div>
          <label>
            <span>Runde</span>
            <CareSelect
              label="Runde"
              value={ROUNDS[round].label}
              options={Object.values(ROUNDS).map((item) => item.label)}
              onChange={(label) =>
                setRound((Object.keys(ROUNDS) as RoundKey[]).find((key) => ROUNDS[key].label === label) ?? round)
              }
            />
          </label>
          <label>
            <span>Datum</span>
            <CareDatePicker label="Datum der Runde" value={date} onChange={setDate} />
          </label>
          <div className="med-round-progress">
            <span>
              <i style={{ width: `${percent}%` }} />
            </span>
            <strong>{percent}%</strong>
          </div>
        </div>
        <div className="med-round-list">
          {doses.map((dose) => {
            const hasAllergy = dose.allergies && !/^(keine|keine bekannt|nicht bekannt)$/i.test(dose.allergies.trim());
            const isBusy = busy === keyOf(dose);
            return (
              <article className={`med-round-row ${dose.status === "scheduled" ? "" : "gegeben"}`} key={keyOf(dose)}>
                <span className="resident-avatar">{dose.initials}</span>
                <div className="med-round-person">
                  <strong>{dose.residentName}</strong>
                  <small>{[dose.room, dose.careUnit].filter(Boolean).join(" · ")}</small>
                  {hasAllergy && <small className="med-allergy-text">Allergie: {dose.allergies}</small>}
                </div>
                <div className="med-round-meds">
                  <span>
                    <ModuleIcon name="med" />
                    <strong>
                      {dose.time} · {dose.medication}
                    </strong>
                    <small>
                      {dose.amount}
                      {dose.route ? ` · ${dose.route}` : ""}
                      {dose.status !== "scheduled" &&
                        ` · ${dose.administeredBy ?? "unbekannt"}${dose.administeredAt ? `, ${formatDateTime(dose.administeredAt)}` : ""}`}
                      {dose.note ? ` · ${dose.note}` : ""}
                    </small>
                  </span>
                </div>
                <span className={`status-badge ${statusTone[dose.status]}`}>{administrationLabels[dose.status]}</span>
                {canManage ? (
                  <div className="med-round-actions">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void documentDose(dose, "administered").catch((e: Error) => showToast(e.message))}
                    >
                      Gegeben
                    </button>
                    <button type="button" disabled={isBusy} onClick={() => setPending({ dose, status: "declined" })}>
                      Verweigert
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      aria-label={`${dose.medication} für ${dose.residentName} auslassen oder verschieben`}
                      title="Auslassen oder verschieben"
                      onClick={() => setPending({ dose, status: "omitted" })}
                    >
                      <ModuleIcon name="alert" />
                    </button>
                  </div>
                ) : (
                  <span />
                )}
              </article>
            );
          })}
          {!loading && !doses.length && !error && (
            <EmptyState
              title="Keine Gaben in dieser Runde"
              text="Für den gewählten Zeitraum sind keine Regelmedikationen verordnet."
            />
          )}
          {loading && !data && <p className="list-hint">Runde wird geladen …</p>}
        </div>
      </section>
      {pending && (
        <ReasonDialog
          title={reasonCopy[pending.status].title}
          description={`${pending.dose.residentName} · ${pending.dose.time} · ${pending.dose.medication}`}
          label={reasonCopy[pending.status].label}
          placeholder={reasonCopy[pending.status].placeholder}
          submitLabel={administrationLabels[pending.status]}
          danger={pending.status === "declined"}
          onClose={() => setPending(null)}
          onConfirm={(note) => documentDose(pending.dose, pending.status, note)}
        >
          {pending.status !== "declined" && (
            <div className="appointment-kind-switch area-editor-wide" role="group" aria-label="Art der Abweichung">
              {(["omitted", "delayed"] as const).map((status) => (
                <button
                  type="button"
                  key={status}
                  className={pending.status === status ? "active" : ""}
                  aria-pressed={pending.status === status}
                  onClick={() => setPending({ ...pending, status })}
                >
                  {administrationLabels[status]}
                </button>
              ))}
            </div>
          )}
        </ReasonDialog>
      )}
    </>
  );
}

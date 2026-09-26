"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import ResidentList from "@/app/components/resident-list";
import {
  EmptyState,
  LoadError,
  PageHeading,
  SummaryTiles,
  formatDate,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import type { CarePlan, PlanningResident } from "@/lib/care-planning-shared";
import GoalCard from "./goal-card";
import { usePlanningDialogs } from "./use-planning-dialogs";
import { useCareResident } from "@/app/components/care-context";

export type PlanningOverview = {
  residents: PlanningResident[];
  staff: Array<{ id: string; name: string }>;
  canWrite: boolean;
};

const planLabel = (r: PlanningResident) =>
  !r.planId
    ? "Kein Pflegeplan"
    : r.reviewDue || r.goalsDue
      ? `Überprüfung fällig · ${r.activeGoals} Ziele`
      : `${r.activeGoals} aktive Ziel${r.activeGoals === 1 ? "" : "e"}`;

export default function PlanView({ showToast }: { showToast: ShowToast }) {
  // ?resident=<id> (from the goal list or the evaluation) preselects a resident.
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedId, setSelectedId] = useCareResident();
  const linkedResident = params.get("resident");
  useEffect(() => {
    if (linkedResident) setSelectedId(linkedResident);
  }, [linkedResident, setSelectedId]);
  const [showClosed, setShowClosed] = useState(false);
  const hasParams = params.size > 0;
  useEffect(() => {
    if (hasParams) router.replace(pathname, { scroll: false });
  }, [hasParams, router, pathname]);

  const overview = useApiData<PlanningOverview>("/api/care-planning");
  const residents = overview.data?.residents ?? [];
  const resident = residents.find((r) => r.id === selectedId) ?? residents[0] ?? null;
  const detail = useApiData<{ plan: CarePlan | null; closedPlans: number }>(
    resident ? `/api/care-planning/residents/${resident.id}` : null,
  );
  const plan = detail.data?.plan ?? null;
  const canWrite = overview.data?.canWrite ?? false;
  const reload = () => {
    overview.reload();
    detail.reload();
  };
  const planning = usePlanningDialogs({
    staff: overview.data?.staff ?? [],
    showToast,
    onChanged: reload,
    residentNameOf: () => resident?.name ?? "",
  });
  const goals = (plan?.goals ?? []).filter((g) => (showClosed ? g.status !== "active" : g.status === "active"));
  const withPlan = residents.filter((r) => r.planId);

  return (
    <>
      <PageHeading
        eyebrow="CareCore Plan"
        title="Pflegeplanung"
        description="Probleme, Ressourcen, Ziele und Massnahmen je Bewohner – nachvollziehbar im Pflegeprozess."
        action={
          canWrite && resident
            ? plan
              ? { label: "Pflegeziel hinzufügen", onClick: () => planning.addGoal(plan.id, resident.name) }
              : { label: "Pflegeplan anlegen", onClick: () => planning.openPlan(resident.id, resident.name, null) }
            : undefined
        }
      />
      <SummaryTiles
        label="Stand der Pflegeplanung"
        tiles={[
          { icon: "plan", value: `${withPlan.length}/${residents.length}`, caption: "Bewohner mit Pflegeplan" },
          { icon: "check", value: withPlan.reduce((sum, r) => sum + r.activeGoals, 0), caption: "aktive Pflegeziele" },
          {
            icon: "calendar",
            value: residents.filter((r) => r.reviewDue || r.goalsDue > 0).length,
            caption: "Überprüfungen fällig",
            tone: "attention",
          },
          { icon: "alert", value: residents.length - withPlan.length, caption: "ohne Pflegeplan", tone: "info" },
        ]}
      />
      {overview.error && <LoadError message={overview.error} onRetry={overview.reload} />}
      <div className="medication-two-column">
        <ResidentList
          residents={residents}
          selectedId={resident?.id ?? null}
          onSelect={setSelectedId}
          loading={overview.loading}
          countLabel={planLabel}
        />
        <section className="med-main-column">
          {resident && detail.error && <LoadError message={detail.error} onRetry={detail.reload} />}
          {resident && detail.data && !plan && (
            <section className="card care-plan-empty">
              <EmptyState
                icon="plan"
                title={`Kein offener Pflegeplan für ${resident.name}`}
                text={
                  detail.data.closedPlans
                    ? `${detail.data.closedPlans} abgeschlossene${detail.data.closedPlans === 1 ? "r" : ""} Plan im Verlauf.`
                    : "Ein Pflegeplan bündelt Probleme, Ziele und Massnahmen."
                }
              />
              {canWrite && (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => planning.openPlan(resident.id, resident.name, null)}
                >
                  <ModuleIcon name="plus" /> Pflegeplan anlegen
                </button>
              )}
            </section>
          )}
          {resident && plan && (
            <>
              <section className="card care-plan-head">
                <div className="care-profile-identity">
                  <span className="resident-avatar">{resident.initials}</span>
                  <div>
                    <p className="eyebrow">Pflegeplan · seit {formatDate(plan.startsOn)}</p>
                    <h2>{resident.name}</h2>
                    <span>{[resident.room, resident.careUnit, plan.careLevel].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
                <p className="care-plan-focus">{plan.focus}</p>
                <dl>
                  <div>
                    <dt>Bezugspflege</dt>
                    <dd>{plan.ownerName ?? "Nicht festgelegt"}</dd>
                  </div>
                  <div>
                    <dt>Überprüfung</dt>
                    <dd className={plan.reviewDue ? "due" : ""}>
                      {formatDate(plan.reviewOn)}
                      {plan.reviewDue ? " · fällig" : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Bewohnerakte</dt>
                    <dd>
                      <Link href={`/bewohner?resident=${resident.id}`}>Öffnen</Link>
                    </dd>
                  </div>
                </dl>
                {canWrite && (
                  <div className="care-plan-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => planning.openPlan(resident.id, resident.name, plan)}
                    >
                      Plan bearbeiten
                    </button>
                    <button
                      className="quiet-button"
                      type="button"
                      onClick={() => planning.closePlan(plan, resident.name)}
                    >
                      Plan abschliessen
                    </button>
                  </div>
                )}
              </section>
              <div className="care-goal-toolbar">
                <h2 className="card-title">Pflegeziele</h2>
                <div className="care-record-filters">
                  <button
                    type="button"
                    className={!showClosed ? "active" : ""}
                    aria-pressed={!showClosed}
                    onClick={() => setShowClosed(false)}
                  >
                    Aktiv
                  </button>
                  <button
                    type="button"
                    className={showClosed ? "active" : ""}
                    aria-pressed={showClosed}
                    onClick={() => setShowClosed(true)}
                  >
                    Abgeschlossen
                  </button>
                </div>
              </div>
              <div className="care-goal-list">
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} actions={canWrite ? planning.actions : null} />
                ))}
                {!goals.length && (
                  <section className="card">
                    <EmptyState
                      icon="plan"
                      title={showClosed ? "Keine abgeschlossenen Ziele" : "Noch keine aktiven Ziele"}
                      text={
                        showClosed
                          ? "Erreichte oder abgebrochene Ziele erscheinen hier."
                          : "Über „Pflegeziel hinzufügen“ das erste Ziel formulieren."
                      }
                    />
                  </section>
                )}
              </div>
            </>
          )}
          {detail.loading && !detail.data && <p className="list-hint">Pflegeplan wird geladen …</p>}
          {!resident && !overview.loading && (
            <EmptyState icon="residents" title="Keine Bewohner" text="Es sind keine aktiven Bewohner erfasst." />
          )}
        </section>
      </div>
      {planning.dialogs}
    </>
  );
}

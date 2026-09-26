"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import { WEEKDAYS, type MedOrder, type MedResident, type StockMovement } from "@/lib/medication-shared";
import {
  EmptyState,
  LoadError,
  PageHeading,
  formatDate,
  todayInZurich,
  useApiData,
  type ShowToast,
} from "@/app/components/workspace-ui";
import { useOrderDialogs } from "./order-dialogs";
import ResidentList, { AllergyBadge } from "@/app/components/resident-list";

export type ResidentsPayload = { residents: MedResident[]; canManage: boolean; canEditAllergies: boolean };
export type ResidentDetail = { orders: MedOrder[]; movements: StockMovement[] };

export function scheduleLabel(order: MedOrder) {
  const days = order.weekdays.length ? order.weekdays.map((d) => WEEKDAYS[d - 1]).join(", ") : "täglich";
  return { times: order.times.join(" · ") || "–", days };
}

export function orderTone(order: MedOrder): { tone: string; label: string } {
  if (order.status === "paused") return { tone: "info", label: "Pausiert" };
  if (order.endOn) {
    const daysLeft = (Date.parse(`${order.endOn}T12:00:00`) - Date.parse(`${todayInZurich()}T12:00:00`)) / 86_400_000;
    if (daysLeft < 0) return { tone: "critical", label: "Abgelaufen" };
    if (daysLeft <= 14) return { tone: "attention", label: "Läuft ab" };
  }
  if (order.startOn && order.startOn > todayInZurich())
    return { tone: "info", label: `Ab ${formatDate(order.startOn)}` };
  return { tone: "stable", label: "Aktiv" };
}

// Resident list plus the selected resident's orders; shared by plan and reserves.
export function useSelectedResident() {
  const residents = useApiData<ResidentsPayload>("/api/medication/residents");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = residents.data?.residents ?? [];
  const resident = list.find((item) => item.id === selectedId) ?? list[0] ?? null;
  const detail = useApiData<ResidentDetail>(resident ? `/api/medication/residents/${resident.id}` : null);
  return {
    residents,
    list,
    resident,
    setSelectedId,
    detail,
    reloadAll: () => {
      residents.reload();
      detail.reload();
    },
  };
}

export default function PlanView({ showToast }: { showToast: ShowToast }) {
  const { residents, list, resident, setSelectedId, detail, reloadAll } = useSelectedResident();
  const canManage = residents.data?.canManage ?? false;
  const { openCreate, openEdit, openAllergies, dialogs } = useOrderDialogs({
    resident,
    showToast,
    onChanged: reloadAll,
  });
  const orders = (detail.data?.orders ?? []).filter((order) => !order.isPrn);
  const prnCount = (detail.data?.orders ?? []).filter((order) => order.isPrn).length;
  const lastChange = orders.reduce<string | null>(
    (latest, o) => (!latest || o.updatedAt > latest ? o.updatedAt : latest),
    null,
  );

  return (
    <>
      <PageHeading
        eyebrow="CareCore Med"
        title="Medikamentenplan"
        description="Ärztliche Verordnungen, Dosierungen und Einnahmezeiten sicher im Blick."
        action={
          canManage
            ? { label: "Verordnung erfassen", onClick: () => openCreate(false), disabled: !resident }
            : undefined
        }
      />
      {residents.error && <LoadError message={residents.error} onRetry={residents.reload} />}
      <div className="medication-two-column">
        <ResidentList
          residents={list}
          selectedId={resident?.id ?? null}
          onSelect={setSelectedId}
          loading={residents.loading}
          countLabel={(r) => `${r.regularCount} Dauermedikation${r.regularCount === 1 ? "" : "en"}`}
        />
        <section className="med-main-column">
          {resident ? (
            <>
              <section className="card med-profile-head">
                <div className="care-profile-identity">
                  <span className="resident-avatar">{resident.initials}</span>
                  <div>
                    <p className="eyebrow">Aktueller Plan</p>
                    <h2>{resident.name}</h2>
                    <span>{[resident.room, resident.careUnit].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
                <div className="med-profile-flags">
                  <AllergyBadge allergies={resident.allergies} />
                  {residents.data?.canEditAllergies && (
                    <button className="secondary-button" type="button" onClick={openAllergies}>
                      Allergien bearbeiten
                    </button>
                  )}
                </div>
              </section>
              {detail.error && <LoadError message={detail.error} onRetry={detail.reload} />}
              <section className="card med-plan-card">
                <div className="card-header">
                  <div>
                    <p className="eyebrow">
                      {orders.length} Verordnung{orders.length === 1 ? "" : "en"}
                      {prnCount ? ` · ${prnCount} Reserve${prnCount === 1 ? "" : "n"} unter „Reserven“` : ""}
                    </p>
                    <h2 className="card-title">Regelmedikation</h2>
                  </div>
                  {lastChange && <span className="status-badge stable">Stand {formatDate(lastChange)}</span>}
                </div>
                <div className="med-plan-head">
                  <span>Präparat</span>
                  <span>Einnahme</span>
                  <span>Indikation</span>
                  <span>Verordnung</span>
                  <span>Status</span>
                </div>
                <div className="med-plan-list">
                  {orders.map((order) => {
                    const { times, days } = scheduleLabel(order);
                    const status = orderTone(order);
                    return (
                      <button
                        type="button"
                        key={order.id}
                        disabled={!canManage}
                        onClick={() => openEdit(order)}
                        aria-label={`${order.name} ${order.strength} bearbeiten`}
                      >
                        <span className="med-pill-icon">
                          <ModuleIcon name="med" />
                        </span>
                        <span>
                          <strong>{`${order.name} ${order.strength}`.trim()}</strong>
                          <small>{[order.form, order.route].filter(Boolean).join(" · ")}</small>
                        </span>
                        <span>
                          <strong>{times}</strong>
                          <small>
                            {order.amount} · {days}
                          </small>
                        </span>
                        <span>
                          <strong>{order.indication || "–"}</strong>
                          <small>seit {formatDate(order.startOn)}</small>
                        </span>
                        <span>
                          <strong>{order.prescribedBy}</strong>
                          <small>{order.endOn ? `bis ${formatDate(order.endOn)}` : "unbefristet"}</small>
                        </span>
                        <span className={`status-badge ${status.tone}`}>{status.label}</span>
                        <ModuleIcon name="chevron" />
                      </button>
                    );
                  })}
                  {!detail.loading && !orders.length && (
                    <EmptyState
                      title="Keine Regelmedikation verordnet"
                      text={
                        canManage
                          ? "Über „Verordnung erfassen“ eine ärztliche Verordnung eintragen."
                          : "Für diesen Bewohner sind keine Verordnungen erfasst."
                      }
                    />
                  )}
                  {detail.loading && !detail.data && <p className="list-hint">Verordnungen werden geladen …</p>}
                </div>
              </section>
            </>
          ) : (
            !residents.loading && (
              <EmptyState icon="residents" title="Keine Bewohner" text="Es sind keine aktiven Bewohner erfasst." />
            )
          )}
        </section>
      </div>
      {dialogs}
    </>
  );
}

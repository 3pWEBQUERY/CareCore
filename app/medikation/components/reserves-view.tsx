"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-page-shell";
import type { MedOrder } from "@/lib/medication-shared";
import {
  EmptyState,
  LoadError,
  EditorDialog,
  PageHeading,
  SummaryTiles,
  formatDate,
  formatDateTime,
  formatNumber,
  requestJson,
  timeInZurich,
  type ShowToast,
} from "@/app/components/workspace-ui";
import { useOrderDialogs } from "./order-dialogs";
import { orderTone, useSelectedResident } from "./plan-view";
import ResidentList, { AllergyBadge } from "./resident-list";
import { ReceiptDialog } from "./stock-dialogs";
import { MovementJournal } from "./stock-view";

function nextAllowedAt(order: MedOrder) {
  if (!order.lastAdministeredAt || !order.minIntervalHours) return null;
  const next = Date.parse(order.lastAdministeredAt) + order.minIntervalHours * 3_600_000;
  return next > Date.now() ? new Date(next) : null;
}

function availableStock(order: MedOrder) {
  if (order.residentStock !== null) return { amount: order.residentStock, source: "Bewohnerbestand" };
  if (order.wardStock !== null) return { amount: order.wardStock, source: "Stationsbestand" };
  return null;
}

export default function ReservesView({ showToast }: { showToast: ShowToast }) {
  const { residents, list, resident, setSelectedId, detail, reloadAll } = useSelectedResident();
  const canManage = residents.data?.canManage ?? false;
  const { openCreate, openEdit, dialogs } = useOrderDialogs({ resident, showToast, onChanged: reloadAll });
  const [administer, setAdminister] = useState<MedOrder | null>(null);
  const [receipt, setReceipt] = useState<MedOrder | null>(null);
  const reserves = (detail.data?.orders ?? []).filter((order) => order.isPrn);
  const done = (message: string) => {
    setAdminister(null);
    setReceipt(null);
    showToast(message);
    reloadAll();
  };

  return (
    <>
      <PageHeading
        eyebrow="CareCore Med"
        title="Reserven"
        description="Ärztlich verordnete Bedarfsmedikation mit geprüfter Maximaldosis und Mindestabstand."
        action={
          canManage ? { label: "Reserve verordnen", onClick: () => openCreate(true), disabled: !resident } : undefined
        }
      />
      <SummaryTiles
        label="Reservenübersicht"
        tiles={[
          { icon: "residents", value: list.filter((r) => r.prnCount > 0).length, caption: "Bewohner mit Reserve" },
          { icon: "med", value: list.reduce((sum, r) => sum + r.prnCount, 0), caption: "aktive Reserveverordnungen" },
          {
            icon: "alert",
            value: reserves.filter((o) => (availableStock(o)?.amount ?? 0) <= 3).length,
            caption: "Bestand knapp (Auswahl)",
            tone: "attention",
          },
          {
            icon: "check",
            value: reserves.reduce((sum, o) => sum + o.administeredLast24h, 0),
            caption: "Gaben 24 h (Auswahl)",
            tone: "info",
          },
        ]}
      />
      <section className="critical-alert med-reserve-alert">
        <span className="critical-symbol">
          <ModuleIcon name="alert" />
        </span>
        <div>
          <strong>Sicherheitsprüfung bei jeder Gabe</strong>
          <p>
            CareCore lässt eine Reservegabe nur mit gültiger Verordnung, eingehaltenem Mindestabstand, nicht erreichter
            Maximaldosis und vorhandenem Bestand zu.
          </p>
        </div>
      </section>
      {residents.error && <LoadError message={residents.error} onRetry={residents.reload} />}
      <div className="medication-two-column">
        <ResidentList
          residents={list}
          selectedId={resident?.id ?? null}
          onSelect={setSelectedId}
          loading={residents.loading}
          countLabel={(r) => (r.prnCount ? `${r.prnCount} Reserve${r.prnCount === 1 ? "" : "n"}` : "Keine Reserve")}
        />
        <section className="med-main-column">
          {resident && (
            <>
              <section className="card med-profile-head">
                <div className="care-profile-identity">
                  <span className="resident-avatar">{resident.initials}</span>
                  <div>
                    <p className="eyebrow">Bedarfsmedikation</p>
                    <h2>{resident.name}</h2>
                    <span>{[resident.room, resident.careUnit].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
                <AllergyBadge allergies={resident.allergies} />
              </section>
              {detail.error && <LoadError message={detail.error} onRetry={detail.reload} />}
              <section className="card med-reserve-card">
                <div className="card-header">
                  <div>
                    <p className="eyebrow">Ärztlich verordnet</p>
                    <h2 className="card-title">Verfügbare Reserven</h2>
                    <p className="card-subtitle">Gaben und Eingänge werden im Bestandsjournal protokolliert.</p>
                  </div>
                </div>
                <div className="med-reserve-list">
                  {reserves.map((order) => {
                    const stock = availableStock(order);
                    const next = nextAllowedAt(order);
                    const limitsMissing = !order.maxDosesPer24h || !order.minIntervalHours;
                    const maxReached =
                      order.maxDosesPer24h !== null && order.administeredLast24h >= order.maxDosesPer24h;
                    const status = orderTone(order);
                    const blocked = limitsMissing
                      ? "Grenzwerte fehlen"
                      : order.status === "paused"
                        ? "Pausiert"
                        : maxReached
                          ? "Maximaldosis erreicht"
                          : next
                            ? `Frühestens ${timeInZurich(next)} Uhr`
                            : !stock || stock.amount <= 0
                              ? "Kein Bestand"
                              : null;
                    return (
                      <article key={order.id}>
                        <div className="med-reserve-title">
                          <span className="med-pill-icon">
                            <ModuleIcon name="med" />
                          </span>
                          <span>
                            <strong>{`${order.name} ${order.strength}`.trim()}</strong>
                            <small>{order.indication || "Keine Indikation erfasst"}</small>
                          </span>
                          <span
                            className={`status-badge ${!stock ? "attention" : stock.amount <= 3 ? "critical" : stock.amount <= 8 ? "attention" : "stable"}`}
                          >
                            {stock
                              ? `${formatNumber(stock.amount)} ${order.stockUnit ?? ""} · ${stock.source}`
                              : "Kein Bestand erfasst"}
                          </span>
                        </div>
                        <div className="med-reserve-rules">
                          <span>
                            <small>Einzeldosis</small>
                            <strong>{order.amount}</strong>
                          </span>
                          <span>
                            <small>Maximaldosis</small>
                            <strong>
                              {order.maxDosesPer24h
                                ? `${order.administeredLast24h} von ${order.maxDosesPer24h} Gaben / 24 h`
                                : "nicht strukturiert"}
                            </strong>
                          </span>
                          <span>
                            <small>Mindestabstand</small>
                            <strong>
                              {order.minIntervalHours
                                ? `${formatNumber(order.minIntervalHours)} Stunden`
                                : "nicht strukturiert"}
                            </strong>
                            <em>
                              {order.lastAdministeredAt
                                ? `zuletzt ${formatDateTime(order.lastAdministeredAt)}`
                                : "noch nicht gegeben"}
                            </em>
                          </span>
                          <span>
                            <small>Verordnung</small>
                            <strong>{order.prescribedBy}</strong>
                            <em>{order.endOn ? `bis ${formatDate(order.endOn)}` : status.label}</em>
                          </span>
                        </div>
                        {(order.prnInstructions || limitsMissing) && (
                          <p className="med-reserve-note">
                            {limitsMissing && (
                              <strong>Maximaldosis und Mindestabstand fehlen – Verordnung ergänzen. </strong>
                            )}
                            {order.prnInstructions}
                          </p>
                        )}
                        {canManage && (
                          <div className="med-reserve-actions">
                            <button type="button" onClick={() => setReceipt(order)}>
                              <ModuleIcon name="plus" />
                              Eingang eintragen
                            </button>
                            <button type="button" onClick={() => openEdit(order)}>
                              Verordnung
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(blocked)}
                              title={blocked ?? undefined}
                              onClick={() => setAdminister(order)}
                            >
                              <span aria-hidden="true">−</span>
                              {blocked ?? "Gabe dokumentieren"}
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                  {!detail.loading && !reserves.length && (
                    <EmptyState
                      title="Keine Reserve verordnet"
                      text="Eine Reserve kann nur mit gültiger ärztlicher Verordnung angelegt werden."
                    />
                  )}
                  {detail.loading && !detail.data && <p className="list-hint">Reserven werden geladen …</p>}
                </div>
              </section>
              <MovementJournal movements={detail.data?.movements ?? []} title={`Bestandsjournal · ${resident.name}`} />
            </>
          )}
        </section>
      </div>
      {dialogs}
      {administer && resident && (
        <AdministerDialog
          order={administer}
          residentName={resident.name}
          onClose={() => setAdminister(null)}
          onSaved={done}
        />
      )}
      {receipt && resident && (
        <ReceiptDialog
          items={[]}
          careUnits={[]}
          residents={[{ id: resident.id, name: resident.name }]}
          preset={{
            residentId: resident.id,
            residentName: resident.name,
            name: receipt.name,
            strength: receipt.strength,
            form: receipt.form,
            unit: receipt.stockUnit ?? "Tabletten",
          }}
          onClose={() => setReceipt(null)}
          onSaved={done}
        />
      )}
    </>
  );
}

function AdministerDialog({
  order,
  residentName,
  onClose,
  onSaved,
}: {
  order: MedOrder;
  residentName: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(String(order.stockQuantity ?? 1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await requestJson("/api/medication/prn", {
        method: "POST",
        body: { orderId: order.id, note, quantity: Number(quantity.replace(",", ".")) },
      });
      onSaved(`${residentName}: ${order.name} – Reservegabe dokumentiert`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gabe konnte nicht dokumentiert werden.");
      setSaving(false);
    }
  };
  return (
    <EditorDialog
      id="med-prn"
      eyebrow={`CareCore Med · ${residentName}`}
      title={`${order.name} ${order.strength}`.trim()}
      description={`Einzeldosis ${order.amount} · max. ${order.maxDosesPer24h} Gaben / 24 h · Mindestabstand ${formatNumber(order.minIntervalHours ?? 0)} h · Indikation: ${order.indication}`}
      onClose={onClose}
      onSubmit={save}
      saving={saving}
      error={error}
      submitLabel="Gabe dokumentieren"
    >
      <label className="area-editor-wide">
        <span>Anlass und Einschätzung</span>
        <textarea
          autoFocus
          required
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z. B. Schmerzen Hüfte links, NRS 5 – Wirkung in 60 Min. prüfen"
        />
      </label>
      <label>
        <span>Ausgebuchte Menge ({order.stockUnit ?? "Einheiten"})</span>
        <input required inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </label>
    </EditorDialog>
  );
}

"use client";

import type { CareSupplyCatalogState } from "./use-care-supply-catalog";

export function CatalogKpis({ r }: { r: CareSupplyCatalogState }) {
  const { products, activeCount, blockedCount, archivedCount } = r;
  return (
    <section className="leadership-kpis" aria-label="Katalogübersicht">
      <article className="leadership-kpi info">
        <span className="leadership-kpi-value">{products.length}</span>
        <strong>Produkte im Katalog</strong>
        <small>alle erfassten Pflegeprodukte</small>
      </article>
      <article className="leadership-kpi stable">
        <span className="leadership-kpi-value">{activeCount}</span>
        <strong>Aktiv und buchbar</strong>
        <small>für Bewohnerakten verfügbar</small>
      </article>
      <article className="leadership-kpi attention">
        <span className="leadership-kpi-value">{blockedCount}</span>
        <strong>Gesperrt</strong>
        <small>derzeit nicht auswählbar</small>
      </article>
      <article className="leadership-kpi">
        <span className="leadership-kpi-value">{archivedCount}</span>
        <strong>Archiviert</strong>
        <small>nicht mehr im aktiven Katalog</small>
      </article>
    </section>
  );
}

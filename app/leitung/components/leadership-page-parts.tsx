"use client";

import { ModuleIcon } from "@/app/components/module-icon";
import type { Tone } from "./leadership-data";

export type Kpi = { value: string; label: string; note: string; tone?: Tone };

// Heading and KPI row shared by the database-backed leadership pages.
export function LeadershipHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; icon?: "plus" | "docs" };
}) {
  return (
    <section className="leadership-heading page-heading">
      <div className="heading-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && (
        <button className="primary-button" type="button" onClick={action.onClick}>
          <ModuleIcon name={action.icon ?? "plus"} className="button-icon" />
          {action.label}
        </button>
      )}
    </section>
  );
}

export function LeadershipKpis({ kpis }: { kpis: Kpi[] }) {
  return (
    <section className="leadership-kpis" aria-label="Leitungskennzahlen">
      {kpis.map((kpi) => (
        <article key={kpi.label} className={kpi.tone ? `leadership-kpi ${kpi.tone}` : "leadership-kpi"}>
          <span className="leadership-kpi-value">{kpi.value}</span>
          <strong>{kpi.label}</strong>
          <small>{kpi.note}</small>
        </article>
      ))}
    </section>
  );
}

export const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

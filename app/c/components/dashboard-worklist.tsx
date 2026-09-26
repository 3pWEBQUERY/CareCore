"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCareResident, useCareUnit, useWorkContext } from "@/app/components/care-context";
import { ModuleIcon, type ModuleIconName } from "@/app/components/module-icon";
import { useApiData } from "@/app/components/workspace-ui";
import type { WorkItem, WorkItemKind, Worklist } from "@/lib/worklist";

const KIND_ICONS: Record<WorkItemKind, ModuleIconName> = {
  medication: "med",
  vitals: "vitals",
  wound: "wounds",
  assessment: "assess",
  plan: "plan",
  documentation: "note",
  task: "tasks",
};
const FILTERS = [
  { id: "all", label: "Alle" },
  { id: "urgent", label: "Dringend" },
] as const;

// "Mein Dienst": what is due today, per resident of the care unit chosen in the header.
export function DashboardWorklistCard() {
  const router = useRouter();
  const context = useWorkContext();
  const [storedUnitId] = useCareUnit();
  const unitId = storedUnitId ?? context?.profile.primaryCareUnitId ?? null;
  const unitName = context?.careUnits.find((unit) => unit.id === unitId)?.name ?? "alle Wohnbereiche";
  const data = useApiData<Worklist>(context ? `/api/worklist${unitId ? `?careUnitId=${unitId}` : ""}` : null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const residents = (data.data?.residents ?? [])
    .map((resident) => ({
      ...resident,
      items: filter === "urgent" ? resident.items.filter((item) => item.tone !== "info") : resident.items,
    }))
    .filter((resident) => resident.items.length);
  const open = (residentId: string, item: WorkItem) => {
    setCareResident(residentId);
    router.push(item.href);
  };
  const total = residents.reduce((sum, resident) => sum + resident.items.length, 0);

  return (
    <section className="card worklist-card" aria-labelledby="worklist-title">
      <div className="card-header">
        <div>
          <h2 className="card-title" id="worklist-title">
            Mein Dienst · Tagesliste
          </h2>
          <p className="card-subtitle">
            {data.loading && !data.data
              ? "Wird geladen …"
              : `${total} offene Punkte bei ${residents.length} Bewohner${residents.length === 1 ? "" : "n"} · ${unitName}`}
          </p>
        </div>
        <div className="worklist-filters" role="group" aria-label="Tagesliste filtern">
          {FILTERS.map((item) => (
            <button
              className={filter === item.id ? "active" : ""}
              type="button"
              key={item.id}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {data.error && <p className="worklist-empty">{data.error}</p>}
      <div className="worklist-list">
        {residents.map((resident) => (
          <article className="worklist-resident" key={resident.id}>
            <button
              className="worklist-person"
              type="button"
              onClick={() => {
                setCareResident(resident.id);
                router.push(`/c/bewohner?resident=${resident.id}`);
              }}
              title="Bewohnerakte öffnen"
            >
              <span
                className={`resident-avatar ${resident.items.some((item) => item.tone === "critical") ? "critical" : ""}`}
              >
                {resident.initials}
              </span>
              <span>
                <strong>{resident.name}</strong>
                <small>{[resident.room, resident.careUnit].filter(Boolean).join(" · ")}</small>
              </span>
            </button>
            <div className="worklist-items">
              {resident.items.map((item) => (
                <button
                  className={`worklist-item ${item.tone}`}
                  type="button"
                  key={`${item.kind}-${item.label}`}
                  title={item.detail}
                  onClick={() => open(resident.id, item)}
                >
                  <ModuleIcon name={KIND_ICONS[item.kind]} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          </article>
        ))}
        {!data.loading && data.data && !residents.length && (
          <p className="worklist-empty">
            <ModuleIcon name="check" />{" "}
            {filter === "urgent" ? "Nichts Dringendes offen." : "Alles erledigt – keine offenen Punkte."}
          </p>
        )}
      </div>
    </section>
  );
}

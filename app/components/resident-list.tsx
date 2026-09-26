"use client";

import { useState } from "react";
import { ModuleIcon } from "@/app/components/module-icon";

// Minimal resident fields the list needs; modules pass their own richer types.
export type ListResident = { id: string; name: string; initials: string; room: string; careUnit: string };

// Searchable resident list used by the medication and care planning workspaces.
export default function ResidentList<T extends ListResident>({
  residents,
  selectedId,
  onSelect,
  loading,
  countLabel,
}: {
  residents: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  countLabel: (resident: T) => string;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("de-CH");
  const filtered = residents.filter((resident) =>
    `${resident.name} ${resident.room} ${resident.careUnit}`.toLocaleLowerCase("de-CH").includes(needle),
  );
  return (
    <section className="card med-resident-browser">
      <div className="med-resident-toolbar">
        <div>
          <h2 className="card-title">Bewohner</h2>
          <p className="card-subtitle">
            {loading && !residents.length ? "Wird geladen …" : `${filtered.length} von ${residents.length} Bewohnern`}
          </p>
        </div>
        <label className="resident-search">
          <ModuleIcon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Bewohner oder Zimmer"
            aria-label="Bewohner durchsuchen"
          />
        </label>
      </div>
      <div className="med-resident-list">
        {filtered.map((resident) => (
          <button
            className={resident.id === selectedId ? "selected" : ""}
            type="button"
            key={resident.id}
            aria-pressed={resident.id === selectedId}
            onClick={() => onSelect(resident.id)}
          >
            <span className="resident-avatar">{resident.initials}</span>
            <span>
              <strong>{resident.name}</strong>
              <small>
                {[resident.room, resident.careUnit].filter(Boolean).join(" · ") || "Kein Zimmer zugeordnet"}
              </small>
              <em>{countLabel(resident)}</em>
            </span>
            <ModuleIcon name="chevron" />
          </button>
        ))}
        {!loading && !filtered.length && (
          <p className="list-hint">{residents.length ? "Keine Treffer." : "Keine aktiven Bewohner erfasst."}</p>
        )}
      </div>
    </section>
  );
}

export function AllergyBadge({ allergies }: { allergies: string | null }) {
  if (allergies === null) return <span className="status-badge attention">Allergien nicht erfasst</span>;
  const none = /^(keine|keine bekannt|nicht bekannt)$/i.test(allergies.trim());
  return (
    <span className={`status-badge ${none ? "stable" : "critical"}`} title={allergies}>
      Allergien: {allergies}
    </span>
  );
}

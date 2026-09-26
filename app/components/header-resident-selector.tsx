"use client";

import { useResidentNavigation } from "./care-context";
import { ModuleIcon } from "./module-icon";
import type { AppHeaderState } from "./use-app-header";

export function HeaderResidentSelector({ r, compact = false }: { r: AppHeaderState; compact?: boolean }) {
  const { residentOpen, setResidentOpen, selectedResident, closeMenus } = r;
  const navigation = useResidentNavigation();
  return (
    <div className={`resident-context-wrap ${compact ? "mobile-resident-context-wrap" : ""}`}>
      <button
        className={`resident-context-trigger ${compact ? "mobile-resident-context-trigger" : ""} ${residentOpen ? "open" : ""}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={residentOpen}
        aria-label={compact ? "Bewohner auswählen" : undefined}
        onClick={() => {
          closeMenus();
          setResidentOpen(true);
        }}
      >
        <span className={`resident-context-avatar ${selectedResident?.tone ?? ""}`}>
          {selectedResident?.initials ?? "…"}
        </span>
        {!compact && (
          <span className="resident-context-copy">
            <small>Bewohner</small>
            <strong>{selectedResident?.name ?? "Bewohner auswählen"}</strong>
          </span>
        )}
        <ModuleIcon name="chevron" className="chevron" />
      </button>
      {!compact && navigation.total > 1 && (
        <span className="resident-context-nav" aria-label="Zwischen Bewohnern blättern">
          <button
            type="button"
            aria-label="Vorheriger Bewohner"
            title="Vorheriger Bewohner"
            onClick={navigation.previous}
          >
            <ModuleIcon name="chevron" className="up" />
          </button>
          <small>
            {navigation.position} / {navigation.total}
          </small>
          <button type="button" aria-label="Nächster Bewohner" title="Nächster Bewohner" onClick={navigation.next}>
            <ModuleIcon name="chevron" className="down" />
          </button>
        </span>
      )}
    </div>
  );
}

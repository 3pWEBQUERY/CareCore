"use client";

import ModulePageShell from "@/app/components/module-page-shell";
import { DueView, OverviewView } from "./assessment-views";

export default function AssessmentsWorkspace({ view }: { view: "overview" | "due" }) {
  return (
    <ModulePageShell
      activeModule="assess"
      activeChild={view === "overview" ? "Einschätzungen" : "Fälligkeiten"}
      pageClass="operations-page assessments-page"
      locationSecondary="Gesamtes Haus · alle Wohnbereiche"
    >
      {(showToast) => (
        <main className="workspace module-workspace operations-workspace">
          {view === "overview" ? <OverviewView showToast={showToast} /> : <DueView showToast={showToast} />}
        </main>
      )}
    </ModulePageShell>
  );
}

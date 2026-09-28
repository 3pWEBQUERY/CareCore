"use client";

import ModulePageShell from "@/app/components/module-page-shell";
import BtmView from "./btm-view";
import PlanView from "./plan-view";
import ReservesView from "./reserves-view";
import RoundView from "./round-view";
import StockView from "./stock-view";

type MedicationView = "plan" | "round" | "stocks" | "reserves" | "btm";

const navigationLabel: Record<MedicationView, string> = {
  plan: "Medikamentenplan",
  round: "Medikamentenrunde",
  stocks: "Bestände",
  reserves: "Reserven",
  btm: "BtM-Kontrolle",
};

export default function MedicationWorkspace({ view }: { view: MedicationView }) {
  return (
    <ModulePageShell
      activeModule="med"
      activeChild={navigationLabel[view]}
      pageClass={`medication-page medication-${view}`}
      locationSecondary="Gesamtes Haus · alle Wohnbereiche"
    >
      {(showToast) => (
        <main className="workspace module-workspace">
          {view === "plan" && <PlanView showToast={showToast} />}
          {view === "round" && <RoundView showToast={showToast} />}
          {view === "stocks" && <StockView showToast={showToast} />}
          {view === "reserves" && <ReservesView showToast={showToast} />}
          {view === "btm" && <BtmView showToast={showToast} />}
        </main>
      )}
    </ModulePageShell>
  );
}

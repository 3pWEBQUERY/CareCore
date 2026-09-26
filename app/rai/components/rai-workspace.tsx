"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModulePageShell from "@/app/components/module-page-shell";
import { ModuleIcon } from "@/app/components/module-icon";
import { RaiView, meta } from "./rai-data";
import { OverviewView } from "./rai-overview-view";
import { AssessmentView } from "./rai-assessment-view";
import { DueView, ReportsView } from "./rai-due-reports-views";
import { RaiRefreshPopover } from "./rai-refresh-popover";

export default function RaiWorkspace({ view }: { view: RaiView }) {
  const router = useRouter();
  const current = meta[view];
  const [refreshOpen, setRefreshOpen] = useState(false);
  return (
    <ModulePageShell
      activeModule="rai"
      activeChild={current.child}
      pageClass={`rai-page rai-${view}`}
      locationSecondary="Gesamtes Haus · alle Wohnbereiche"
    >
      {(showToast) => (
        <>
          <main className="workspace module-workspace rai-workspace">
            <section className="page-heading care-page-heading" aria-labelledby="rai-title">
              <div className="heading-copy">
                <p className="eyebrow">CareCore RAI</p>
                <h1 id="rai-title">{current.title}</h1>
                <p>{current.description}</p>
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  view === "overview"
                    ? router.push("/rai/erfassung")
                    : view === "due"
                      ? setRefreshOpen(true)
                      : showToast(`${current.action} vorbereitet`)
                }
              >
                <ModuleIcon name={view === "overview" ? "plus" : "check"} className="button-icon" />
                {current.action}
              </button>
            </section>
            {view === "overview" && <OverviewView showToast={showToast} />}{" "}
            {view === "assessment" && <AssessmentView showToast={showToast} />}{" "}
            {view === "due" && <DueView showToast={showToast} />}{" "}
            {view === "reports" && <ReportsView showToast={showToast} />}
          </main>
          <RaiRefreshPopover open={refreshOpen} onClose={() => setRefreshOpen(false)} showToast={showToast} />
        </>
      )}
    </ModulePageShell>
  );
}

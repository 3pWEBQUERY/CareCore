"use client";

import { useState } from "react";
import { OperationsFrame } from "./operations-ui";
import { Dialog } from "./schedule-utils";
import { ScheduleView } from "./schedule-view";

export default function ScheduleWorkspace({ team }: { team: boolean }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [canManage, setCanManage] = useState(false);
  const planning = team && canManage;
  return (
    <OperationsFrame
      module="schedule"
      child={team ? "Teamplanung" : "Mein Dienstplan"}
      view={team ? "teamSchedule" : "schedule"}
      eyebrow="CareCore Schedule"
      title={team ? "Teamplanung" : "Mein Dienstplan"}
      description={
        team
          ? "Besetzung, Rollen und offene Dienste im gesamten Team."
          : "Deine Einsätze, Arbeitszeiten und Abwesenheiten auf einen Blick."
      }
      action={{
        label: planning ? "Dienst einteilen" : "Abwesenheit melden",
        onClick: () => setDialog(planning ? { kind: "duty", day: "" } : { kind: "absence" }),
      }}
    >
      {(showToast) => (
        <ScheduleView
          team={team}
          showToast={showToast}
          dialog={dialog}
          setDialog={setDialog}
          onCanManage={setCanManage}
        />
      )}
    </OperationsFrame>
  );
}

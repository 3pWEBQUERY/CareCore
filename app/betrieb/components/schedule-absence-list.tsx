"use client";

import { ModuleIcon } from "@/app/components/module-page-shell";
import { formatDateTime } from "@/app/components/workspace-ui";
import { ABSENCE_KINDS, ABSENCE_STATUS, weekdaysBetween, type SchedulePayload } from "@/lib/schedule-shared";
import { shortDay, Dialog } from "./schedule-utils";

export function AbsenceList({
  data,
  team,
  run,
  setDialog,
}: {
  data: SchedulePayload;
  team: boolean;
  run: (url: string, body: unknown, message: string) => void;
  setDialog: (dialog: Dialog) => void;
}) {
  const requests = data.requests;
  return (
    <section className="card operations-list-card">
      <div className="operations-toolbar">
        <div>
          <h2 className="card-title">{team ? "Abwesenheitsanträge" : "Deine Abwesenheiten"}</h2>
          <p className="card-subtitle">
            {team
              ? `${requests.filter((a) => a.status === "requested").length} offen · Entscheide der letzten 14 Tage`
              : "Anträge, Krankmeldungen und Entscheide der letzten 60 Tage"}
          </p>
        </div>
      </div>
      <div className="operations-history-list absence-list">
        {requests.map((absence) => {
          const status = ABSENCE_STATUS[absence.status];
          const days = weekdaysBetween(absence.startsOn, absence.endsOn);
          return (
            <article key={absence.id}>
              <span className="operations-date">
                <strong>{team ? absence.name : ABSENCE_KINDS[absence.kind]}</strong>
                <small>
                  {team ? `${ABSENCE_KINDS[absence.kind]} · ` : ""}beantragt {formatDateTime(absence.createdAt)}
                </small>
              </span>
              <span>
                <strong>
                  {shortDay(absence.startsOn)}
                  {absence.endsOn !== absence.startsOn ? ` – ${shortDay(absence.endsOn)}` : ""}
                </strong>
                <small>
                  {days} {days === 1 ? "Arbeitstag" : "Arbeitstage"}
                  {absence.urgent ? " · dringend" : ""}
                </small>
              </span>
              <span>
                <strong>{absence.substituteName ? `Vertretung: ${absence.substituteName}` : "Ohne Vertretung"}</strong>
                <small>
                  {absence.decisionNote
                    ? `${absence.decidedByName ?? "Leitung"}: ${absence.decisionNote}`
                    : (absence.note ?? "–")}
                </small>
              </span>
              <span className={`status-badge ${status.tone}`}>{status.label}</span>
              <span className="absence-actions">
                {team && data.canManage && absence.status === "requested" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        run(`/api/schedule/absences/${absence.id}`, { action: "approve" }, "Abwesenheit bewilligt")
                      }
                    >
                      Bewilligen
                    </button>
                    <button type="button" onClick={() => setDialog({ kind: "reject", absence })}>
                      Ablehnen
                    </button>
                  </>
                )}
                {team && data.canManage && absence.status === "approved" && absence.endsOn >= data.today && (
                  <button type="button" onClick={() => setDialog({ kind: "revoke", absence })}>
                    Aufheben
                  </button>
                )}
                {!team && absence.status === "requested" && (
                  <button
                    type="button"
                    onClick={() =>
                      run(`/api/schedule/absences/${absence.id}`, { action: "withdraw" }, "Antrag zurückgezogen")
                    }
                  >
                    Zurückziehen
                  </button>
                )}
              </span>
            </article>
          );
        })}
        {!requests.length && (
          <div className="resident-empty">
            <ModuleIcon name="check" />
            <strong>{team ? "Keine offenen Anträge" : "Keine Abwesenheiten"}</strong>
            <p>
              {team
                ? "Neue Anträge erscheinen hier zur Bewilligung."
                : "Über „Abwesenheit melden“ erfasst du Ferien, Weiterbildung oder Krankheit."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

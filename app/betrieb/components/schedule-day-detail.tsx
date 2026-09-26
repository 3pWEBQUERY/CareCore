"use client";

import { ModuleIcon } from "@/app/components/module-icon";
import { ABSENCE_KINDS, ABSENCE_STATUS, ASSIGNMENT_STATUS, activeAssignments, openSlots } from "@/lib/schedule-shared";
import { personInitials } from "@/lib/tasks-shared";
import { ALL_UNITS, shortDay, longDay, times } from "./schedule-utils";
import type { ScheduleViewState } from "./use-schedule-view";

export function ScheduleDayDetail({ r }: { r: ScheduleViewState }) {
  const { team, setDialog, unitId, busy, schedule, data, now, today, day, myAssignment, shiftsOn, absencesOn, run } = r;
  return (
    <div className="schedule-day-detail">
      <div>
        <p className="eyebrow">{longDay(day)}</p>
        <h3>{team ? "Besetzung" : "Deine Einsätze"}</h3>
        <p>
          {team
            ? `${data?.careUnits.find((unit) => unit.id === unitId)?.name ?? ALL_UNITS} · ${shiftsOn(day).length} ${shiftsOn(day).length === 1 ? "Dienst" : "Dienste"}`
            : (shiftsOn(day)[0]?.careUnit ?? "Keine Einteilung")}
        </p>
        {team && data?.canManage && day >= today && (
          <button
            className="quiet-button schedule-day-add"
            type="button"
            onClick={() => setDialog({ kind: "duty", day })}
          >
            <ModuleIcon name="plus" /> Dienst an diesem Tag einteilen
          </button>
        )}
      </div>
      <div className="schedule-day-list">
        {!data && schedule.loading && <p className="list-hint">Dienstplan wird geladen …</p>}
        {data &&
          team &&
          shiftsOn(day).map((shift) => {
            const open = openSlots(shift);
            const future = Date.parse(shift.endsAt) > now;
            return (
              <div className={`schedule-shift-group ${shift.highlight ? "highlight" : ""}`} key={shift.id}>
                <header>
                  <strong>
                    {shift.name} · {times(shift)}
                  </strong>
                  <small>
                    {shift.careUnit ?? "Ohne Wohnbereich"} · {activeAssignments(shift).length}/{shift.requiredStaff}{" "}
                    besetzt
                    {shift.note ? ` · ${shift.note}` : ""}
                  </small>
                </header>
                <div className="schedule-team-grid">
                  {shift.assignments.map((assignment) => (
                    <button
                      type="button"
                      key={assignment.id}
                      className={assignment.status === "absent" ? "absent" : ""}
                      disabled={!data.canManage || !future || Boolean(assignment.checkedInAt)}
                      title={data.canManage && future ? "Einteilung entfernen" : undefined}
                      onClick={() => setDialog({ kind: "remove", shift, assignment })}
                    >
                      <span className="avatar">{personInitials(assignment.name)}</span>
                      <span>
                        <strong>{assignment.name}</strong>
                        <small>
                          {assignment.status === "absent"
                            ? `Abwesend · ${assignment.absenceReason ?? ""}`
                            : `${assignment.role ?? "Mitarbeitende:r"} · ${assignment.checkedInAt ? "im Dienst" : ASSIGNMENT_STATUS[assignment.status].label}`}
                        </small>
                      </span>
                    </button>
                  ))}
                  {Array.from({ length: future ? open : 0 }, (_, index) => (
                    <button
                      type="button"
                      key={`open-${index}`}
                      className="open-slot"
                      disabled={busy}
                      onClick={() =>
                        data.canManage
                          ? setDialog({ kind: "assign", shift })
                          : run(`/api/schedule/shifts/${shift.id}`, { action: "take" }, "Dienst übernommen")
                      }
                    >
                      <span className="avatar">
                        <ModuleIcon name="plus" />
                      </span>
                      <span>
                        <strong>Offener Dienst</strong>
                        <small>{data.canManage ? "Person einteilen" : "Dienst übernehmen"}</small>
                      </span>
                    </button>
                  ))}
                </div>
                {data.canManage && future && !activeAssignments(shift).length && (
                  <button
                    className="quiet-button"
                    type="button"
                    onClick={() => setDialog({ kind: "cancelShift", shift })}
                  >
                    Dienst streichen
                  </button>
                )}
              </div>
            );
          })}
        {data &&
          !team &&
          shiftsOn(day).map((shift) => {
            const assignment = myAssignment(shift);
            if (!assignment) return null;
            const status = assignment.checkedOutAt
              ? { label: "Geleistet", tone: "stable" }
              : assignment.checkedInAt
                ? { label: "Im Dienst", tone: "info" }
                : ASSIGNMENT_STATUS[assignment.status];
            return (
              <div className="schedule-shift-detail" key={shift.id}>
                <span className="schedule-shift-icon">
                  <ModuleIcon name="shift" />
                </span>
                <span>
                  <strong>
                    {times(shift)} · {shift.name}
                  </strong>
                  <small>
                    {assignment.status === "absent"
                      ? `Abwesend · ${assignment.absenceReason ?? ""}`
                      : [shift.careUnit, assignment.role, shift.note].filter(Boolean).join(" · ")}
                  </small>
                </span>
                {assignment.status === "scheduled" && Date.parse(shift.startsAt) > now ? (
                  <button
                    className="primary-button schedule-confirm"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(`/api/schedule/assignments/${assignment.id}`, { action: "confirm" }, "Dienst bestätigt")
                    }
                  >
                    <ModuleIcon name="check" /> Bestätigen
                  </button>
                ) : (
                  <span className={`status-badge ${status.tone}`}>{status.label}</span>
                )}
              </div>
            );
          })}
        {data &&
          absencesOn(day).map((absence) => (
            <div className="schedule-shift-detail absence" key={absence.id}>
              <span className="schedule-shift-icon">
                <ModuleIcon name="calendar" />
              </span>
              <span>
                <strong>
                  {team ? `${absence.name} · ` : ""}
                  {ABSENCE_KINDS[absence.kind]}
                </strong>
                <small>
                  {shortDay(absence.startsOn)} – {shortDay(absence.endsOn)}
                  {absence.substituteName ? ` · Vertretung ${absence.substituteName}` : ""}
                </small>
              </span>
              <span className={`status-badge ${ABSENCE_STATUS[absence.status].tone}`}>
                {ABSENCE_STATUS[absence.status].label}
              </span>
            </div>
          ))}
        {data && !shiftsOn(day).length && !absencesOn(day).length && (
          <div className="schedule-shift-detail">
            <span className="schedule-shift-icon">
              <ModuleIcon name="shift" />
            </span>
            <span>
              <strong>{team ? "Keine Dienste" : "Frei"}</strong>
              <small>{team ? "Für diesen Tag ist noch nichts geplant." : "Keine Einteilung geplant"}</small>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

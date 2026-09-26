"use client";

import { ModuleIcon } from "@/app/components/module-page-shell";
import { openSlots } from "@/lib/schedule-shared";
import { ScheduleSelect } from "./operations-ui";
import {
  WEEKDAYS,
  ALL_UNITS,
  weekdayIndex,
  monthLabel,
  isoWeek,
  shortDay,
  longDay,
  shortShiftLabel,
} from "./schedule-utils";
import type { ScheduleViewState } from "./use-schedule-view";

export function ScheduleCalendarHeader({ r }: { r: ScheduleViewState }) {
  const {
    team,
    showToast,
    mode,
    setMode,
    setAnchor,
    setSelected,
    unitId,
    setUnitId,
    base,
    from,
    data,
    today,
    day,
    move,
  } = r;
  return (
    <div className="card-header">
      <div>
        <p className="eyebrow">{mode === "month" ? monthLabel(base) : `${monthLabel(from)} · KW ${isoWeek(from)}`}</p>
        <h2 className="card-title">{team ? "Teamplanung" : mode === "month" ? "Dein Monat" : "Deine Woche"}</h2>
      </div>
      <div className="schedule-controls">
        {team && (
          <ScheduleSelect
            label="Wohnbereich"
            value={data?.careUnits.find((unit) => unit.id === unitId)?.name ?? ALL_UNITS}
            options={[ALL_UNITS, ...(data?.careUnits ?? []).map((unit) => unit.name)]}
            onChange={(name) => setUnitId(data?.careUnits.find((unit) => unit.name === name)?.id ?? "")}
          />
        )}
        <div className="schedule-view-switch" role="group" aria-label="Zeitraum wechseln">
          <button
            type="button"
            aria-label={mode === "week" ? "Vorherige Woche" : "Vorheriger Monat"}
            onClick={() => move(-1)}
          >
            <ModuleIcon name="chevron" className="previous" />
          </button>
          <button
            type="button"
            aria-label={mode === "week" ? "Nächste Woche" : "Nächster Monat"}
            onClick={() => move(1)}
          >
            <ModuleIcon name="chevron" />
          </button>
        </div>
        <div className="schedule-view-switch" role="group" aria-label="Kalenderansicht">
          {(["week", "month"] as const).map((value) => (
            <button
              key={value}
              className={mode === value ? "active" : ""}
              type="button"
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value);
                setAnchor(day);
                setSelected(day);
              }}
            >
              {value === "week" ? "Woche" : "Monat"}
            </button>
          ))}
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setAnchor(null);
            setSelected(null);
            showToast(`Auf heute, ${longDay(today)}, gesprungen`);
          }}
        >
          Heute
        </button>
      </div>
    </div>
  );
}

export function ScheduleWeek({ r }: { r: ScheduleViewState }) {
  const { team, setSelected, today, day, visibleDays, myAssignment, shiftsOn, absencesOn } = r;
  return (
    <div className="schedule-week">
      {visibleDays.map((d) => {
        const list = shiftsOn(d);
        const working = team ? list.length > 0 : list.some((shift) => myAssignment(shift)?.status !== "absent");
        const open = team && list.some((shift) => openSlots(shift) > 0);
        return (
          <button
            className={`${day === d ? "active" : ""} ${d === today ? "today" : ""}`}
            type="button"
            key={d}
            onClick={() => setSelected(d)}
            aria-label={`${longDay(d)}${working ? ", Dienst geplant" : ""}${open ? ", offene Dienste" : ""}`}
          >
            <strong>{WEEKDAYS[weekdayIndex(d)]}</strong>
            <span>{shortDay(d)}</span>
            <i className={open ? "has-open" : working ? "has-shift" : absencesOn(d).length ? "has-absence" : ""} />
          </button>
        );
      })}
    </div>
  );
}

export function ScheduleMonth({ r }: { r: ScheduleViewState }) {
  const { team, setSelected, base, today, day, visibleDays, myAssignment, shiftsOn, absencesOn } = r;
  return (
    <div className="schedule-month">
      <div className="schedule-month-weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="schedule-month-grid">
        {visibleDays.map((d) => {
          if (d.slice(0, 7) !== base.slice(0, 7))
            return <span className="schedule-month-empty" aria-hidden="true" key={d} />;
          const list = shiftsOn(d);
          const mineToday = list.find((shift) => myAssignment(shift));
          const myStatus = mineToday ? myAssignment(mineToday)?.status : undefined;
          const absent = !team && (myStatus === "absent" || absencesOn(d).some((a) => a.status === "approved"));
          const open = list.reduce((sum, shift) => sum + openSlots(shift), 0);
          const label = team
            ? list.length
              ? open
                ? `${open} offen`
                : `${list.length} ${list.length === 1 ? "Dienst" : "Dienste"}`
              : "–"
            : absent
              ? "Abwesend"
              : mineToday
                ? shortShiftLabel(mineToday.name)
                : "Frei";
          return (
            <button
              className={`${day === d ? "active" : ""} ${d === today ? "today" : ""}`}
              type="button"
              key={d}
              onClick={() => setSelected(d)}
              aria-label={`${longDay(d)}, ${label}`}
            >
              <strong>{Number(d.slice(8, 10))}</strong>
              <span
                className={
                  absent ? "absent" : open ? "open" : list.length && (team || mineToday) ? "has-shift" : "free"
                }
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

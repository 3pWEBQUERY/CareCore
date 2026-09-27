"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowsLeftRight, Heart, Sparkle, Star, Timer, Warning } from "@phosphor-icons/react";
import { formatHours, formatSignedMinutes, localTime } from "@/lib/roster/time";
import { WEEKDAY_SHORT } from "@/lib/roster/types";
import type { GridDay, GridEmployee, GridShift, SchedulePayload } from "@/lib/roster/view-types";

const cellId = (employeeId: string, date: string) => `${employeeId}|${date}`;

// Deutsch für Screenreader beim Ziehen mit Tastatur oder Maus.
const announcements = (shiftLabel: (id: string) => string, cellLabel: (id: string) => string): Announcements => ({
  onDragStart: ({ active }) => `${shiftLabel(String(active.id))} aufgenommen.`,
  onDragOver: ({ active, over }) =>
    over
      ? `${shiftLabel(String(active.id))} über ${cellLabel(String(over.id))}.`
      : `${shiftLabel(String(active.id))} ausserhalb des Rasters.`,
  onDragEnd: ({ active, over }) =>
    over ? `${shiftLabel(String(active.id))} abgelegt bei ${cellLabel(String(over.id))}.` : "Verschieben abgebrochen.",
  onDragCancel: () => "Verschieben abgebrochen.",
});

export function shiftTooltip(shift: GridShift, data: SchedulePayload) {
  if (shift.masked) return "Abwesend";
  const tz = data.timezone;
  const parts = [
    `${shift.name} (${shift.code})`,
    `${localTime(shift.plannedStart, tz)}–${localTime(shift.plannedEnd, tz)}`,
    shift.category === "ABSENCE" ? "" : `${formatHours(shift.netMinutes)} netto, Pause ${shift.breakMinutes} Min`,
    shift.entry?.clockOut
      ? `Ist ${localTime(shift.entry.clockIn, tz)}–${localTime(shift.entry.clockOut, tz)}, Differenz ${formatSignedMinutes(shift.entry.differenceMinutes ?? 0)}`
      : shift.entry
        ? `Eingestempelt ${localTime(shift.entry.clockIn, tz)}`
        : "",
    shift.swapped ? `↔ Getauscht (${shift.swapped.with})` : "",
    shift.source === "AI" ? "Von der KI vorgeschlagen" : "",
    ...shift.violations.map((v) => `⚠ ${v.message}`),
  ];
  return parts.filter(Boolean).join("\n");
}

function ShiftChip({
  shift,
  data,
  draggable,
  onOpen,
  overlay,
}: {
  shift: GridShift;
  data: SchedulePayload;
  draggable: boolean;
  onOpen?: () => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shift.id,
    disabled: !draggable || overlay,
  });
  const warn = shift.violations.some((v) => v.severity !== "INFO");
  const deviation = shift.entry?.differenceMinutes ?? null;
  const bigDeviation = deviation !== null && Math.abs(deviation) >= data.ruleSet.deviationThresholdMinutes;
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`roster-chip ${shift.category.toLowerCase()} ${isDragging && !overlay ? "dragging" : ""} ${warn ? "has-warning" : ""}`}
      style={{ "--chip-color": shift.color } as React.CSSProperties}
      title={shiftTooltip(shift, data)}
      aria-label={`${shift.masked ? "Abwesend" : `${shift.name} ${localTime(shift.plannedStart, data.timezone)} bis ${localTime(shift.plannedEnd, data.timezone)}`}${warn ? ", mit Warnung" : ""}`}
      onClick={onOpen}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
    >
      <strong>{shift.code}</strong>
      {!shift.masked && shift.category !== "ABSENCE" && (
        <small>
          {localTime(shift.plannedStart, data.timezone).replace(/:00$/, "")}–
          {localTime(shift.plannedEnd, data.timezone).replace(/:00$/, "")}
        </small>
      )}
      <span className="roster-chip-badges" aria-hidden="true">
        {shift.swapped && <ArrowsLeftRight />}
        {shift.source === "AI" && <Sparkle />}
        {warn && <Warning />}
        {bigDeviation && <Timer />}
      </span>
    </button>
  );
}

function Cell({
  employee,
  day,
  shifts,
  data,
  canEdit,
  focused,
  highlight,
  onFocusCell,
  onCreate,
  onOpen,
  onKeyDown,
  children,
}: {
  employee: GridEmployee;
  day: GridDay;
  shifts: GridShift[];
  data: SchedulePayload;
  canEdit: boolean;
  focused: boolean;
  highlight: boolean;
  onFocusCell: () => void;
  onCreate: () => void;
  onOpen: (shift: GridShift) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  children?: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: cellId(employee.id, day.date), disabled: !canEdit });
  const timeOff = employee.timeOff.find(
    (t) => t.startDate <= day.date && t.endDate >= day.date && (t.status === "OPEN" || t.status === "APPROVED"),
  );
  return (
    <td
      className={`roster-cell ${day.weekend ? "weekend" : ""} ${day.holiday ? "holiday" : ""} ${day.today ? "today" : ""} ${highlight ? "highlight" : ""}`}
    >
      <div
        ref={setNodeRef}
        className={`roster-cell-inner ${isOver ? "drop-over" : ""}`}
        role="gridcell"
        tabIndex={focused ? 0 : -1}
        data-cell={cellId(employee.id, day.date)}
        aria-label={`${employee.name}, ${WEEKDAY_SHORT[day.weekday - 1]} ${day.date.slice(8)}.${day.date.slice(5, 7)}.${shifts.length ? "" : ", frei"}${timeOff ? `, Wunschfrei ${timeOff.status === "APPROVED" ? "genehmigt" : "beantragt"}` : ""}`}
        onFocus={onFocusCell}
        onKeyDown={onKeyDown}
        onDoubleClick={() => canEdit && !shifts.length && onCreate()}
      >
        {shifts.map((shift) => (
          <ShiftChip
            key={shift.id}
            shift={shift}
            data={data}
            draggable={canEdit && !shift.masked && !shift.entry}
            onOpen={() => onOpen(shift)}
          />
        ))}
        {timeOff && (
          <span
            className={`roster-timeoff ${timeOff.status === "APPROVED" ? "approved" : "open"}`}
            title={timeOff.status === "APPROVED" ? "Wunschfrei genehmigt" : "Wunschfrei beantragt"}
          >
            WF{timeOff.status === "OPEN" ? "?" : ""}
          </span>
        )}
        {canEdit && !shifts.length && (
          <button className="roster-cell-add" type="button" tabIndex={-1} aria-hidden="true" onClick={onCreate}>
            +
          </button>
        )}
        {children}
      </div>
    </td>
  );
}

export type GridProps = {
  data: SchedulePayload;
  days: GridDay[];
  employees: GridEmployee[];
  shifts: GridShift[];
  highlightShiftIds: Set<string> | null;
  onCreate: (employeeId: string, date: string) => void;
  onOpen: (shift: GridShift) => void;
  onDrop: (shift: GridShift, employeeId: string, date: string) => void;
};

export function RosterGrid({ data, days, employees, shifts, highlightShiftIds, onCreate, onOpen, onDrop }: GridProps) {
  const [active, setActive] = useState<GridShift | null>(null);
  const [focus, setFocus] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const tableRef = useRef<HTMLTableElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Long press on touch devices so horizontal scrolling keeps working.
    useSensor(TouchSensor, { activationConstraint: { delay: 280, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const byCell = useMemo(() => {
    const map = new Map<string, GridShift[]>();
    for (const shift of shifts) {
      const key = cellId(shift.employeeId, shift.date);
      map.set(key, [...(map.get(key) ?? []), shift]);
    }
    return map;
  }, [shifts]);
  const names = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);
  const shiftLabel = (id: string) => {
    const shift = shifts.find((s) => s.id === id);
    return shift
      ? `${shift.name} von ${names.get(shift.employeeId) ?? ""} am ${shift.date.slice(8)}.${shift.date.slice(5, 7)}.`
      : "Dienst";
  };
  const cellLabel = (id: string) => {
    const [employeeId, date] = id.split("|");
    return `${names.get(employeeId) ?? ""}, ${date?.slice(8)}.${date?.slice(5, 7)}.`;
  };

  const moveFocus = (row: number, col: number) => {
    const next = {
      row: Math.max(0, Math.min(employees.length - 1, row)),
      col: Math.max(0, Math.min(days.length - 1, col)),
    };
    setFocus(next);
    const employee = employees[next.row];
    const day = days[next.col];
    if (employee && day)
      tableRef.current?.querySelector<HTMLElement>(`[data-cell="${cellId(employee.id, day.date)}"]`)?.focus();
  };
  const keyHandler =
    (row: number, col: number, employee: GridEmployee, day: GridDay) => (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      const moves: Record<string, [number, number]> = {
        ArrowRight: [0, 1],
        ArrowLeft: [0, -1],
        ArrowDown: [1, 0],
        ArrowUp: [-1, 0],
      };
      if (moves[event.key]) {
        event.preventDefault();
        moveFocus(row + moves[event.key][0], col + moves[event.key][1]);
      } else if (event.key === "Home") moveFocus(row, 0);
      else if (event.key === "End") moveFocus(row, days.length - 1);
      else if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ContextMenu" ||
        (event.shiftKey && event.key === "F10")
      ) {
        event.preventDefault();
        const cell = byCell.get(cellId(employee.id, day.date));
        if (cell?.[0]) onOpen(cell[0]);
        else if (data.canEdit) onCreate(employee.id, day.date);
      }
    };

  const dragStart = (event: DragStartEvent) => setActive(shifts.find((s) => s.id === event.active.id) ?? null);
  const dragEnd = (event: DragEndEvent) => {
    setActive(null);
    const shift = shifts.find((s) => s.id === event.active.id);
    if (!shift || !event.over) return;
    const [employeeId, date] = String(event.over.id).split("|");
    if (employeeId === shift.employeeId && date === shift.date) return;
    onDrop(shift, employeeId, date);
  };

  const staffingTypes = data.shiftTypes.filter((type) => data.staffing.some((cell) => cell.shiftTypeId === type.id));

  return (
    <DndContext
      sensors={sensors}
      onDragStart={dragStart}
      onDragEnd={dragEnd}
      onDragCancel={() => setActive(null)}
      accessibility={{
        announcements: announcements(shiftLabel, cellLabel),
        screenReaderInstructions: {
          draggable:
            "Leertaste drücken, um den Dienst aufzunehmen. Mit den Pfeiltasten verschieben, Leertaste zum Ablegen, Escape zum Abbrechen.",
        },
      }}
    >
      <div className="roster-grid-scroll">
        <table className="roster-grid" ref={tableRef} role="grid" aria-label={`Dienstplan ${data.unit.name}`}>
          <thead>
            <tr>
              <th className="roster-name-head" scope="col">
                Mitarbeitende
              </th>
              {days.map((day) => (
                <th
                  key={day.date}
                  scope="col"
                  className={`${day.weekend ? "weekend" : ""} ${day.holiday ? "holiday" : ""} ${day.today ? "today" : ""}`}
                  title={day.holiday ?? undefined}
                >
                  <span>{WEEKDAY_SHORT[day.weekday - 1]}</span>
                  <strong>{Number(day.date.slice(8))}</strong>
                  {day.holiday && <Star aria-label={day.holiday} weight="fill" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, row) => (
              <tr key={employee.id} className={employee.isSelf ? "self" : ""}>
                <th scope="row" className="roster-name">
                  <strong>{employee.name}</strong>
                  <small>
                    {employee.pensumPercent} %
                    {employee.targetMinutes !== null && employee.plannedMinutes !== null && (
                      <>
                        {" "}
                        · Soll {formatHours(employee.targetMinutes).replace(" h", "")} · geplant{" "}
                        <span
                          className={
                            Math.abs(employee.plannedMinutes - employee.targetMinutes) >= 60 ? "roster-off-target" : ""
                          }
                        >
                          {formatHours(employee.plannedMinutes)}
                        </span>
                      </>
                    )}
                  </small>
                  <span className="roster-name-tags">
                    {employee.otherUnits.length > 0 && (
                      <em title={`Auch in: ${employee.otherUnits.join(", ")}`}>Springer</em>
                    )}
                    {employee.preferences.length > 0 && (
                      <em title={`Dienstwünsche: ${employee.preferences.join(" · ")}`}>
                        <Heart aria-hidden="true" /> {employee.preferences.length}
                      </em>
                    )}
                    {employee.qualifications.slice(0, 1).map((q) => (
                      <em key={q} title={employee.qualifications.join(", ")}>
                        {q.replace("Pflegefachperson", "PF").replace("Fachperson Gesundheit", "FaGe")}
                      </em>
                    ))}
                  </span>
                </th>
                {days.map((day, col) => (
                  <Cell
                    key={day.date}
                    employee={employee}
                    day={day}
                    data={data}
                    shifts={byCell.get(cellId(employee.id, day.date)) ?? []}
                    canEdit={data.canEdit}
                    focused={focus.row === row && focus.col === col}
                    highlight={
                      !!highlightShiftIds &&
                      (byCell.get(cellId(employee.id, day.date)) ?? []).some((s) => highlightShiftIds.has(s.id))
                    }
                    onFocusCell={() => setFocus({ row, col })}
                    onCreate={() => onCreate(employee.id, day.date)}
                    onOpen={onOpen}
                    onKeyDown={keyHandler(row, col, employee, day)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
          {staffingTypes.length > 0 && (
            <tfoot>
              {staffingTypes.map((type) => (
                <tr key={type.id}>
                  <th scope="row" className="roster-name roster-staffing-name">
                    <strong>
                      <span className="roster-type-dot" style={{ background: type.color }} /> {type.code} · Besetzung
                    </strong>
                  </th>
                  {days.map((day) => {
                    const cell = data.staffing.find((s) => s.date === day.date && s.shiftTypeId === type.id);
                    const low = cell && cell.min !== null && cell.count < cell.min;
                    const lowQualified =
                      cell &&
                      cell.minQualified !== null &&
                      cell.qualified !== null &&
                      cell.qualified < cell.minQualified;
                    const high = cell && cell.max !== null && cell.count > cell.max;
                    return (
                      <td
                        key={day.date}
                        className={`roster-staffing ${low || lowQualified ? "low" : high ? "high" : cell?.min !== null && cell ? "ok" : ""}`}
                        title={
                          cell
                            ? `${type.name}: ${cell.count}${cell.min !== null ? ` von mind. ${cell.min}` : ""}${cell.max !== null ? `, max. ${cell.max}` : ""}${lowQualified ? " – Fachperson fehlt" : ""}`
                            : undefined
                        }
                      >
                        {cell ? `${cell.count}${cell.min !== null ? `/${cell.min}` : ""}` : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? <ShiftChip shift={active} data={data} draggable={false} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

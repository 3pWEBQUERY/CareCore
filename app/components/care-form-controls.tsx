"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ModuleIcon } from "./module-icon";

export function formatCareDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function CareSelect({
  label,
  value,
  options,
  onChange,
  menuZIndex,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  menuZIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  // Mit der Tastatur markierte Option (-1: keine, z. B. nach dem Öffnen mit der Maus).
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const updatePosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = Math.min(options.length * 42 + 16, 360);
    const shouldOpenUp = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
    setOpenUp(shouldOpenUp);
    setPosition({ top: shouldOpenUp ? rect.top - 6 : rect.bottom + 6, left: rect.left, width: rect.width });
  }, [options.length]);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);
  useEffect(() => {
    if (open && active >= 0)
      menuRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);
  const toggle = () =>
    setOpen((current) => {
      if (!current) updatePosition();
      else setOpenUp(false);
      setActive(-1);
      return !current;
    });
  const close = () => {
    setOpen(false);
    setOpenUp(false);
    setActive(-1);
  };
  // Tastatur: Pfeiltasten, Pos1/Ende, Enter/Leertaste wählen, Escape und Tab schliessen.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const count = options.length;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        updatePosition();
        setActive(Math.max(options.indexOf(value), 0));
        setOpen(true);
      }
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(
        active < 0
          ? Math.max(options.indexOf(value), 0)
          : (active + (event.key === "ArrowDown" ? 1 : -1) + count) % count,
      );
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : count - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (active >= 0 && options[active] !== undefined) onChange(options[active]);
      close();
    }
  };
  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className={`area-select-menu area-select-menu-portal ${openUp ? "up" : ""}`}
            id={listId}
            role="listbox"
            aria-label={label}
            style={{ ...position, zIndex: menuZIndex }}
          >
            {options.map((option, index) => (
              <button
                type="button"
                role="option"
                id={`${listId}-${index}`}
                data-index={index}
                aria-selected={value === option}
                className={[value === option ? "selected" : "", index === active ? "active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                key={option}
                onClick={(event) => {
                  // Inside a <label> the click would otherwise re-activate the trigger and reopen the menu.
                  event.preventDefault();
                  onChange(option);
                  close();
                }}
              >
                {option}
                <ModuleIcon name="check" />
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;
  return (
    <>
      <div className="area-custom-select" ref={rootRef}>
        <button
          className="area-select-trigger"
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-label={label}
          onClick={toggle}
          onKeyDown={onKeyDown}
        >
          <span>{value}</span>
          <ModuleIcon name="caretDown" className={open ? "open" : ""} />
        </button>
      </div>
      {menu}
    </>
  );
}

// Eigene Datumsauswahl (statt des Browser-Kalenders). Optional: Grenzen (min, max), Platzhalter ohne Datum,
// Jahres- und Monatsauswahl für weit zurückliegende Daten (z. B. Geburtsdatum) und ohne „Heute“.
export function CareDatePicker({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "Datum wählen",
  yearSelect = false,
  showToday = true,
  openAtYear,
  disabled = false,
  clearable = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  yearSelect?: boolean;
  showToday?: boolean;
  // Ohne Datum: Jahr, bei dem die Auswahl beginnt (nur Anzeige, kein vorgeschlagener Wert).
  openAtYear?: number;
  // Gesperrt (z. B. solange eine Voraussetzung fehlt).
  disabled?: boolean;
  // Freiwilliges Datum: „Leeren“ im Kalender entfernt es wieder.
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const startView = () =>
    !value && openAtYear ? new Date(openAtYear, 0, 1) : new Date(`${value || max || todayIso()}T12:00:00`);
  const [viewMonth, setViewMonth] = useState(startView);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<number | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthLabel = viewMonth.toLocaleDateString("de-CH", { month: "long", year: "numeric" });
  const iso = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const outside = (date: string) => Boolean((min && date < min) || (max && date > max));
  // Jahre in Zwölferblöcken; ein Jahr ist wählbar, wenn mindestens ein Tag darin innerhalb der Grenzen liegt.
  const decadeStart = Math.floor(year / 12) * 12;
  const years = Array.from({ length: 12 }, (_, index) => decadeStart + index);
  const yearOutside = (y: number) => Boolean((min && `${y}-12-31` < min) || (max && `${y}-01-01` > max));
  const monthOutside = (m: number) =>
    Boolean((min && iso(year, m, new Date(year, m + 1, 0).getDate()) < min) || (max && iso(year, m, 1) > max));
  const toggle = () =>
    setOpen((current) => {
      if (!current) {
        const rect = rootRef.current?.getBoundingClientRect();
        setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < 350 && rect.top > 350));
        setViewMonth(startView());
        setMode(yearSelect && !value ? "years" : "days");
      } else setOpenUp(false);
      return !current;
    });
  const selectDay = (day: number) => {
    onChange(iso(year, month, day));
    setOpen(false);
    setOpenUp(false);
  };
  const step = (direction: number) =>
    setViewMonth((current) =>
      mode === "years"
        ? new Date(current.getFullYear() + direction * 12, current.getMonth(), 1)
        : mode === "months"
          ? new Date(current.getFullYear() + direction, current.getMonth(), 1)
          : new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  const stepLabel = mode === "years" ? "Jahre" : mode === "months" ? "Jahr" : "Monat";
  return (
    <div className="schedule-date-picker" ref={rootRef}>
      <button
        className="schedule-date-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={toggle}
      >
        <span className={value ? undefined : "schedule-date-placeholder"}>
          {value ? formatCareDate(value) : placeholder}
        </span>
        <ModuleIcon name="calendar" />
      </button>
      {open && (
        // Steht die Auswahl in einem <label>, leitet der Browser Klicks sonst an den Auslöser weiter (schliesst).
        <div
          className={`schedule-date-menu ${openUp ? "up" : ""}`}
          role="dialog"
          aria-label={`${label} auswählen`}
          onClick={(event) => event.preventDefault()}
        >
          <div className="schedule-date-menu-header">
            <button
              type="button"
              aria-label={mode === "days" ? "Vorheriger Monat" : `Vorherige ${stepLabel}`}
              onClick={() => step(-1)}
            >
              <ModuleIcon name="chevron" className="previous" />
            </button>
            {yearSelect ? (
              <button
                type="button"
                className="schedule-date-period"
                aria-label={mode === "days" ? `${monthLabel}: Jahr und Monat wählen` : "Jahr wählen"}
                onClick={() => setMode(mode === "years" ? "days" : "years")}
              >
                {mode === "years" ? `${years[0]} – ${years[11]}` : mode === "months" ? String(year) : monthLabel}
              </button>
            ) : (
              <strong>{monthLabel}</strong>
            )}
            <button
              type="button"
              aria-label={mode === "days" ? "Nächster Monat" : `Nächste ${stepLabel}`}
              onClick={() => step(1)}
            >
              <ModuleIcon name="chevron" />
            </button>
          </div>
          {mode === "years" ? (
            <div className="schedule-date-grid schedule-date-choices" role="group" aria-label="Jahr">
              {years.map((item) => (
                <button
                  type="button"
                  key={item}
                  disabled={yearOutside(item)}
                  className={value.startsWith(`${item}-`) ? "selected" : ""}
                  onClick={() => {
                    setViewMonth(new Date(item, month, 1));
                    setMode("months");
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : mode === "months" ? (
            <div className="schedule-date-grid schedule-date-choices" role="group" aria-label="Monat">
              {Array.from({ length: 12 }, (_, index) => index).map((item) => (
                <button
                  type="button"
                  key={item}
                  disabled={monthOutside(item)}
                  className={value.startsWith(iso(year, item, 1).slice(0, 8)) ? "selected" : ""}
                  onClick={() => {
                    setViewMonth(new Date(year, item, 1));
                    setMode("days");
                  }}
                >
                  {new Date(year, item, 1).toLocaleDateString("de-CH", { month: "short" })}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="schedule-date-weekdays">
                {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="schedule-date-grid">
                {days.map((day, index) =>
                  day ? (
                    <button
                      type="button"
                      key={day}
                      disabled={outside(iso(year, month, day))}
                      className={value === iso(year, month, day) ? "selected" : ""}
                      onClick={() => selectDay(day)}
                    >
                      {day}
                    </button>
                  ) : (
                    <span aria-hidden="true" key={`empty-${index}`} />
                  ),
                )}
              </div>
            </>
          )}
          <div className="schedule-date-menu-footer">
            <span>{value ? formatCareDate(value) : placeholder}</span>
            <div className="schedule-date-menu-actions">
              {clearable && value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  Leeren
                </button>
              )}
              {showToday && (
                <button
                  type="button"
                  onClick={() => {
                    const today = todayIso();
                    setViewMonth(new Date(`${today}T12:00:00`));
                    onChange(today);
                    setOpen(false);
                  }}
                >
                  Heute
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export type CareOption = { value: string; label: string; disabled?: boolean };

// Wie CareSelect, aber mit getrenntem Wert und Anzeigetext (z. B. IDs) und Tastaturbedienung:
// Pfeiltasten, Pos1/Ende, Enter/Leertaste wählen, Escape schliesst.
export function CareOptionSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Bitte wählen",
  disabled,
  className,
  menuZIndex,
}: {
  label: string;
  value: string;
  options: CareOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuZIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const updatePosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = Math.min(options.length * 42 + 16, 360);
    const shouldOpenUp = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
    setOpenUp(shouldOpenUp);
    setPosition({
      top: shouldOpenUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 180),
    });
  }, [options.length]);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);
  useEffect(() => {
    if (open && active >= 0)
      menuRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);
  const show = () => {
    updatePosition();
    setActive(
      Math.max(
        options.findIndex((option) => option.value === value),
        0,
      ),
    );
    setOpen(true);
  };
  const choose = (option: CareOption | undefined) => {
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };
  const step = (from: number, delta: number) => {
    for (let i = 1; i <= options.length; i += 1) {
      const next = (from + delta * i + options.length * i) % options.length;
      if (!options[next]?.disabled) return next;
    }
    return from;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => step(current, event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? step(-1, 1) : step(options.length, -1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(options[active]);
    }
  };
  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            className={`area-select-menu area-select-menu-portal ${openUp ? "up" : ""}`}
            role="listbox"
            aria-label={label}
            style={{ ...position, zIndex: menuZIndex }}
          >
            {options.map((option, index) => (
              <button
                type="button"
                role="option"
                id={`${listId}-${index}`}
                data-index={index}
                aria-selected={value === option.value}
                disabled={option.disabled}
                className={[value === option.value ? "selected" : "", index === active ? "active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                key={option.value}
                onMouseEnter={() => setActive(index)}
                onClick={(event) => {
                  // In einem <label> würde der Klick sonst den Auslöser erneut aktivieren.
                  event.preventDefault();
                  choose(option);
                }}
              >
                {option.label}
                <ModuleIcon name="check" />
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;
  return (
    <>
      <div className={`area-custom-select${className ? ` ${className}` : ""}`} ref={rootRef}>
        <button
          className="area-select-trigger"
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-label={label}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onKeyDown}
        >
          <span className={selected ? "" : "placeholder"}>{selected?.label ?? placeholder}</span>
          <ModuleIcon name="caretDown" className={open ? "open" : ""} />
        </button>
      </div>
      {menu}
    </>
  );
}

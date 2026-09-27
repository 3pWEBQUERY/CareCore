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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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
  const toggle = () =>
    setOpen((current) => {
      if (!current) updatePosition();
      else setOpenUp(false);
      return !current;
    });
  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className={`area-select-menu area-select-menu-portal ${openUp ? "up" : ""}`}
            role="listbox"
            aria-label={label}
            style={{ ...position, zIndex: menuZIndex }}
          >
            {options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={value === option}
                className={value === option ? "selected" : ""}
                key={option}
                onClick={(event) => {
                  // Inside a <label> the click would otherwise re-activate the trigger and reopen the menu.
                  event.preventDefault();
                  onChange(option);
                  setOpen(false);
                  setOpenUp(false);
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
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label}
          onClick={toggle}
        >
          <span>{value}</span>
          <ModuleIcon name="caretDown" className={open ? "open" : ""} />
        </button>
      </div>
      {menu}
    </>
  );
}

export function CareDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(`${value}T12:00:00`));
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const days: Array<number | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthLabel = viewMonth.toLocaleDateString("de-CH", { month: "long", year: "numeric" });
  const toggle = () =>
    setOpen((current) => {
      if (!current) {
        const rect = rootRef.current?.getBoundingClientRect();
        setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < 350 && rect.top > 350));
      } else setOpenUp(false);
      return !current;
    });
  const selectDay = (day: number) => {
    const next = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(next);
    setOpen(false);
    setOpenUp(false);
  };
  return (
    <div className="schedule-date-picker" ref={rootRef}>
      <button
        className="schedule-date-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
      >
        <span>{formatCareDate(value)}</span>
        <ModuleIcon name="calendar" />
      </button>
      {open && (
        <div className={`schedule-date-menu ${openUp ? "up" : ""}`} role="dialog" aria-label={`${label} auswählen`}>
          <div className="schedule-date-menu-header">
            <button
              type="button"
              aria-label="Vorheriger Monat"
              onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              <ModuleIcon name="chevron" className="previous" />
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              aria-label="Nächster Monat"
              onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              <ModuleIcon name="chevron" />
            </button>
          </div>
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
                  className={
                    value ===
                    `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      ? "selected"
                      : ""
                  }
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              ) : (
                <span aria-hidden="true" key={`empty-${index}`} />
              ),
            )}
          </div>
          <div className="schedule-date-menu-footer">
            <span>{formatCareDate(value)}</span>
            <button
              type="button"
              onClick={() => {
                const today = new Intl.DateTimeFormat("en-CA", {
                  timeZone: "Europe/Zurich",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date());
                setViewMonth(new Date(`${today}T12:00:00`));
                onChange(today);
                setOpen(false);
              }}
            >
              Heute
            </button>
          </div>
        </div>
      )}
    </div>
  );
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

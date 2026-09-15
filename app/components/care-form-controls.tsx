"use client";

import { useEffect, useRef, useState } from "react";
import { ModuleIcon } from "./module-page-shell";

export function formatCareDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CareSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  const toggle = () => setOpen((current) => {
    if (!current) {
      const rect = rootRef.current?.getBoundingClientRect();
      const menuHeight = options.length * 42 + 16;
      setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight));
    } else setOpenUp(false);
    return !current;
  });
  return <div className="area-custom-select" ref={rootRef}><button className="area-select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={toggle}><span>{value}</span><ModuleIcon name="caretDown" className={open ? "open" : ""}/></button>{open && <div className={`area-select-menu ${openUp ? "up" : ""}`} role="listbox" aria-label={label}>{options.map((option) => <button type="button" role="option" aria-selected={value === option} className={value === option ? "selected" : ""} key={option} onClick={() => { onChange(option); setOpen(false); setOpenUp(false); }}>{option}<ModuleIcon name="check"/></button>)}</div>}</div>;
}

export function CareDatePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(`${value}T12:00:00`));
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const days: Array<number | null> = [...Array.from({ length: offset }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthLabel = viewMonth.toLocaleDateString("de-CH", { month: "long", year: "numeric" });
  const toggle = () => setOpen((current) => {
    if (!current) {
      const rect = rootRef.current?.getBoundingClientRect();
      setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < 350 && rect.top > 350));
    } else setOpenUp(false);
    return !current;
  });
  const selectDay = (day: number) => { const next = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; onChange(next); setOpen(false); setOpenUp(false); };
  return <div className="schedule-date-picker" ref={rootRef}><button className="schedule-date-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={toggle}><span>{formatCareDate(value)}</span><ModuleIcon name="calendar"/></button>{open && <div className={`schedule-date-menu ${openUp ? "up" : ""}`} role="dialog" aria-label={`${label} auswählen`}><div className="schedule-date-menu-header"><button type="button" aria-label="Vorheriger Monat" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ModuleIcon name="chevron" className="previous"/></button><strong>{monthLabel}</strong><button type="button" aria-label="Nächster Monat" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ModuleIcon name="chevron"/></button></div><div className="schedule-date-weekdays">{["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => <span key={day}>{day}</span>)}</div><div className="schedule-date-grid">{days.map((day, index) => day ? <button type="button" key={day} className={value === `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` ? "selected" : ""} onClick={() => selectDay(day)}>{day}</button> : <span aria-hidden="true" key={`empty-${index}`}/>)}</div><div className="schedule-date-menu-footer"><span>{formatCareDate(value)}</span><button type="button" onClick={() => { setViewMonth(new Date("2026-09-14T12:00:00")); onChange("2026-09-14"); setOpen(false); }}>Heute</button></div></div>}</div>;
}

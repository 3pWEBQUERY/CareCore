"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ModuleIcon } from "./module-page-shell";

export function formatCareDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CareSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
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
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); };
  }, [open, updatePosition]);
  const toggle = () => setOpen((current) => { if (!current) updatePosition(); else setOpenUp(false); return !current; });
  const menu = open && typeof document !== "undefined" ? createPortal(<div ref={menuRef} className={`area-select-menu area-select-menu-portal ${openUp ? "up" : ""}`} role="listbox" aria-label={label} style={position}>{options.map((option) => <button type="button" role="option" aria-selected={value === option} className={value === option ? "selected" : ""} key={option} onClick={() => { onChange(option); setOpen(false); setOpenUp(false); }}>{option}<ModuleIcon name="check"/></button>)}</div>, document.body) : null;
  return <><div className="area-custom-select" ref={rootRef}><button className="area-select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={toggle}><span>{value}</span><ModuleIcon name="caretDown" className={open ? "open" : ""}/></button></div>{menu}</>;
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
  return <div className="schedule-date-picker" ref={rootRef}><button className="schedule-date-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={toggle}><span>{formatCareDate(value)}</span><ModuleIcon name="calendar"/></button>{open && <div className={`schedule-date-menu ${openUp ? "up" : ""}`} role="dialog" aria-label={`${label} auswählen`}><div className="schedule-date-menu-header"><button type="button" aria-label="Vorheriger Monat" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ModuleIcon name="chevron" className="previous"/></button><strong>{monthLabel}</strong><button type="button" aria-label="Nächster Monat" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ModuleIcon name="chevron"/></button></div><div className="schedule-date-weekdays">{["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => <span key={day}>{day}</span>)}</div><div className="schedule-date-grid">{days.map((day, index) => day ? <button type="button" key={day} className={value === `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` ? "selected" : ""} onClick={() => selectDay(day)}>{day}</button> : <span aria-hidden="true" key={`empty-${index}`}/>)}</div><div className="schedule-date-menu-footer"><span>{formatCareDate(value)}</span><button type="button" onClick={() => { const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); setViewMonth(new Date(`${today}T12:00:00`)); onChange(today); setOpen(false); }}>Heute</button></div></div>}</div>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ModuleIcon } from "@/app/components/module-page-shell";

export default function SettingsSelect({ label, value, options }: { label: string; value?: string; options?: string[] }) {
  const [selected, setSelected] = useState(value ?? options?.[0] ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  return <div className="settings-custom-select" ref={rootRef}><button className="settings-select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((current) => !current)}><span>{selected}</span><ModuleIcon name="caretDown" className={open ? "open" : ""}/></button>{open && <div className="settings-select-menu" role="listbox" aria-label={label}>{(options ?? []).map((option) => <button className={selected === option ? "selected" : ""} type="button" role="option" aria-selected={selected === option} key={option} onClick={() => { setSelected(option); setOpen(false); }}>{option}<ModuleIcon name="check"/></button>)}</div>}</div>;
}

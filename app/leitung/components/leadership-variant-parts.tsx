"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ModuleIcon } from "@/app/components/module-icon";
import type { BoardItem, LeadershipView } from "./leadership-data";

export type Props = {
  view: LeadershipView;
  rows: BoardItem[];
  visibleRows: BoardItem[];
  selected: BoardItem;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  setSelectedId: Dispatch<SetStateAction<string>>;
  completed: string[];
  setCompleted: Dispatch<SetStateAction<string[]>>;
  showToast: (message: string) => void;
  employeeCreatorOpen?: boolean;
  onCloseEmployeeCreator?: () => void;
};

export function RowButton({
  row,
  selected,
  setSelectedId,
}: {
  row: BoardItem;
  selected: BoardItem;
  setSelectedId: Props["setSelectedId"];
}) {
  return (
    <button className={selected.id === row.id ? "selected" : ""} type="button" onClick={() => setSelectedId(row.id)}>
      <span className={`governance-icon ${row.tone}`}>
        <ModuleIcon name={row.icon} />
      </span>
      <span>
        <strong>{row.title}</strong>
        <small>{row.detail}</small>
      </span>
      <span>
        <strong>{row.metric}</strong>
        <small>{row.status}</small>
      </span>
      <ModuleIcon name="chevron" className="chevron" />
    </button>
  );
}

export function AreaSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const toggleOpen = () =>
    setOpen((current) => {
      if (!current) {
        const rect = rootRef.current?.getBoundingClientRect();
        const menuHeight = Math.min(options.length * 42 + 16, 300);
        setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight));
      } else setOpenUp(false);
      return !current;
    });

  return (
    <div className="area-custom-select" ref={rootRef}>
      <button
        className="area-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={toggleOpen}
      >
        <span>{value}</span>
        <ModuleIcon name="caretDown" className={open ? "open" : ""} />
      </button>
      {open && (
        <div className={`area-select-menu ${openUp ? "up" : ""}`} role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={value === option}
              className={value === option ? "selected" : ""}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
                setOpenUp(false);
              }}
            >
              {option}
              <ModuleIcon name="check" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchField({ title, query, setQuery }: { title: string; query: string; setQuery: Props["setQuery"] }) {
  return (
    <label className="resident-search">
      <ModuleIcon name="search" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Suchen…"
        aria-label={`${title} durchsuchen`}
      />
    </label>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "@phosphor-icons/react";
import { useCareResident, useResidentNavigation } from "./care-context";

// Keyboard shortcuts of the whole app. They apply when no text field is focused;
// with a dialog open only J/K (inside the resident record) and "?" are active.

type Shortcut = { keys: string[]; label: string; href?: string };

export const SHORTCUT_GROUPS: Array<{ title: string; items: Shortcut[] }> = [
  {
    title: "Bewohner",
    items: [
      { keys: ["J"], label: "Nächster Bewohner" },
      { keys: ["K"], label: "Vorheriger Bewohner" },
      { keys: ["B"], label: "Bewohnerakte öffnen" },
      { keys: ["Alt", "↑ / ↓"], label: "In der Bewohnerakte blättern" },
    ],
  },
  {
    title: "Erfassen & öffnen",
    items: [
      { keys: ["D"], label: "Dokumentieren", href: "/c/pflegedokumentation" },
      { keys: ["V"], label: "Vitalwerte", href: "/c/vitalwerte/entwicklung" },
      { keys: ["M"], label: "Medikamentenplan", href: "/c/medikation" },
      { keys: ["R"], label: "Medikamentenrunde", href: "/c/medikation/runde" },
      { keys: ["P"], label: "Pflegeplanung", href: "/c/pflegeplanung" },
      { keys: ["E"], label: "Einschätzungen", href: "/c/einschaetzungen" },
      { keys: ["W"], label: "Wundmanagement", href: "/c/wundmanagement" },
      { keys: ["T"], label: "Trinkprotokoll", href: "/c/ernaehrung/trinkprotokoll" },
    ],
  },
  {
    title: "Dienst",
    items: [
      { keys: ["H"], label: "Startseite", href: "/c" },
      { keys: ["A"], label: "Meine Aufgaben", href: "/c/betrieb/aufgaben" },
      { keys: ["Ü"], label: "Übergabe", href: "/c/betrieb/uebergabe" },
      { keys: ["S"], label: "Mein Dienst", href: "/c/betrieb/schicht" },
    ],
  },
  {
    title: "Allgemein",
    items: [
      { keys: ["⌘ / Strg", "K"], label: "Suche" },
      { keys: ["?"], label: "Tastaturkürzel anzeigen" },
      { keys: ["Esc"], label: "Fenster oder Menü schliessen" },
    ],
  },
];

const ROUTES: Record<string, string> = Object.fromEntries(
  SHORTCUT_GROUPS.flatMap((group) =>
    group.items.filter((item) => item.href).map((item) => [item.keys[0].toLowerCase(), item.href!]),
  ),
);

export function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) ||
    Boolean(element.closest("[contenteditable=true]"))
  );
}

export function KeyboardShortcutsMenu() {
  const router = useRouter();
  const navigation = useResidentNavigation();
  const [residentId] = useCareResident();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === "?") {
        event.preventDefault();
        toggle();
        return;
      }
      // Dialogs (e.g. the resident record) handle their own keys.
      if (document.querySelector('[aria-modal="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === "j") navigation.next();
      else if (key === "k") navigation.previous();
      else if (key === "b" && residentId) router.push(`/c/bewohner?resident=${residentId}`);
      else if (ROUTES[key] || (key === "u" && ROUTES["ü"])) router.push(ROUTES[key] ?? ROUTES["ü"]);
      else return;
      event.preventDefault();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigation, residentId, router, toggle]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="shortcut-menu-wrap" ref={rootRef}>
      <button
        className={`icon-button shortcut-trigger ${open ? "open" : ""}`}
        type="button"
        aria-label="Tastaturkürzel anzeigen"
        title="Tastaturkürzel (?)"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <Keyboard aria-hidden="true" />
      </button>
      {open && (
        <section className="shortcut-dropdown" role="dialog" aria-label="Tastaturkürzel">
          <header>
            <strong>Tastaturkürzel</strong>
            <small>Funktionieren überall, solange kein Eingabefeld aktiv ist.</small>
          </header>
          <div className="shortcut-groups">
            {SHORTCUT_GROUPS.map((group) => (
              <div className="shortcut-group" key={group.title}>
                <span>{group.title}</span>
                <dl>
                  {group.items.map((item) => (
                    <div key={item.label}>
                      <dt>
                        {item.keys.map((key) => (
                          <kbd key={key}>{key}</kbd>
                        ))}
                      </dt>
                      <dd>{item.label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

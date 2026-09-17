"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowsLeftRight, Bell, Buildings, CalendarDots, CaretRight, ChartBar, ChatsCircle,
  Check, ClipboardText, Files, FirstAidKit, ForkKnife, GearSix, GraduationCap,
  Heartbeat, House, ListChecks, MagnifyingGlass, NotePencil, Pill, Plus, Pulse,
  ShieldCheck, SignOut, Sparkle, Stethoscope, UsersThree, Warning, X,
} from "@phosphor-icons/react";
import { navigation, routeFor, type ModuleIconName } from "./navigation";

const icons = {
  home: House, residents: UsersThree, tasks: ListChecks, handover: ArrowsLeftRight,
  calendar: CalendarDots, team: ChatsCircle, learn: GraduationCap, docs: Files,
  chart: ChartBar, quality: ShieldCheck, settings: GearSix, search: MagnifyingGlass,
  bell: Bell, building: Buildings, chevron: CaretRight, alert: Warning, check: Check,
  plus: Plus, pulse: Pulse, note: NotePencil, vitals: Heartbeat, plan: ClipboardText,
  med: Pill, wounds: FirstAidKit, nutrition: ForkKnife, assess: Stethoscope,
  shift: Heartbeat, ai: Sparkle, sparkle: Sparkle, filter: MagnifyingGlass,
  logout: SignOut, close: X,
} satisfies Record<Exclude<ModuleIconName, "caretDown" | "sidebar">, typeof House>;

function RailIcon({ name }: { name: ModuleIconName }) {
  const Component = icons[name as keyof typeof icons] ?? Pulse;
  return <Component aria-hidden="true" weight="regular"/>;
}

type AppSidebarProps = {
  activeModule?: string;
  activeChild?: string;
  onToast?: (message: string) => void;
};

export function SidebarTooltip({ label }: { label: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const anchor = anchorRef.current;
    const trigger = anchor?.parentElement;
    if (!trigger) return;
    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect();
      setPosition({ top: rect.top + rect.height / 2, left: rect.right + 12 });
    };
    const show = () => { updatePosition(); setOpen(true); };
    const hide = () => setOpen(false);
    trigger.addEventListener("mouseenter", show);
    trigger.addEventListener("mouseleave", hide);
    trigger.addEventListener("focus", show);
    trigger.addEventListener("blur", hide);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      trigger.removeEventListener("mouseenter", show);
      trigger.removeEventListener("mouseleave", hide);
      trigger.removeEventListener("focus", show);
      trigger.removeEventListener("blur", hide);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, []);

  return <>
    <span ref={anchorRef} className="sidebar-tooltip-anchor" aria-hidden="true" />
    {open && typeof document !== "undefined" && createPortal(<span className="sidebar-tooltip sidebar-tooltip-portal" role="tooltip" style={{ top: position.top, left: position.left }}>{label}</span>, document.body)}
  </>;
}

export default function AppSidebar({ activeModule, activeChild, onToast }: AppSidebarProps) {
  const router = useRouter();
  const [flyoutModule, setFlyoutModule] = useState<string | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFlyoutModule(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function openModule(moduleId: string) {
    setFlyoutModule((current) => current === moduleId ? null : moduleId);
  }

  function selectChild(moduleId: string, child: string) {
    const href = routeFor(moduleId, child);
    if (href) {
      setFlyoutModule(null);
      router.push(href);
    } else {
      onToast?.(`${child} geöffnet`);
    }
  }

  const moduleEntries = navigation.flatMap((group) => group.modules.map((module) => ({ group, module })));
  const flyoutEntry = moduleEntries.find(({ module }) => module.id === flyoutModule);
  const flyout = flyoutEntry?.module;

  return <>
    <aside className="sidebar sidebar-rail" aria-label="Hauptnavigation">
      <div className="sidebar-rail-head"><span className="brand-mark" aria-label="CareCore"><RailIcon name="pulse"/></span></div>
      <nav className="sidebar-rail-scroll">
        <button className={`sidebar-rail-button ${activeModule === "home" ? "active" : ""}`} type="button" aria-label="Startseite" onClick={() => { setFlyoutModule(null); router.push("/"); }}><RailIcon name="home"/><SidebarTooltip label="Startseite"/></button>
        {moduleEntries.map(({ module }) => <button className={`sidebar-rail-button ${activeModule === module.id ? "active" : ""}`} type="button" key={module.id} aria-label={module.label} aria-expanded={flyoutModule === module.id} onClick={() => openModule(module.id)}><RailIcon name={module.icon}/>{module.badge && <span className="sidebar-rail-badge">{module.badge}</span>}<SidebarTooltip label={module.label}/></button>)}
      </nav>
      <div className="sidebar-rail-footer"><button className={`sidebar-rail-button ${activeModule === "settings" ? "active" : ""}`} type="button" aria-label="Einstellungen" onClick={() => { setFlyoutModule(null); router.push("/einstellungen"); }}><RailIcon name="settings"/><SidebarTooltip label="Einstellungen"/></button><button className="sidebar-rail-button" type="button" aria-label="Hilfe & Support" onClick={() => onToast?.("Hilfe & Support geöffnet")}><RailIcon name="docs"/><SidebarTooltip label="Hilfe & Support"/></button></div>
    </aside>

    {flyout && flyoutEntry && <aside className="sidebar-flyout" aria-label={`${flyout.label} Untermenü`} onMouseLeave={() => setFlyoutModule(null)}>
      <div className="sidebar-flyout-head"><div className="sidebar-flyout-icon"><RailIcon name={flyout.icon}/></div><div><span>{flyoutEntry.group.label}</span><strong>{flyout.label}</strong></div><button type="button" aria-label="Untermenü schliessen" onClick={() => setFlyoutModule(null)}><RailIcon name="close"/></button></div>
      <div className="sidebar-flyout-body"><span className="sidebar-flyout-label">Unterseiten</span>{flyout.children.map((child) => <button className={`sidebar-flyout-link ${flyout.id === activeModule && child === activeChild ? "active" : ""}`} type="button" key={child} onClick={() => selectChild(flyout.id, child)}><span>{child}</span><RailIcon name="chevron"/></button>)}</div>
    </aside>}
  </>;
}

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
import { navigationForRole, routeFor, type ModuleIconName } from "./navigation";

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

export function SidebarTooltip({ label, placement = "right" }: { label: string; placement?: "right" | "top" }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const anchor = anchorRef.current;
    const trigger = anchor?.parentElement;
    if (!trigger) return;
    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect();
      setPosition(placement === "top"
        ? { top: rect.top - 8, left: rect.left + rect.width / 2 }
        : { top: rect.top + rect.height / 2, left: rect.right + 12 });
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
  }, [placement]);

  return <>
    <span ref={anchorRef} className="sidebar-tooltip-anchor" aria-hidden="true" />
    {open && typeof document !== "undefined" && createPortal(<span className={`sidebar-tooltip sidebar-tooltip-portal ${placement === "top" ? "sidebar-tooltip-top" : ""}`} role="tooltip" style={{ top: position.top, left: position.left }}>{label}</span>, document.body)}
  </>;
}

export default function AppSidebar({ activeModule, activeChild, onToast }: AppSidebarProps) {
  const router = useRouter();
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const visibleNavigation = navigationForRole(role);

  useEffect(() => {
    fetch("/api/work-context").then((response) => response.ok ? response.json() : null).then((data) => setRole(data?.profile?.role ?? null)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFlyoutGroup(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function openGroup(groupId: string) {
    setFlyoutGroup((current) => current === groupId ? null : groupId);
  }

  function selectChild(moduleId: string, child: string) {
    const href = routeFor(moduleId, child);
    if (href) {
      setFlyoutGroup(null);
      router.push(href);
    } else {
      onToast?.(`${child} geöffnet`);
    }
  }

  const activeGroup = visibleNavigation.find((group) => group.modules.some((module) => module.id === activeModule));
  const groupIcons: Record<string, ModuleIconName> = { clinical: "residents", operations: "calendar", workforce: "team", management: "chart", intelligence: "ai", rai: "assess" };
  const flyout = visibleNavigation.find((group) => group.id === flyoutGroup);

  return <>
    <aside className="sidebar sidebar-rail" aria-label="Hauptnavigation">
      <div className="sidebar-rail-head"><span className="brand-mark" aria-label="CareCore"><RailIcon name="pulse"/></span></div>
      <nav className="sidebar-rail-scroll">
        <button className={`sidebar-rail-button ${activeModule === "home" ? "active" : ""}`} type="button" aria-label="Startseite" onClick={() => { setFlyoutGroup(null); router.push("/c"); }}><RailIcon name="home"/><SidebarTooltip label="Startseite"/></button>
        {visibleNavigation.map((group) => <button className={`sidebar-rail-button ${activeGroup?.id === group.id ? "active" : ""}`} type="button" key={group.id} aria-label={group.label} aria-expanded={flyoutGroup === group.id} onClick={() => openGroup(group.id)}><RailIcon name={groupIcons[group.id] ?? "pulse"}/><SidebarTooltip label={group.label}/></button>)}
      </nav>
      <div className="sidebar-rail-footer"><button className={`sidebar-rail-button ${activeModule === "settings" ? "active" : ""}`} type="button" aria-label="Einstellungen" onClick={() => { setFlyoutGroup(null); router.push("/c/einstellungen"); }}><RailIcon name="settings"/><SidebarTooltip label="Einstellungen"/></button><button className="sidebar-rail-button" type="button" aria-label="Hilfe & Support" onClick={() => onToast?.("Hilfe & Support geöffnet")}><RailIcon name="docs"/><SidebarTooltip label="Hilfe & Support"/></button></div>
    </aside>

    {flyout && <aside className="sidebar-flyout" aria-label={`${flyout.label} Untermenü`} onMouseLeave={() => setFlyoutGroup(null)}>
      <div className="sidebar-flyout-head"><div className="sidebar-flyout-icon"><RailIcon name={groupIcons[flyout.id] ?? "pulse"}/></div><div><span>Hauptbereich</span><strong>{flyout.label}</strong></div><button type="button" aria-label="Untermenü schliessen" onClick={() => setFlyoutGroup(null)}><RailIcon name="close"/></button></div>
      <div className="sidebar-flyout-body">{flyout.modules.map((module) => <section className="sidebar-flyout-module" key={module.id}><strong>{module.label}</strong>{module.children.map((child) => <button className={`sidebar-flyout-link ${module.id === activeModule && child === activeChild ? "active" : ""}`} type="button" key={child} onClick={() => selectChild(module.id, child)}><span>{child}</span><RailIcon name="chevron"/></button>)}</section>)}</div>
    </aside>}
  </>;
}

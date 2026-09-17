"use client";

import { useEffect, useState } from "react";
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
  return <span className="sidebar-tooltip" role="tooltip">{label}</span>;
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

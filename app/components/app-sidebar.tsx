"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowsLeftRight,
  Bell,
  Buildings,
  CalendarDots,
  CaretRight,
  ChartBar,
  ChatsCircle,
  Check,
  ClipboardText,
  Files,
  FirstAidKit,
  ForkKnife,
  GearSix,
  GraduationCap,
  Heartbeat,
  House,
  ListChecks,
  MagnifyingGlass,
  NotePencil,
  Pill,
  Plus,
  Pulse,
  ShieldCheck,
  SignOut,
  Sparkle,
  Stethoscope,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";
import { useNavigationBadges, useWorkContext, type NavigationBadges } from "./care-context";
import {
  badgeFor,
  moduleLabel,
  navigationFor,
  quickLinks,
  readRecentPages,
  rememberPage,
  routeFor,
  type ModuleIconName,
  type RecentPage,
} from "./navigation";

const icons = {
  home: House,
  residents: UsersThree,
  tasks: ListChecks,
  handover: ArrowsLeftRight,
  calendar: CalendarDots,
  team: ChatsCircle,
  learn: GraduationCap,
  docs: Files,
  chart: ChartBar,
  quality: ShieldCheck,
  settings: GearSix,
  search: MagnifyingGlass,
  bell: Bell,
  building: Buildings,
  chevron: CaretRight,
  alert: Warning,
  check: Check,
  plus: Plus,
  pulse: Pulse,
  note: NotePencil,
  vitals: Heartbeat,
  plan: ClipboardText,
  med: Pill,
  wounds: FirstAidKit,
  nutrition: ForkKnife,
  assess: Stethoscope,
  shift: Heartbeat,
  ai: Sparkle,
  sparkle: Sparkle,
  filter: MagnifyingGlass,
  logout: SignOut,
  close: X,
} satisfies Record<Exclude<ModuleIconName, "caretDown" | "sidebar">, typeof House>;

function RailIcon({ name }: { name: ModuleIconName | "carecoreOne" }) {
  if (name === "carecoreOne")
    return (
      <Image
        className="sidebar-carecore-one-icon"
        src="/carecore-one-icon.png"
        width={28}
        height={28}
        alt=""
        aria-hidden="true"
        unoptimized
      />
    );
  const Component = icons[name as keyof typeof icons] ?? Pulse;
  return <Component aria-hidden="true" weight="regular" />;
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
      setPosition(
        placement === "top"
          ? { top: rect.top - 8, left: rect.left + rect.width / 2 }
          : { top: rect.top + rect.height / 2, left: rect.right + 12 },
      );
    };
    const show = () => {
      updatePosition();
      setOpen(true);
    };
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

  return (
    <>
      <span ref={anchorRef} className="sidebar-tooltip-anchor" aria-hidden="true" />
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            className={`sidebar-tooltip sidebar-tooltip-portal ${placement === "top" ? "sidebar-tooltip-top" : ""}`}
            role="tooltip"
            style={{ top: position.top, left: position.left }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}

export default function AppSidebar({ activeModule, activeChild, onToast }: AppSidebarProps) {
  const router = useRouter();
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);
  const context = useWorkContext();
  const visibleNavigation = navigationFor(context?.profile.permissions);
  const badges = useNavigationBadges();
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const badgeCount = (key?: keyof NavigationBadges) => (key && badges ? badges[key] : 0);

  // Every visited page is remembered for "Zuletzt benutzt".
  useEffect(() => {
    if (activeModule && activeChild) rememberPage(activeModule, activeChild);
  }, [activeModule, activeChild]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFlyoutGroup(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function openGroup(groupId: string) {
    setRecentPages(readRecentPages());
    setFlyoutGroup((current) => (current === groupId ? null : groupId));
  }
  const allowedChildren = new Set(
    visibleNavigation.flatMap((group) =>
      group.modules.flatMap((module) => module.children.map((child) => `${module.id}:${child}`)),
    ),
  );
  const visibleQuickLinks = quickLinks.filter((link) => allowedChildren.has(`${link.moduleId}:${link.child}`));
  const recent = recentPages
    .filter((page) => allowedChildren.has(`${page.moduleId}:${page.child}`))
    .filter((page) => page.moduleId !== activeModule || page.child !== activeChild)
    .slice(0, 4);

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
  const groupIcons: Record<string, ModuleIconName | "carecoreOne"> = {
    operations: "calendar",
    clinical: "residents",
    workforce: "team",
    management: "chart",
    intelligence: "ai",
  };
  const flyout = visibleNavigation.find((group) => group.id === flyoutGroup);

  return (
    <>
      <aside className="sidebar sidebar-rail" aria-label="Hauptnavigation">
        <div className="sidebar-rail-head">
          <span className="brand-mark" aria-label="CareCore">
            <Image
              className="sidebar-brand-logo"
              src="/carecore-sidebar-logo.png"
              width={32}
              height={32}
              alt=""
              aria-hidden="true"
              unoptimized
            />
          </span>
        </div>
        <nav className="sidebar-rail-scroll">
          <button
            className={`sidebar-rail-button ${activeModule === "home" ? "active" : ""}`}
            type="button"
            aria-label="Startseite"
            onClick={() => {
              setFlyoutGroup(null);
              router.push("/c");
            }}
          >
            <RailIcon name="home" />
            <SidebarTooltip label="Startseite · Taste H" />
          </button>
          {visibleQuickLinks.map((link) => {
            const count = badgeCount(link.badge);
            return (
              <button
                className={`sidebar-rail-button ${activeModule === link.moduleId && activeChild === link.child ? "active" : ""}`}
                type="button"
                key={`${link.moduleId}:${link.child}`}
                aria-label={count ? `${link.label} (${count})` : link.label}
                onClick={() => selectChild(link.moduleId, link.child)}
              >
                <RailIcon name={link.icon} />
                {count > 0 && <span className="sidebar-rail-badge">{count > 99 ? "99+" : count}</span>}
                <SidebarTooltip label={`${link.label}${count ? ` · ${count}` : ""} · Taste ${link.shortcut}`} />
              </button>
            );
          })}
          <span className="sidebar-rail-divider" aria-hidden="true" />
          {visibleNavigation.map((group) => (
            <button
              className={`sidebar-rail-button ${activeGroup?.id === group.id && !visibleQuickLinks.some((link) => link.moduleId === activeModule && link.child === activeChild) ? "active" : ""}`}
              type="button"
              key={group.id}
              aria-label={group.label}
              aria-expanded={flyoutGroup === group.id}
              onClick={() => openGroup(group.id)}
            >
              <RailIcon name={groupIcons[group.id] ?? "pulse"} />
              <SidebarTooltip label={group.label} />
            </button>
          ))}
        </nav>
        <div className="sidebar-rail-footer">
          <button
            className={`sidebar-rail-button ${activeModule === "settings" ? "active" : ""}`}
            type="button"
            aria-label="Einstellungen"
            onClick={() => {
              setFlyoutGroup(null);
              router.push("/c/einstellungen");
            }}
          >
            <RailIcon name="settings" />
            <SidebarTooltip label="Einstellungen" />
          </button>
          <button
            className="sidebar-rail-button"
            type="button"
            aria-label="Hilfe & Support"
            onClick={() => onToast?.("Hilfe & Support geöffnet")}
          >
            <RailIcon name="docs" />
            <SidebarTooltip label="Hilfe & Support" />
          </button>
        </div>
      </aside>

      {flyout && (
        <aside
          className="sidebar-flyout"
          aria-label={`${flyout.label} Untermenü`}
          onMouseLeave={() => setFlyoutGroup(null)}
        >
          <div className="sidebar-flyout-head">
            <div className="sidebar-flyout-icon">
              <RailIcon name={groupIcons[flyout.id] ?? "pulse"} />
            </div>
            <div>
              <span>Hauptbereich</span>
              <strong>{flyout.label}</strong>
            </div>
            <button type="button" aria-label="Untermenü schliessen" onClick={() => setFlyoutGroup(null)}>
              <RailIcon name="close" />
            </button>
          </div>
          <div className="sidebar-flyout-body">
            {recent.length > 0 && (
              <section className="sidebar-flyout-module sidebar-flyout-recent">
                <strong>Zuletzt benutzt</strong>
                {recent.map((page) => (
                  <button
                    className="sidebar-flyout-link"
                    type="button"
                    key={`${page.moduleId}:${page.child}`}
                    onClick={() => selectChild(page.moduleId, page.child)}
                  >
                    <span>{moduleLabel(page.moduleId, page.child)}</span>
                    <RailIcon name="chevron" />
                  </button>
                ))}
              </section>
            )}
            {flyout.modules.map((module) => (
              <section className="sidebar-flyout-module" key={module.id}>
                <strong>{module.label}</strong>
                {module.children.map((child) => (
                  <button
                    className={`sidebar-flyout-link ${module.id === activeModule && child === activeChild ? "active" : ""}`}
                    type="button"
                    key={child}
                    onClick={() => selectChild(module.id, child)}
                  >
                    <span>{child}</span>
                    {badgeCount(badgeFor(module.id, child)) > 0 && (
                      <em className="sidebar-flyout-badge">{badgeCount(badgeFor(module.id, child))}</em>
                    )}
                    <RailIcon name="chevron" />
                  </button>
                ))}
              </section>
            ))}
          </div>
        </aside>
      )}
    </>
  );
}

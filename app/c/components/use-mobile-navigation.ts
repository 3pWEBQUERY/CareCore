"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { navigationForRole, routeFor } from "../../components/navigation";

export function useMobileNavigation({ role, router }: { role: string | null; router: ReturnType<typeof useRouter> }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileGroupId, setMobileGroupId] = useState<string | null>(null);
  const visibleNavigation = useMemo(() => navigationForRole(role), [role]);
  const mobileGroup = visibleNavigation.find((group) => group.id === mobileGroupId);
  const mobileNeedsMenu = mobileGroup ? mobileGroup.modules.length > 4 : true;

  function chooseMobileGroup(groupId: string) {
    const group = visibleNavigation.find((item) => item.id === groupId);
    const firstModule = group?.modules[0];
    const firstChild = firstModule?.children[0];
    setMobileGroupId(groupId);
    setMobileMenuOpen(false);
    const href = firstModule && firstChild ? routeFor(firstModule.id, firstChild) : null;
    if (href) router.push(href);
  }

  function chooseMobileChild(moduleId: string, child: string) {
    const href = routeFor(moduleId, child);
    if (href) {
      setMobileMenuOpen(false);
      router.push(href);
    }
  }
  return {
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileGroupId,
    setMobileGroupId,
    visibleNavigation,
    mobileGroup,
    mobileNeedsMenu,
    chooseMobileGroup,
    chooseMobileChild,
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CareUnit, ContextResident, WorkContext } from "@/lib/work-context";
import { HeaderNotification } from "./header-parts";

export function useAppHeader({
  locationPrimary = "…",
  locationSecondary = "…",
  searchOpen,
  onSearch,
  onToast,
}: {
  locationPrimary?: string;
  locationSecondary?: string;
  searchOpen: boolean;
  onSearch: () => void;
  onToast: (message: string) => void;
}) {
  const router = useRouter();
  const [context, setContext] = useState<WorkContext | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [residentOpen, setResidentOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ContextResident | null>(null);
  const [headerNotifications, setHeaderNotifications] = useState<HeaderNotification[]>([]);
  const unreadNotifications = headerNotifications.filter((item) => !item.read_at).length;
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const mobileNotificationMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const mobileLocationMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    void fetch("/api/work-context")
      .then(async (response) => (response.ok ? (response.json() as Promise<WorkContext>) : null))
      .then((data) => {
        if (!live || !data) return;
        setContext(data);
        const primaryId = data.profile.primaryCareUnitId ?? data.careUnits[0]?.id ?? null;
        setSelectedAreaId(primaryId);
        setSelectedResident(
          (current) =>
            current ??
            data.residents.find((resident) => resident.careUnitId === primaryId) ??
            data.residents[0] ??
            null,
        );
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    let live = true;
    void fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) =>
        response.ok ? (response.json() as Promise<{ notifications: HeaderNotification[] }>) : null,
      )
      .then((data) => {
        if (live && data) setHeaderNotifications(data.notifications);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  async function markNotificationRead(id?: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    if (!response.ok) {
      onToast("Lesestatus konnte nicht gespeichert werden");
      return false;
    }
    const now = new Date().toISOString();
    setHeaderNotifications((items) =>
      items.map((item) => (!id || item.id === id ? { ...item, read_at: item.read_at || now } : item)),
    );
    return true;
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationOpen(false);
        setProfilePopoverOpen(false);
        setLocationOpen(false);
        setResidentOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!locationOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (locationMenuRef.current?.contains(target) || mobileLocationMenuRef.current?.contains(target)) return;
      setLocationOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [locationOpen]);
  useEffect(() => {
    if (!profileOpen && !notificationOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        profileMenuRef.current?.contains(target) ||
        mobileProfileMenuRef.current?.contains(target) ||
        notificationMenuRef.current?.contains(target) ||
        mobileNotificationMenuRef.current?.contains(target)
      )
        return;
      setProfileOpen(false);
      setNotificationOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [profileOpen, notificationOpen]);
  const selectedArea = context?.careUnits.find((unit) => unit.id === selectedAreaId) ?? null;
  function closeMenus() {
    setProfileOpen(false);
    setNotificationOpen(false);
    setLocationOpen(false);
  }
  function chooseArea(area: CareUnit) {
    setSelectedAreaId(area.id);
    setLocationOpen(false);
    setSelectedResident(context?.residents.find((resident) => resident.careUnitId === area.id) ?? null);
    onToast(`${area.name} als Arbeitskontext gewählt`);
  }
  function chooseResident(resident: ContextResident) {
    setSelectedResident(resident);
    setResidentOpen(false);
    onToast(`${resident.name} ausgewählt`);
  }
  async function logout() {
    setProfileOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }
  return {
    locationPrimary,
    locationSecondary,
    searchOpen,
    onSearch,
    onToast,
    router,
    context,
    setContext,
    profileOpen,
    setProfileOpen,
    profilePopoverOpen,
    setProfilePopoverOpen,
    notificationOpen,
    setNotificationOpen,
    locationOpen,
    setLocationOpen,
    selectedAreaId,
    setSelectedAreaId,
    residentOpen,
    setResidentOpen,
    selectedResident,
    setSelectedResident,
    headerNotifications,
    setHeaderNotifications,
    unreadNotifications,
    profileMenuRef,
    mobileProfileMenuRef,
    notificationMenuRef,
    mobileNotificationMenuRef,
    locationMenuRef,
    mobileLocationMenuRef,
    markNotificationRead,
    selectedArea,
    closeMenus,
    chooseArea,
    chooseResident,
    logout,
  };
}

export type AppHeaderState = ReturnType<typeof useAppHeader>;

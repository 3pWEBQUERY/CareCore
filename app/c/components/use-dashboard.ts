"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconName } from "./dashboard-shared";
import { useDashboardNotes } from "./use-dashboard-notes";
import { useDashboardLayout } from "./use-dashboard-layout";
import { useDashboardNews } from "./use-dashboard-news";
import { useDashboardTasks } from "./use-dashboard-tasks";
import { useMobileNavigation } from "./use-mobile-navigation";

export function useDashboard() {
  const {
    changes,
    setChanges,
    residentNews,
    setResidentNews,
    newsScope,
    setNewsScope,
    newsLoading,
    setNewsLoading,
    newsError,
    setNewsError,
  } = useDashboardNews();
  const {
    dashboardEditing,
    setDashboardEditing,
    widgetOrder,
    setWidgetOrder,
    hiddenWidgets,
    setHiddenWidgets,
    draggedWidget,
    setDraggedWidget,
    persistDashboardLayout,
    toggleWidget,
    resetDashboardLayout,
    moveWidget,
  } = useDashboardLayout();
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const {
    notes,
    setNotes,
    notesLoading,
    setNotesLoading,
    notesError,
    setNotesError,
    noteEditor,
    setNoteEditor,
    viewingNote,
    setViewingNote,
    noteTitle,
    setNoteTitle,
    noteBody,
    setNoteBody,
    notePinned,
    setNotePinned,
    noteSaving,
    setNoteSaving,
    noteFormError,
    setNoteFormError,
    noteConfirmDelete,
    setNoteConfirmDelete,
    loadNotes,
    openNote,
    saveNote,
    deleteNote,
  } = useDashboardNotes({ setToast });
  const [employeeName, setEmployeeName] = useState("Anna");
  const [primaryCareUnitName, setPrimaryCareUnitName] = useState("");
  const { tasks, setTasks, tasksRef, assignedResidents, setAssignedResidents, toggleTask } = useDashboardTasks({
    primaryCareUnitName,
    setToast,
  });
  const [role, setRole] = useState<string | null>(null);
  const {
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileGroupId,
    setMobileGroupId,
    visibleNavigation,
    mobileGroup,
    mobileNeedsMenu,
    chooseMobileGroup,
    chooseMobileChild,
  } = useMobileNavigation({ role, router });

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const openSearch = useCallback(() => setSearchOpen(true), []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNoteEditor(null);
        setViewingNote(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch, setNoteEditor, setViewingNote]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    void fetch("/api/work-context", { credentials: "same-origin" })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{
              profile?: { displayName?: string; primaryCareUnitName?: string; role?: string };
            }>)
          : null,
      )
      .then((context) => {
        if (active && context?.profile?.displayName) {
          setEmployeeName(context.profile.displayName);
          setPrimaryCareUnitName(context.profile.primaryCareUnitName ?? "");
          setRole(context.profile.role ?? null);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const completed = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const filteredResults = useMemo(
    () =>
      [
        ...residentNews.map((resident) => ({
          title: `${resident.first_name} ${resident.last_name}`,
          meta: `Bewohner · ${resident.room}`,
          icon: "residents" as IconName,
          href: `/c/bewohner?resident=${resident.id}`,
        })),
        {
          title: "Bewohnerverzeichnis",
          meta: "Alle aktiven Bewohner",
          icon: "residents" as IconName,
          href: "/c/bewohner",
        },
        { title: "Aufgaben", meta: "Meine offenen Aufgaben", icon: "tasks" as IconName, href: "/c/betrieb/aufgaben" },
        {
          title: "Kalender",
          meta: "Termine im Wohnbereich",
          icon: "calendar" as IconName,
          href: "/c/betrieb/schicht/kalender",
        },
      ]
        .filter((result) => `${result.title} ${result.meta}`.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8),
    [query, residentNews],
  );

  const formattedDate =
    now?.toLocaleDateString("de-CH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Zurich",
    }) ?? "Dein Arbeitstag";
  const formattedTime =
    now?.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" }) ?? "--:--";
  const hour = now
    ? Number(
        new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Zurich" }).format(now),
      )
    : 8;
  const greeting = hour < 11 ? "Guten Morgen" : hour < 17 ? "Guten Tag" : "Guten Abend";
  const firstName =
    employeeName === "CareCore Administrator" ? employeeName : employeeName.split(" ")[0] || employeeName;
  const openTasks = tasks.filter((item) => !item.completed);
  const nextTasks = openTasks
    .filter((item) => item.dueAt)
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))
    .slice(0, 3);
  const currentScope = primaryCareUnitName || "alle Wohnbereiche";
  const criticalChange = changes.find((item) => item.type === "critical");
  return {
    router,
    tasks,
    setTasks,
    tasksRef,
    assignedResidents,
    setAssignedResidents,
    changes,
    setChanges,
    residentNews,
    setResidentNews,
    newsScope,
    setNewsScope,
    newsLoading,
    setNewsLoading,
    newsError,
    setNewsError,
    notes,
    setNotes,
    notesLoading,
    setNotesLoading,
    notesError,
    setNotesError,
    noteEditor,
    setNoteEditor,
    viewingNote,
    setViewingNote,
    noteTitle,
    setNoteTitle,
    noteBody,
    setNoteBody,
    notePinned,
    setNotePinned,
    noteSaving,
    setNoteSaving,
    noteFormError,
    setNoteFormError,
    noteConfirmDelete,
    setNoteConfirmDelete,
    now,
    setNow,
    searchOpen,
    setSearchOpen,
    query,
    setQuery,
    toast,
    setToast,
    employeeName,
    setEmployeeName,
    primaryCareUnitName,
    setPrimaryCareUnitName,
    dashboardEditing,
    setDashboardEditing,
    widgetOrder,
    setWidgetOrder,
    hiddenWidgets,
    setHiddenWidgets,
    draggedWidget,
    setDraggedWidget,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileGroupId,
    setMobileGroupId,
    role,
    setRole,
    visibleNavigation,
    mobileGroup,
    mobileNeedsMenu,
    chooseMobileGroup,
    chooseMobileChild,
    openSearch,
    closeSearch,
    loadNotes,
    completed,
    progress,
    filteredResults,
    toggleTask,
    persistDashboardLayout,
    toggleWidget,
    resetDashboardLayout,
    moveWidget,
    openNote,
    saveNote,
    deleteNote,
    formattedDate,
    formattedTime,
    hour,
    greeting,
    firstName,
    openTasks,
    nextTasks,
    currentScope,
    criticalChange,
  };
}

export type DashboardState = ReturnType<typeof useDashboard>;

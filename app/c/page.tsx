"use client";

import { type ReactNode } from "react";
import AppHeader from "../components/app-header";
import AppSidebar from "../components/app-sidebar";
import { Icon, DashboardWidgetId } from "./components/dashboard-shared";
import { useDashboard } from "./components/use-dashboard";
import {
  DashboardSummaryStrip,
  DashboardCriticalAlert,
  DashboardTimelineCard,
  DashboardTasksCard,
  DashboardResidentsCard,
} from "./components/dashboard-widgets";
import { DashboardWorklistCard } from "./components/dashboard-worklist";
import { HomeHero, HomeNotesCard, HomeShortcutsCard, HomeTodayCard } from "./components/home-hero";
import { HomeNews } from "./components/home-news";
import { DashboardCustomizer } from "./components/dashboard-customizer";
import { DashboardArea } from "./components/dashboard-frame";
import { MobileNavigation } from "@/app/components/mobile-navigation";
import { GlobalSearchDialog } from "@/app/components/global-search-dialog";
import { NoteViewDialog, NoteEditorDialog } from "./components/note-dialogs";

export default function Home() {
  const r = useDashboard();
  const {
    noteEditor,
    viewingNote,
    searchOpen,
    toast,
    setToast,
    dashboardEditing,
    openSearch,
    closeSearch,
    openNote,
    criticalChange,
  } = r;
  const dashboardContent: Record<DashboardWidgetId, ReactNode> = {
    shortcuts: <HomeShortcutsCard r={r} />,
    notes: <HomeNotesCard r={r} />,
    today: <HomeTodayCard r={r} />,
    news: <HomeNews r={r} />,
    summary: <DashboardSummaryStrip r={r} />,
    worklist: <DashboardWorklistCard />,
    critical: criticalChange ? <DashboardCriticalAlert r={r} /> : null,
    shift: <DashboardTimelineCard r={r} />,
    tasks: <DashboardTasksCard r={r} />,
    residents: <DashboardResidentsCard r={r} />,
  };

  return (
    <div className="app-shell">
      <AppSidebar activeModule="home" onToast={setToast} />

      <div className="main-column">
        <AppHeader searchOpen={searchOpen} onSearch={openSearch} onToast={setToast} />

        <main className="workspace home-workspace">
          <HomeHero r={r}>
            <DashboardArea r={r} top className="home-desk-grid" content={dashboardContent} />
          </HomeHero>

          {dashboardEditing && <DashboardCustomizer r={r} />}

          <DashboardArea r={r} top={false} className="dashboard-custom-grid" content={dashboardContent} />
        </main>
      </div>

      <button className="floating-action" type="button" aria-label="Notiz erstellen" onClick={() => openNote("new")}>
        <Icon name="plus" />
      </button>
      <MobileNavigation activeModule="home" />

      {searchOpen && <GlobalSearchDialog onClose={closeSearch} />}

      {viewingNote && <NoteViewDialog r={r} />}
      {noteEditor && <NoteEditorDialog r={r} />}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}

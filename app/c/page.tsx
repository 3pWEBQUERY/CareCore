"use client";

import { type ReactNode } from "react";
import AppHeader from "../components/app-header";
import AppSidebar from "../components/app-sidebar";
import { Icon, DashboardWidgetId, dashboardWidgets } from "./components/dashboard-shared";
import { useDashboard } from "./components/use-dashboard";
import {
  DashboardSummaryStrip,
  DashboardCriticalAlert,
  DashboardTimelineCard,
  DashboardTasksCard,
  DashboardResidentsCard,
} from "./components/dashboard-widgets";
import { HomeHero } from "./components/home-hero";
import { HomeNews } from "./components/home-news";
import { DashboardCustomizer } from "./components/dashboard-customizer";
import { MobileNavMenu, MobileBottomNav } from "./components/mobile-nav";
import { SearchDialog } from "./components/search-dialog";
import { NoteViewDialog, NoteEditorDialog } from "./components/note-dialogs";

export default function Home() {
  const r = useDashboard();
  const {
    changes,
    noteEditor,
    viewingNote,
    searchOpen,
    toast,
    setToast,
    dashboardEditing,
    widgetOrder,
    hiddenWidgets,
    setDraggedWidget,
    mobileMenuOpen,
    openSearch,
    moveWidget,
    openNote,
    criticalChange,
  } = r;
  const dashboardContent: Record<DashboardWidgetId, ReactNode> = {
    summary: <DashboardSummaryStrip r={r} />,
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
          <HomeHero r={r} />

          <HomeNews r={r} />

          {dashboardEditing && <DashboardCustomizer r={r} />}

          <div className={`dashboard-custom-grid ${dashboardEditing ? "is-editing" : ""}`}>
            {widgetOrder
              .filter(
                (id) =>
                  !hiddenWidgets.includes(id) &&
                  (id !== "critical" || changes.some((item) => item.type === "critical")),
              )
              .map((id) => {
                const widget = dashboardWidgets.find((item) => item.id === id)!;
                return (
                  <div
                    className={`dashboard-widget ${widget.wide ? "wide" : ""}`}
                    key={id}
                    draggable={dashboardEditing}
                    onDragStart={() => setDraggedWidget(id)}
                    onDragEnd={() => setDraggedWidget(null)}
                    onDragOver={(event) => dashboardEditing && event.preventDefault()}
                    onDrop={() => moveWidget(id)}
                  >
                    {dashboardEditing && (
                      <div className="dashboard-widget-handle" aria-label={`${widget.label} verschieben`}>
                        ⠿ <span>{widget.label}</span>
                      </div>
                    )}
                    {dashboardContent[id]}
                  </div>
                );
              })}
          </div>
        </main>
      </div>

      <button className="floating-action" type="button" aria-label="Notiz erstellen" onClick={() => openNote("new")}>
        <Icon name="plus" />
      </button>
      {mobileMenuOpen && <MobileNavMenu r={r} />}
      <MobileBottomNav r={r} />

      {searchOpen && <SearchDialog r={r} />}

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

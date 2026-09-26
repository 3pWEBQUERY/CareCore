"use client";

import { useEffect, useState } from "react";
import {
  DashboardWidgetId,
  defaultDashboardOrder,
  completeDashboardOrder,
  dashboardLayoutStorageKey,
  readStoredDashboardLayout,
} from "./dashboard-shared";

export function useDashboardLayout() {
  const [dashboardEditing, setDashboardEditing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(() => readStoredDashboardLayout().order);
  const [hiddenWidgets, setHiddenWidgets] = useState<DashboardWidgetId[]>(() => readStoredDashboardLayout().hidden);
  const [draggedWidget, setDraggedWidget] = useState<DashboardWidgetId | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/dashboard/layout", { credentials: "same-origin" })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{
              layout: { order?: DashboardWidgetId[]; hidden?: DashboardWidgetId[] } | null;
            }>)
          : null,
      )
      .then((payload) => {
        if (!active || !payload?.layout) return;
        const stored = payload.layout;
        const allowed = new Set(defaultDashboardOrder);
        const order = (stored.order ?? []).filter((id): id is DashboardWidgetId => allowed.has(id));
        setWidgetOrder(completeDashboardOrder(order));
        setHiddenWidgets((stored.hidden ?? []).filter((id): id is DashboardWidgetId => allowed.has(id)));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function persistDashboardLayout(nextOrder: DashboardWidgetId[], nextHidden: DashboardWidgetId[]) {
    window.localStorage.setItem(dashboardLayoutStorageKey, JSON.stringify({ order: nextOrder, hidden: nextHidden }));
    void fetch("/api/dashboard/layout", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: nextOrder, hidden: nextHidden }),
    }).catch(() => undefined);
  }

  function toggleWidget(widgetId: DashboardWidgetId) {
    const nextHidden = hiddenWidgets.includes(widgetId)
      ? hiddenWidgets.filter((id) => id !== widgetId)
      : [...hiddenWidgets, widgetId];
    setHiddenWidgets(nextHidden);
    persistDashboardLayout(widgetOrder, nextHidden);
  }

  function resetDashboardLayout() {
    setWidgetOrder(defaultDashboardOrder);
    setHiddenWidgets([]);
    window.localStorage.removeItem(dashboardLayoutStorageKey);
    void fetch("/api/dashboard/layout", { method: "DELETE", credentials: "same-origin" }).catch(() => undefined);
  }

  function moveWidget(targetId: DashboardWidgetId) {
    if (!draggedWidget || draggedWidget === targetId) return;
    const nextOrder = [...widgetOrder];
    const from = nextOrder.indexOf(draggedWidget);
    const to = nextOrder.indexOf(targetId);
    nextOrder.splice(from, 1);
    nextOrder.splice(to, 0, draggedWidget);
    setWidgetOrder(nextOrder);
    persistDashboardLayout(nextOrder, hiddenWidgets);
  }
  return {
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
  };
}

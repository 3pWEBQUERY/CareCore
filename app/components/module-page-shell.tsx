"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import AppHeader from "./app-header";
import AppSidebar from "./app-sidebar";
import { GlobalSearchDialog } from "./global-search-dialog";
import { MobileNavigation } from "./mobile-navigation";
import { ModuleIcon } from "./module-icon";

export type { ModuleIconName } from "./navigation";

// Page frame of all module pages: sidebar, header, mobile navigation, global search and toast.
export default function ModulePageShell({
  activeModule,
  activeChild,
  pageClass,
  locationPrimary,
  locationSecondary,
  children,
}: {
  activeModule?: string;
  activeChild?: string;
  pageClass: string;
  locationPrimary?: string;
  locationSecondary?: string;
  children: (showToast: (message: string) => void) => ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const openSearch = useCallback(() => setSearchOpen(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className={`app-shell ${pageClass}`}>
      <AppSidebar activeModule={activeModule} activeChild={activeChild} onToast={setToast} />

      <div className="main-column">
        <AppHeader
          locationPrimary={locationPrimary}
          locationSecondary={locationSecondary}
          searchOpen={searchOpen}
          onSearch={openSearch}
          onToast={setToast}
        />
        {children(setToast)}
      </div>

      <MobileNavigation activeModule={activeModule} />
      {searchOpen && <GlobalSearchDialog onClose={() => setSearchOpen(false)} />}
      {toast && (
        <div className="toast" role="status">
          <ModuleIcon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}

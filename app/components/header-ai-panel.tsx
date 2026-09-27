"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Sparkle } from "@phosphor-icons/react";
import { AssistantView } from "@/app/intelligenz/components/assistant-view";
import { useWorkContext } from "./care-context";

// CareCore KI from every page: a header button opening the assistant as side panel.
export function HeaderAiButton() {
  const router = useRouter();
  const context = useWorkContext();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!context?.profile.permissions.includes("ai.use")) return null;
  return (
    <>
      <button
        className={`icon-button shortcut-trigger ${open ? "open" : ""}`}
        type="button"
        aria-label="CareCore KI öffnen"
        title="CareCore KI"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Sparkle aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            className="area-editor-overlay"
            role="presentation"
            onMouseDown={(event) => event.currentTarget === event.target && setOpen(false)}
          >
            <section
              className="area-editor-panel ai-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-panel-title"
            >
              <header className="area-editor-header">
                <div>
                  <p className="eyebrow">CareCore KI</p>
                  <h2 id="ai-panel-title">Assistenz</h2>
                  <p>
                    Übergaben, Risiken und Dokumentationsentwürfe aus den Daten in CareCore – die Freigabe bleibt bei
                    dir.
                  </p>
                </div>
                <button
                  className="area-editor-close"
                  type="button"
                  aria-label="KI schliessen"
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </header>
              <div className="ai-panel-body intelligence-workspace">
                <AssistantView />
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/c/intelligenz/entwuerfe");
                  }}
                >
                  KI-Entwürfe prüfen
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

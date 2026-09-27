"use client";

import { useEffect } from "react";
import type { UserPreferences } from "@/lib/user-settings-shared";
import { useWorkContext } from "./care-context";

const PREFERENCES_EVENT = "carecore:preferences";

function apply(preferences: Pick<UserPreferences, "textSize" | "contrast">) {
  const root = document.documentElement;
  root.classList.toggle("text-large", preferences.textSize === "large");
  root.classList.toggle("contrast-high", preferences.contrast === "high");
}

// Changed in the settings: applied at once, without reloading the page.
export const announcePreferences = (preferences: UserPreferences) =>
  window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail: preferences }));

// Applies the personal appearance settings (text size, contrast) to the page.
export function PersonalAppearance() {
  const preferences = useWorkContext()?.preferences;
  useEffect(() => {
    if (preferences) apply(preferences);
  }, [preferences]);
  useEffect(() => {
    const onChange = (event: Event) => apply((event as CustomEvent<UserPreferences>).detail);
    window.addEventListener(PREFERENCES_EVENT, onChange);
    return () => window.removeEventListener(PREFERENCES_EVENT, onChange);
  }, []);
  return null;
}

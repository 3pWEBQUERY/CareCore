import type { Metadata } from "next";
import { StatusPage } from "../components/status-page";

export const metadata: Metadata = { title: "CareCore · Kein Zugriff", robots: { index: false } };

// Ziel des Proxys, wenn eine Seite direkt aufgerufen wird, die die eigene Rolle nicht öffnen darf.
export default function NoAccessPage() {
  return (
    <StatusPage
      code="403"
      title="Kein Zugriff"
      text="Diese Seite gehört zu einem Bereich, den deine Rolle nicht öffnen darf. Wenn du ihn für deine Arbeit brauchst, wende dich an die Administration."
    />
  );
}

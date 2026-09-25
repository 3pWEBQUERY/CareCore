import type { Metadata } from "next";
import "./wounds.css";

export const metadata: Metadata = {
  title: "CareCore · Wundübersicht",
  description: "Zentrale Wundübersicht für Versorgung, Verlauf und Dokumentation in CareCore.",
};

export default function WoundManagementLayout({ children }: LayoutProps<"/wundmanagement">) {
  return children;
}

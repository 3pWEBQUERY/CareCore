import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Wundübersicht",
  description: "Zentrale Wundübersicht für Versorgung, Verlauf und Dokumentation in CareCore.",
};

export default function WoundManagementLayout({ children }: LayoutProps<"/wundmanagement">) {
  return children;
}

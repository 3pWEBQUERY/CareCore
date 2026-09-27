import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Dienstplan",
  description: "Dienstplanung, Anträge, Arbeitszeit und Einstellungen des Dienstplans in CareCore.",
};

export default function RosterLayout({ children }: LayoutProps<"/dienstplan">) {
  return children;
}

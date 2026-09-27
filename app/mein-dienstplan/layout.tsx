import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Mein Dienstplan",
  description: "Eigene Dienste, Teamplan, Anträge und Arbeitszeiten in CareCore.",
};

export default function MyRosterLayout({ children }: LayoutProps<"/mein-dienstplan">) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · RAI",
  description: "InterRAI-Erfassungen, Verantwortlichkeiten und Auswertungen in CareCore.",
};

export default function RaiLayout({ children }: LayoutProps<"/rai">) {
  return children;
}

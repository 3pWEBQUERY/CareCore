import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Kompass",
  description: "Bedarfsabklärung mit dem CareCore Kompass: Abklärungen, Verantwortlichkeiten und Auswertungen.",
};

export default function RaiLayout({ children }: LayoutProps<"/rai">) {
  return children;
}

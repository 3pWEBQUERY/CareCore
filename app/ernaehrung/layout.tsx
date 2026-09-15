import type { Metadata } from "next";

export const metadata: Metadata = { title: "CareCore · Ernährung", description: "Ernährungsplanung und Trinkprotokolle für die stationäre Pflege." };

export default function NutritionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

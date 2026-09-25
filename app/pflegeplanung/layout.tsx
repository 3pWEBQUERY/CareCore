import type { Metadata } from "next";
import "./planning.css";

export const metadata: Metadata = {
  title: "CareCore · Pflegeplanung",
  description: "Pflegeziele, Ressourcen und Massnahmen im CareCore Pflegeprozess.",
};

export default function PlanningLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

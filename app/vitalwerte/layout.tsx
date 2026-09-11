import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Vitalwerte",
  description: "Hausweite Übersicht aller aktuellen Vitalwerte und auffälligen Messungen in CareCore.",
};

export default function VitalsLayout({ children }: LayoutProps<"/vitalwerte">) {
  return children;
}

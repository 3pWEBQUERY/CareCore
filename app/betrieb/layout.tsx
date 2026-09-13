import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Betrieb",
  description: "Schicht, Aufgaben, Übergaben und Dienstplanung in CareCore.",
};

export default function OperationsLayout({ children }: LayoutProps<"/betrieb">) {
  return children;
}

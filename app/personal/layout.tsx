import type { Metadata } from "next";
import "./personal.css";

export const metadata: Metadata = {
  title: "CareCore · Personal",
  description: "Neuigkeiten, Schulungen und Dokumente in CareCore.",
};

export default function PersonalLayout({ children }: LayoutProps<"/personal">) {
  return children;
}

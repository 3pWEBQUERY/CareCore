import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Wunddokumentation",
  description: "Zentrale Wunddokumentation für Befund, Versorgung und Heilungsverlauf in CareCore.",
};

export default function WoundDocumentationLayout({ children }: LayoutProps<"/wundmanagement/dokumentation">) {
  return children;
}

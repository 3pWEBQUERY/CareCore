import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Pflegeakten",
  description: "Hausweite Pflegeakten mit Pflegeprofilen, Zielen, Maßnahmen und Evaluationen in CareCore.",
};

export default function CareRecordsLayout({ children }: LayoutProps<"/bewohner/pflegeakte">) {
  return children;
}

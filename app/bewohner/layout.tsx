import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Bewohner",
  description: "Zentrale Bewohner- und Patientenakte im CareCore Pflegearbeitsplatz.",
};

export default function ResidentsLayout({ children }: LayoutProps<"/bewohner">) {
  return children;
}

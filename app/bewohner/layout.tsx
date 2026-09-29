import type { Metadata } from "next";
import { TermsTitle } from "./terms-title";

export const metadata: Metadata = {
  title: "CareCore · Bewohner",
  description: "Zentrale Akte im CareCore Pflegearbeitsplatz.",
};

export default function ResidentsLayout({ children }: LayoutProps<"/bewohner">) {
  return (
    <>
      <TermsTitle />
      {children}
    </>
  );
}

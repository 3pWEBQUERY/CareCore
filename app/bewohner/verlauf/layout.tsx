import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Bewohnerverlauf",
  description: "Bereichsweiter Pflegeverlauf aller Bewohner in CareCore.",
};

export default function ResidentHistoryLayout({ children }: LayoutProps<"/bewohner/verlauf">) {
  return children;
}

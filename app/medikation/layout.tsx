import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Medikation",
  description: "Medikamentenplan, Medikamentenrunde, Bestände und ärztlich verordnete Reserven in CareCore.",
};

export default function MedicationLayout({ children }: LayoutProps<"/medikation">) {
  return children;
}

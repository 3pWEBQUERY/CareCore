import type { Metadata } from "next";
import "./assessments.css";

export const metadata: Metadata = {
  title: "CareCore · Einschätzungen",
  description: "Pflegefachliche Einschätzungen und fällige Assessments in CareCore.",
};

export default function AssessmentsLayout({ children }: LayoutProps<"/einschaetzungen">) {
  return children;
}

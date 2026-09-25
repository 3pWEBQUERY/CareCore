import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareCore · Pflegedokumentation",
  description: "Schnell- und Verlaufsdokumentation im CareCore Pflegealltag.",
};

export default function DocumentationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

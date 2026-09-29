"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTerms } from "@/app/components/care-context";
import { TERMINOLOGIES } from "@/lib/terminology";

// Seitentitel im Browser-Tab mit der Bezeichnung der Einrichtung („CareCore · Patienten“). Die Metadaten der Layouts
// sind statisch; ohne abweichende Bezeichnung bleibt der Titel unverändert.
export function TermsTitle() {
  const t = useTerms();
  const pathname = usePathname();
  useEffect(() => {
    if (t === TERMINOLOGIES.resident) return;
    document.title = document.title
      .replace("CareCore · Bewohnerverlauf", `CareCore · ${t.prefix}verlauf`)
      .replace(/CareCore · Bewohner$/, `CareCore · ${t.many}`);
  }, [t, pathname]);
  return null;
}

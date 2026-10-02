"use client";

import Image from "next/image";
import { useWorkContext } from "./care-context";

// Kachel oben in der Sidebar (und in der Kopfzeile auf dem Telefon): das Logo der Einrichtung wie ein App-Icon,
// ohne Logo das CareCore-Zeichen. Das Logo steht verkleinert mit Rand in der Kachel.
export function BrandIcon({ size }: { size: number }) {
  const context = useWorkContext();
  const logo = context?.profile.logoUpdatedAt;
  if (!logo)
    return (
      <span className="brand-mark" aria-label="CareCore">
        <Image
          className={size === 32 ? "sidebar-brand-logo" : undefined}
          src="/carecore-sidebar-logo.png"
          width={size}
          height={size}
          alt=""
          aria-hidden="true"
          unoptimized
        />
      </span>
    );
  return (
    <span className="brand-mark brand-mark-app">
      <Image
        src={`/api/branding/logo?v=${encodeURIComponent(logo)}`}
        width={96}
        height={96}
        alt={`Logo ${context.profile.organizationName}`}
        unoptimized
      />
    </span>
  );
}

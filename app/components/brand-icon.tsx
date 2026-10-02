"use client";

import Image from "next/image";
import { useState } from "react";
import { useWorkContext } from "./care-context";

// Kachel oben in der Sidebar (und in der Kopfzeile auf dem Telefon): das Logo der Einrichtung wie ein App-Icon,
// ohne Logo das CareCore-Zeichen. Fast quadratische Logos füllen die Kachel, breite oder hohe stehen mit Rand darin.
export function BrandIcon({ size }: { size: number }) {
  const context = useWorkContext();
  const logo = context?.profile.logoUpdatedAt;
  const [fill, setFill] = useState(true);
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
    <span className={`brand-mark brand-mark-app ${fill ? "fill" : "fit"}`}>
      <Image
        src={`/api/branding/logo?v=${encodeURIComponent(logo)}`}
        width={96}
        height={96}
        alt={`Logo ${context.profile.organizationName}`}
        unoptimized
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          const ratio = naturalHeight ? naturalWidth / naturalHeight : 1;
          setFill(ratio >= 0.8 && ratio <= 1.25);
        }}
      />
    </span>
  );
}

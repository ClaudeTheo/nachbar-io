"use client";

import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useSos } from "./SosContext";

/**
 * SOS-Header-Icon: Kleines rotes Icon (oben rechts), sichtbar auf ALLEN Seiten
 * AUSSER dem Dashboard (dort gibt es die grosse SOS-Kachel).
 */
export function SosHeaderIcon() {
  const { openSos } = useSos();
  const pathname = usePathname();

  // Auf dem Dashboard nicht anzeigen — dort gibt es die grosse SOS-Kachel
  if (pathname === "/" || pathname === "/dashboard") {
    return null;
  }

  return (
    <button
      onClick={openSos}
      className="fixed right-4 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-[#EF4444]/30 transition-all hover:shadow-lg active:scale-95"
      aria-label="SOS — Notfall-Hilfe"
      data-testid="sos-header-icon"
      style={{ touchAction: "manipulation" }}
    >
      <ShieldAlert className="h-5 w-5 text-[#EF4444]" />
    </button>
  );
}

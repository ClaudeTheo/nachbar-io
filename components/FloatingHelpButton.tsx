"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { haptic } from "@/lib/haptics";

export function FloatingHelpButton() {
  return (
    <Link
      href="/alerts/new"
      onClick={() => haptic("medium")}
      className="animate-float fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-alert-amber/90 shadow-[0_4px_20px_rgba(245,158,11,0.35)] backdrop-blur-sm transition-all duration-200 active:scale-95"
      style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
      aria-label="Schnell-Hilfe anfragen"
    >
      <TriangleAlert className="h-6 w-6 text-white" />
    </Link>
  );
}

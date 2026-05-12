"use client";

import Link from "next/link";
import { User } from "lucide-react";

import { QuartierAppLogo } from "@/components/brand/QuartierAppLogo";

/**
 * Visual-Polish v7 Bundle 1 / Welle 2 — Floating Nav-Pill.
 *
 * Schwebt am oberen Rand der App-Shell (fixed, top-3). Pill-Form
 * (rounded-full) mit Cream-Glas-BG, sehr weichem Schatten und
 * Backdrop-Blur. Brand-Anker links: Aquarell-Symbol + Wordmark
 * "QuartierApp" (auf Mobile nur Symbol). Rechts: Avatar-Button zum
 * Profil als satellite-CTA-Pattern.
 *
 * z-Index 30: liegt ueber dem Tageszeit-Tint-Overlay (body::before
 * z-1) und unter Modals/Sheets (typischerweise z-50+).
 *
 * Senior-Pfad (/senior/*) verwendet einen eigenen Layout und SOLL
 * diese Pill bewusst NICHT nutzen — dort braucht es klare
 * Notruf-Praesenz statt Brand-Atmosphaere.
 */
export function NavPill() {
  return (
    <div
      role="banner"
      data-testid="app-nav-pill"
      className="fixed inset-x-3 top-3 z-30 flex items-center justify-between rounded-full bg-warmwhite/85 px-3 py-2 shadow-[0_4px_24px_rgba(61,61,80,0.06)] backdrop-blur-md sm:inset-x-4 sm:top-4 sm:px-4"
    >
      <Link
        href="/dashboard"
        aria-label="Zum Dashboard"
        className="flex items-center rounded-full transition-opacity hover:opacity-80"
      >
        <QuartierAppLogo variant="symbol" size={32} priority />
      </Link>
      <Link
        href="/profile"
        aria-label="Profil"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-warmwhite/70 backdrop-blur-sm transition-colors hover:bg-warmwhite"
      >
        <User
          className="h-5 w-5 text-anthrazit"
          aria-hidden="true"
          strokeWidth={1.5}
        />
      </Link>
    </div>
  );
}

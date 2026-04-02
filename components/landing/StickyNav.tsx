"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function StickyNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-extrabold text-[#2D3142]">
          QuartierApp
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-4 sm:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-[#2D3142] hover:text-[#4CAF87] transition-colors"
          >
            Anmelden
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-[#357a5d] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#2e7d5e] active:scale-95"
          >
            Kostenlos testen
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-6 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[#2D3142] py-2"
              onClick={() => setMenuOpen(false)}
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-[#357a5d] px-5 py-3 text-center text-sm font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              Kostenlos testen
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

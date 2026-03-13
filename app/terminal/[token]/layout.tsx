"use client";

import { use, type ReactNode } from "react";
import TerminalHeader from "@/components/terminal/TerminalHeader";
import TerminalSidebar from "@/components/terminal/TerminalSidebar";

/**
 * Terminal-Layout: Vollbild fuer 10" Kiosk-Display (1280x800).
 * Links: Header + Hauptinhalt (flex-1), Rechts: Sidebar (140px).
 */
export default function TerminalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  // In Next.js 16 App Router sind params ein Promise
  const { token } = use(params);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-warmwhite" data-token={token}>
      {/* Hauptbereich: Header oben + Inhalt darunter */}
      <div className="flex flex-col flex-1 min-w-0">
        <TerminalHeader />
        <main className="flex-1 overflow-hidden p-4">
          {children}
        </main>
      </div>

      {/* Sidebar rechts, immer sichtbar */}
      <TerminalSidebar />
    </div>
  );
}

// app/(app)/companion/page.tsx
// Seite fuer den KI-Quartier-Lotsen (nur Chat-Modus)
// Session 59: Gespraech-Tab entfernt — Voice laeuft ueber FAB-Button

"use client";

import { CompanionChat } from "@/modules/voice/components/companion/CompanionChat";

export default function CompanionPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-hidden">
        <CompanionChat />
      </div>
    </div>
  );
}

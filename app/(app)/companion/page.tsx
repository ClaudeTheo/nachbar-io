// app/(app)/companion/page.tsx
// Seite fuer den KI-Quartier-Lotsen (Companion Chat + Dialog-Modus)

"use client";

import { useState } from "react";
import { MessageSquare, Mic } from "lucide-react";
import { CompanionChat } from "@/modules/voice/components/companion/CompanionChat";
import { DialogMode } from "@/modules/voice/components/companion/DialogMode";

type CompanionMode = "chat" | "dialog";

export default function CompanionPage() {
  const [mode, setMode] = useState<CompanionMode>("chat");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Tab-Leiste */}
      <div
        className="flex border-b border-border bg-white"
        data-testid="companion-tabs"
      >
        <button
          onClick={() => setMode("chat")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            mode === "chat"
              ? "border-b-2 border-[#4CAF87] text-[#4CAF87]"
              : "text-[#2D3142]/60 hover:text-[#2D3142]"
          }`}
          data-testid="tab-chat"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
        <button
          onClick={() => setMode("dialog")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            mode === "dialog"
              ? "border-b-2 border-[#4CAF87] text-[#4CAF87]"
              : "text-[#2D3142]/60 hover:text-[#2D3142]"
          }`}
          data-testid="tab-dialog"
        >
          <Mic className="h-4 w-4" />
          Gespräch
        </button>
      </div>

      {/* Modus-Inhalt */}
      <div className="flex-1 overflow-hidden">
        {mode === "chat" ? <CompanionChat /> : <DialogMode />}
      </div>
    </div>
  );
}

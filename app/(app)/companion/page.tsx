import Link from "next/link";
import { MessageCircle, Mic } from "lucide-react";
import { CompanionChat } from "@/modules/voice/components/companion/CompanionChat";
import { DialogMode } from "@/modules/voice/components/companion/DialogMode";
import { isRealtimeVoiceEnabled } from "@/lib/ai/realtime-voice";

interface CompanionPageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function CompanionPage({ searchParams }: CompanionPageProps) {
  const realtimeEnabled = isRealtimeVoiceEnabled();
  const requestedMode = (await searchParams).mode;
  const voiceMode = realtimeEnabled && requestedMode === "voice";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {realtimeEnabled ? (
        <nav className="grid grid-cols-2 border-b border-border bg-white p-2" aria-label="Begleiter-Modus">
          <Link
            href="/companion"
            className={`flex min-h-[80px] items-center justify-center gap-2 rounded-lg text-base font-semibold ${
              voiceMode ? "text-[#2D3142]" : "bg-[#2D3142] text-white"
            }`}
            aria-current={voiceMode ? undefined : "page"}
          >
            <MessageCircle aria-hidden="true" />
            Schreiben
          </Link>
          <Link
            href="/companion?mode=voice"
            className={`flex min-h-[80px] items-center justify-center gap-2 rounded-lg text-base font-semibold ${
              voiceMode ? "bg-[#4CAF87] text-white" : "text-[#2D3142]"
            }`}
            aria-current={voiceMode ? "page" : undefined}
          >
            <Mic aria-hidden="true" />
            Sprechen
          </Link>
        </nav>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {voiceMode ? <DialogMode /> : <CompanionChat />}
      </div>
    </div>
  );
}

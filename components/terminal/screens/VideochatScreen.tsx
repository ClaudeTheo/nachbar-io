"use client";

import { ArrowLeft, Video } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

export default function VideochatScreen() {
  const { setActiveScreen } = useTerminal();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setActiveScreen("home")}
          className="flex items-center justify-center h-[70px] w-[70px] rounded-2xl bg-anthrazit text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-10 w-10" />
        </button>
        <h1 className="text-[36px] font-bold text-anthrazit">Videochat</h1>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 gap-6">
        <Video className="h-24 w-24 text-info-blue/40" />
        <p className="text-[32px] font-medium text-anthrazit/60 text-center">
          Videochat wird bald verfügbar sein
        </p>
        <p className="text-[22px] text-anthrazit/40 text-center">
          Sie können dann Ihre Angehörigen per Video anrufen
        </p>
      </div>
    </div>
  );
}

"use client";

import { ArrowLeft, Phone } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

const NUMMERN = [
  { nummer: "112", label: "Notruf / Rettungsdienst", color: "bg-emergency-red" },
  { nummer: "110", label: "Polizei", color: "bg-info-blue" },
  { nummer: "115", label: "Behördenruf", color: "bg-anthrazit" },
  { nummer: "116 117", label: "Ärztlicher Bereitschaftsdienst", color: "bg-quartier-green-dark" },
  { nummer: "0761 19240", label: "Giftnotruf Freiburg", color: "bg-alert-amber" },
  { nummer: "0800 111 0 111", label: "Telefonseelsorge", color: "bg-anthrazit-light" },
] as const;

export default function WichtigeNummernScreen() {
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
        <h1 className="text-[36px] font-bold text-anthrazit">Wichtige Nummern</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {NUMMERN.map((n) => (
          <div
            key={n.nummer}
            className={`flex items-center gap-4 rounded-2xl ${n.color} text-white px-6 py-4`}
          >
            <Phone className="h-10 w-10 shrink-0" />
            <div>
              <div className="text-[36px] font-bold leading-tight">{n.nummer}</div>
              <div className="text-[20px] opacity-90">{n.label}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[18px] text-anthrazit/60 mt-4">
        Nummern zum Ablesen — das Gerät kann nicht telefonieren
      </p>
    </div>
  );
}

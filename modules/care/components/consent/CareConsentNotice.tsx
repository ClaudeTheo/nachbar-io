import { Info } from "lucide-react";

export function CareConsentNotice() {
  return (
    <div className="flex gap-3 rounded-2xl border border-quartier-green/20 bg-quartier-green/10 p-4">
      <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-quartier-green" />
      <div className="text-sm text-anthrazit/80">
        <p>
          Ihre Gesundheitsdaten (Art. 9 DSGVO) werden nur mit Ihrer
          ausdrücklichen und freiwilligen Einwilligung verarbeitet. Sie können
          jede Einwilligung jederzeit widerrufen.
        </p>
      </div>
    </div>
  );
}

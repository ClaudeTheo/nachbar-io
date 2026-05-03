"use client";

import { SeniorButton } from "@/components/SeniorButton";

interface SeniorHomeActionsProps {
  userName?: string;
  onNavigate: (href: string) => void;
}

export function SeniorHomeActions({
  userName = "",
  onNavigate,
}: SeniorHomeActionsProps) {
  return (
    <div className="space-y-6">
      {/* Begruessung */}
      <div className="text-center" data-testid="senior-greeting">
        <p className="senior-heading text-anthrazit">
          Guten Tag{userName ? `, ${userName}` : ""}!
        </p>
        <p className="senior-text mt-2 text-muted-foreground">
          Was möchten Sie tun?
        </p>
      </div>

      {/* Vier grosse Kernaktionen */}
      <div className="space-y-4">
        <SeniorButton
          icon="🆘"
          label="Hilfe anfragen"
          onClick={() => onNavigate("/senior/help")}
          variant="alert"
        />

        <SeniorButton
          icon="📰"
          label="Nachrichten"
          onClick={() => onNavigate("/senior/news")}
          variant="neutral"
        />

        <SeniorButton
          icon="✅"
          label="Alles in Ordnung"
          onClick={() => onNavigate("/senior/checkin")}
          variant="success"
        />

        <SeniorButton
          icon="📞"
          label="Nachbarn kontaktieren"
          onClick={() => onNavigate("/senior/help")}
          variant="primary"
        />
      </div>

      {/* Modus-Wechsel */}
      <div className="pt-4 text-center">
        <button
          onClick={() => onNavigate("/dashboard")}
          className="rounded-xl border-2 border-gray-300 px-6 py-3 text-lg font-medium text-anthrazit hover:bg-gray-100 active:bg-gray-200"
          style={{ minHeight: "80px", touchAction: "manipulation" }}
        >
          ← Zum normalen Modus
        </button>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface LocationConsentDialogProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function LocationConsentDialog({ onAccept, onDecline }: LocationConsentDialogProps) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-quartier-green/10">
          <MapPin className="h-5 w-5 text-quartier-green" />
        </div>
        <h3 className="text-lg font-semibold text-anthrazit">Standort bei Hilferufen teilen?</h3>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Wenn Sie Ihren Standort teilen, können Angehörige und bestätigte Helfer sehen,
        wo Sie Hilfe benötigen. Ihr Standort wird automatisch gelöscht, sobald der
        Hilferuf erledigt ist.
      </p>

      <p className="mb-4 text-xs text-muted-foreground">
        Diese Funktion ersetzt nicht den Notruf 112/110. Sie dient ausschließlich der
        nachbarschaftlichen Koordination. Sie können diese Einstellung jederzeit in
        Ihrem Profil ändern.
      </p>

      <div className="flex gap-3">
        <Button onClick={onAccept} className="flex-1 bg-quartier-green hover:bg-quartier-green-dark">
          Ja, Standort teilen
        </Button>
        <Button onClick={onDecline} variant="outline" className="flex-1">
          Nein, danke
        </Button>
      </div>
    </div>
  );
}

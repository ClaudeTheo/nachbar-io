"use client";

import { useState } from "react";
import { Bell, BellRing, Check, X } from "lucide-react";
import { isPushSupported, subscribeToPush } from "@/lib/push";

// Slide: Push-Benachrichtigungen aktivieren

export function SlidePush({ onStatusChange }: { onStatusChange?: (enabled: boolean) => void }) {
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const supported = isPushSupported();

  async function handleEnable() {
    setStatus("requesting");
    const success = await subscribeToPush();
    if (success) {
      setStatus("granted");
      onStatusChange?.(true);
    } else {
      setStatus("denied");
      onStatusChange?.(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      {/* Animation: Glocke mit Benachrichtigungen */}
      <div className="relative mb-8">
        {/* Pulsierender Ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-28 w-28 animate-ping rounded-full bg-quartier-green/10" style={{ animationDuration: "2s" }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-24 animate-ping rounded-full bg-quartier-green/15" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
        </div>

        {/* Glocke */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-quartier-green/10">
          {status === "granted" ? (
            <div className="animate-fade-in-up">
              <Check className="h-12 w-12 text-quartier-green" />
            </div>
          ) : status === "denied" ? (
            <X className="h-12 w-12 text-muted-foreground" />
          ) : (
            <BellRing className="h-12 w-12 text-quartier-green animate-bounce" style={{ animationDuration: "1.5s" }} />
          )}
        </div>

        {/* Beispiel-Benachrichtigungen */}
        {status === "idle" && (
          <>
            <div
              className="absolute -right-4 top-0 rounded-lg bg-white px-3 py-2 shadow-md border border-border animate-slide-from-right"
              style={{ animationDelay: "400ms", maxWidth: "180px" }}
            >
              <p className="text-[11px] font-medium text-anthrazit">Neue Hilfe-Anfrage</p>
              <p className="text-[10px] text-muted-foreground">Thomas braucht Hilfe beim...</p>
            </div>
            <div
              className="absolute -left-4 bottom-0 rounded-lg bg-white px-3 py-2 shadow-md border border-border animate-slide-from-left"
              style={{ animationDelay: "800ms", maxWidth: "180px" }}
            >
              <p className="text-[11px] font-medium text-anthrazit">Neue Nachricht</p>
              <p className="text-[10px] text-muted-foreground">Anna hat Ihnen geschrieben</p>
            </div>
          </>
        )}
      </div>

      {/* Text */}
      <div className="text-center mb-6 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <h1 className="text-2xl font-bold text-anthrazit">
          {status === "granted"
            ? "Benachrichtigungen aktiv!"
            : status === "denied"
              ? "Kein Problem"
              : "Nichts verpassen"}
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed">
          {status === "granted" ? (
            "Sie werden jetzt informiert, wenn Nachbarn Hilfe brauchen oder Ihnen schreiben."
          ) : status === "denied" ? (
            "Sie können Benachrichtigungen jederzeit später in Ihrem Profil einschalten."
          ) : (
            "Erhalten Sie eine Nachricht auf Ihr Handy, wenn ein Nachbar Hilfe braucht oder Ihnen schreibt — wie bei WhatsApp."
          )}
        </p>
      </div>

      {/* Aktion */}
      {status === "idle" && supported && (
        <div className="w-full max-w-[280px] space-y-3 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
          <button
            onClick={handleEnable}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-quartier-green px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-quartier-green-dark"
          >
            <Bell className="h-5 w-5" />
            Benachrichtigungen einschalten
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Ihr Handy fragt Sie gleich um Erlaubnis — tippen Sie auf &quot;Erlauben&quot;
          </p>
        </div>
      )}

      {status === "requesting" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Bell className="h-4 w-4" />
          Warte auf Ihre Erlaubnis...
        </div>
      )}

      {!supported && status === "idle" && (
        <div className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-700">
          Ihr Browser unterstützt leider keine Benachrichtigungen.
          Nutzen Sie am besten Chrome (Android) oder Safari (iPhone).
        </div>
      )}
    </div>
  );
}

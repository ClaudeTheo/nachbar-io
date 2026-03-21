"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellOff, Smartphone, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  registerServiceWorker,
} from "@/lib/push";

type PushState = "loading" | "unsupported" | "denied" | "prompt" | "subscribed" | "unsubscribed";

export default function NotificationsPage() {
  const [pushState, setPushState] = useState<PushState>("loading");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function checkState() {
      if (!isPushSupported()) {
        setPushState("unsupported");
        return;
      }

      // Service Worker registrieren
      await registerServiceWorker();

      const permission = getPushPermission();
      if (permission === "denied") {
        setPushState("denied");
        return;
      }

      const subscribed = await isSubscribed();
      setPushState(subscribed ? "subscribed" : "unsubscribed");
    }
    checkState();
  }, []);

  async function handleToggle() {
    setToggling(true);

    if (pushState === "subscribed") {
      const success = await unsubscribeFromPush();
      if (success) setPushState("unsubscribed");
    } else {
      const success = await subscribeToPush();
      if (success) {
        setPushState("subscribed");
      } else {
        // Permission könnte abgelehnt worden sein
        const perm = getPushPermission();
        if (perm === "denied") setPushState("denied");
      }
    }

    setToggling(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Benachrichtigungen</h1>
      </div>

      {/* Status-Karte */}
      <div className="rounded-xl border-2 border-border bg-white p-6">
        {pushState === "loading" && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <p className="text-muted-foreground">Prüfe Benachrichtigungsstatus...</p>
          </div>
        )}

        {pushState === "unsupported" && (
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-amber-100 p-3">
              <Smartphone className="h-6 w-6 text-alert-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-anthrazit">
                Push nicht verfügbar
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ihr Browser unterstützt keine Push-Benachrichtigungen. Bitte verwenden
                Sie Chrome, Firefox oder Edge für die beste Erfahrung.
              </p>
            </div>
          </div>
        )}

        {pushState === "denied" && (
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-red-100 p-3">
              <BellOff className="h-6 w-6 text-emergency-red" />
            </div>
            <div>
              <h2 className="font-semibold text-anthrazit">
                Benachrichtigungen blockiert
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sie haben Benachrichtigungen in Ihrem Browser blockiert. Um sie zu
                aktivieren, öffnen Sie die Browser-Einstellungen und erlauben Sie
                Benachrichtigungen für diese Seite.
              </p>
            </div>
          </div>
        )}

        {pushState === "subscribed" && (
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-green-100 p-3">
              <CircleCheck className="h-6 w-6 text-quartier-green" />
            </div>
            <div>
              <h2 className="font-semibold text-anthrazit">
                Benachrichtigungen aktiv
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sie werden über neue Meldungen und Hilfeanfragen aus Ihrem Quartier
                informiert.
              </p>
            </div>
          </div>
        )}

        {pushState === "unsubscribed" && (
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-muted p-3">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-anthrazit">
                Benachrichtigungen deaktiviert
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktivieren Sie Push-Benachrichtigungen, um über neue Meldungen
                und Hilfeanfragen informiert zu werden.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Aktivieren/Deaktivieren Button */}
      {(pushState === "subscribed" || pushState === "unsubscribed") && (
        <Button
          onClick={handleToggle}
          disabled={toggling}
          variant={pushState === "subscribed" ? "outline" : "default"}
          className={`w-full ${
            pushState === "unsubscribed"
              ? "bg-quartier-green hover:bg-quartier-green-dark"
              : ""
          }`}
        >
          {toggling ? (
            "Bitte warten..."
          ) : pushState === "subscribed" ? (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              Benachrichtigungen deaktivieren
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Benachrichtigungen aktivieren
            </>
          )}
        </Button>
      )}

      {/* Info-Box */}
      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-anthrazit">Sie werden benachrichtigt bei:</p>
        <ul className="mt-2 space-y-1">
          <li>- Neuen Meldungen in Ihrer Nachbarschaft</li>
          <li>- Hilfeanfragen in Ihrem Quartier</li>
          <li>- Antworten auf Ihre Meldungen</li>
          <li>- Wichtigen Quartiers-Neuigkeiten</li>
        </ul>
        <p className="mt-3 text-xs">
          Ruhezeiten: 22:00 – 07:00 Uhr (keine Benachrichtigungen außer Notfälle)
        </p>
      </div>
    </div>
  );
}

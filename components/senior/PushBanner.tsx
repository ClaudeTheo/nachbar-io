"use client";

// Nachbar.io — PushBanner for Senior Push Notification Onboarding (J-2b)
// Full-width banner prompting seniors to enable push notifications

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { isPushSupported, isSubscribed, subscribeToPush } from "@/lib/push";

const DISMISSED_KEY = "push-banner-dismissed";

type BannerState = "loading" | "show" | "hidden";

export function PushBanner() {
  const [state, setState] = useState<BannerState>("loading");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setState("hidden");
      return;
    }

    if (localStorage.getItem(DISMISSED_KEY) === "true") {
      setState("hidden");
      return;
    }

    isSubscribed().then((subscribed) => {
      setState(subscribed ? "hidden" : "show");
    });
  }, []);

  if (state !== "show") return null;

  async function handleEnable() {
    setFeedback(null);
    const success = await subscribeToPush();
    if (success) {
      setFeedback("Benachrichtigungen aktiviert!");
      setTimeout(() => setState("hidden"), 1500);
    } else {
      setFeedback("Fehler — bitte versuchen Sie es später erneut.");
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setState("hidden");
  }

  return (
    <div className="w-full rounded-2xl bg-[#2d6a4f] p-5 text-white">
      <div className="flex items-start gap-4">
        <div className="mt-1 shrink-0">
          <Bell className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold leading-tight">
            Benachrichtigungen einschalten
          </h2>
          <p className="mt-1 text-base leading-snug opacity-90">
            Damit Sie Erinnerungen und Notfall-Antworten erhalten.
          </p>
        </div>
      </div>

      {feedback && (
        <p className="mt-3 text-center text-lg font-semibold">{feedback}</p>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleEnable}
          className="min-h-[56px] flex-1 rounded-xl bg-white px-6 text-lg font-bold text-[#2d6a4f] shadow-sm active:scale-95"
        >
          Einschalten
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="min-h-[56px] flex-1 rounded-xl text-lg font-semibold text-white underline-offset-2 hover:underline active:scale-95"
        >
          Später
        </button>
      </div>
    </div>
  );
}

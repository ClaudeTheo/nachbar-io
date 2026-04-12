"use client";

// Nachbar.io — PushToggle (Senior Push Notification Toggle)
// Zeigt Push-Status und erlaubt Ein-/Ausschalten

import { useEffect, useState } from "react";
import {
  isPushSupported,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";

export function PushToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [active, setActive] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const sup = isPushSupported();
      setSupported(sup);
      if (sup) {
        const sub = await isSubscribed();
        setActive(sub);
      }
    };
    check();
  }, []);

  if (supported === null) return null;

  if (!supported) {
    return (
      <div className="rounded-2xl bg-gray-100 p-4 text-center text-lg text-gray-500">
        Ihr Gerät unterstützt keine Benachrichtigungen
      </div>
    );
  }

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (active) {
        const ok = await unsubscribeFromPush();
        if (ok) setActive(false);
      } else {
        const ok = await subscribeToPush();
        if (ok) setActive(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p
        data-testid="push-toggle-status"
        className={`text-lg font-semibold ${active ? "text-green-600" : "text-gray-500"}`}
      >
        {active ? "Benachrichtigungen aktiv" : "Benachrichtigungen aus"}
      </p>
      <button
        data-testid="push-toggle-button"
        onClick={handleToggle}
        disabled={loading}
        className="min-h-[56px] w-full rounded-2xl px-6 text-lg font-semibold text-white transition-colors disabled:opacity-50"
        style={{
          backgroundColor: active ? "#6b7280" : "#16a34a",
        }}
      >
        {loading ? "Bitte warten..." : active ? "Ausschalten" : "Einschalten"}
      </button>
    </div>
  );
}

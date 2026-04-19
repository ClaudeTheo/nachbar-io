// app/(senior)/pair/page.tsx
// Welle B Task B6: Senior-Pair-Seite (Vollbild-QR)
// Plan: docs/plans/2026-04-19-senior-app-stufe1-implementation.md
//
// Beim Mount: POST /api/device/pair/start -> bekommt JWT pair_token.
// Token wird als Vollbild-QR angezeigt. Senior bittet Angehoerigen,
// das QR mit der QuartierApp zu scannen.
// Polling: alle 2s GET /api/device/pair/status. Sobald paired,
// refresh_token + user_id im localStorage abgelegt und auf Senior-Home
// navigiert.
//
// Token-Refresh: nach 9 Minuten neuen pair_token holen (TTL 10 min).
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  REFRESH_TOKEN_LS_KEY,
  USER_ID_LS_KEY,
  DEVICE_ID_LS_KEY,
  REFRESH_EXPIRES_LS_KEY,
} from "@/lib/device-pairing/use-refresh-rotation";

const POLL_INTERVAL_MS = 2000;
const PAIR_TOKEN_RENEW_MS = 9 * 60 * 1000; // 9 Minuten (TTL = 10 min)

type PairState =
  | { kind: "loading" }
  | { kind: "active"; token: string; pair_id: string }
  | { kind: "paired" }
  | { kind: "error"; message: string };

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "ssr-fallback";
  let id = window.localStorage.getItem(DEVICE_ID_LS_KEY);
  if (!id) {
    id = `dev-${crypto.randomUUID()}`;
    window.localStorage.setItem(DEVICE_ID_LS_KEY, id);
  }
  return id;
}

export default function SeniorPairPage() {
  const router = useRouter();
  const [state, setState] = useState<PairState>({ kind: "loading" });
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioPlayedRef = useRef(false);

  const stopAll = useCallback(() => {
    stoppedRef.current = true;
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  }, []);

  const startPairing = useCallback(async () => {
    if (stoppedRef.current) return;
    try {
      const device_id = getOrCreateDeviceId();
      const res = await fetch("/api/device/pair/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          device_id,
          user_agent:
            typeof navigator !== "undefined"
              ? navigator.userAgent.slice(0, 200)
              : undefined,
        }),
      });
      if (!res.ok) {
        setState({
          kind: "error",
          message:
            "Es konnte keine Verbindung hergestellt werden. Bitte spaeter erneut versuchen.",
        });
        return;
      }
      const data = (await res.json()) as { token: string; pair_id: string };
      setState({ kind: "active", token: data.token, pair_id: data.pair_id });
    } catch {
      setState({
        kind: "error",
        message: "Es gab einen Fehler. Bitte erneut versuchen.",
      });
    }
  }, []);

  // Initial Pair-Start
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startPairing();
    return () => {
      stopAll();
    };
  }, [startPairing, stopAll]);

  // Token-Renewal: holt nach 9 min einen frischen pair_token (TTL = 10 min).
  useEffect(() => {
    if (state.kind !== "active") return;
    const t = setTimeout(() => {
      void startPairing();
    }, PAIR_TOKEN_RENEW_MS);
    return () => clearTimeout(t);
  }, [state, startPairing]);

  // TTS-Voiceover: genau einmal beim ersten Mount in state "active".
  // Nicht bei Token-Renewal wiederholen (audioPlayedRef bleibt true).
  useEffect(() => {
    if (state.kind !== "active") return;
    if (audioPlayedRef.current) return;
    audioPlayedRef.current = true;
    const result = audioRef.current?.play();
    // play() gibt Promise<void> im Browser, undefined in aelteren Umgebungen/jsdom.
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => {
        // Autoplay-Policy blockt — stumm schlucken, visueller Text steht ja da
      });
    }
  }, [state.kind]);

  // Polling
  useEffect(() => {
    if (state.kind !== "active") return;
    const token = state.token;
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/device/pair/status?pair_token=${encodeURIComponent(token)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          status: "pending" | "paired";
          refresh_token?: string;
          user_id?: string;
          device_id?: string;
          expires_at?: string;
        };
        if (data.status === "paired" && data.refresh_token && data.user_id) {
          window.localStorage.setItem(REFRESH_TOKEN_LS_KEY, data.refresh_token);
          window.localStorage.setItem(USER_ID_LS_KEY, data.user_id);
          if (data.expires_at) {
            window.localStorage.setItem(
              REFRESH_EXPIRES_LS_KEY,
              data.expires_at,
            );
          }
          setState({ kind: "paired" });
          stopAll();
          router.push("/");
        }
      } catch {
        /* Stille Fehlerbehandlung beim Polling */
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [state, router, stopAll]);

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-2xl">
        Verbindung wird vorbereitet ...
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-semibold">Verbindung nicht moeglich</h1>
        <p className="text-xl">{state.message}</p>
        <button
          type="button"
          onClick={() => {
            stoppedRef.current = false;
            setState({ kind: "loading" });
            void startPairing();
          }}
          className="rounded-lg bg-anthrazit px-8 py-4 text-xl text-white"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (state.kind === "paired") {
    return (
      <div className="flex min-h-screen items-center justify-center text-3xl">
        Gerät verbunden — bitte warten ...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-4xl font-semibold leading-snug">Gerät einrichten</h1>
      <p className="text-2xl leading-relaxed">
        Bitte bitten Sie einen Angehörigen, diesen Code mit dem Handy
        abzufotografieren.
      </p>
      <div className="rounded-xl bg-white p-6 shadow-md">
        <QRCodeSVG value={state.token} size={320} level="M" />
      </div>
      <p className="text-base text-gray-600">
        Der Code ist 10 Minuten gültig und wird automatisch erneuert.
      </p>
      <audio
        ref={audioRef}
        src="/audio/pair-welcome.mp3"
        data-testid="pair-welcome-audio"
        preload="auto"
      />
      <button
        type="button"
        onClick={() => {
          // Weg 2: 8-stelliger Code (in Welle B noch nicht implementiert)
          alert(
            "Diese Funktion ist noch nicht verfuegbar. Bitte den QR-Code verwenden.",
          );
        }}
        className="text-lg text-anthrazit underline"
      >
        Ich habe einen Code
      </button>
    </div>
  );
}

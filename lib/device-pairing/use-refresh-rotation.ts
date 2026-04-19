// lib/device-pairing/use-refresh-rotation.ts
// Welle B Task B7: Auto-Rotation Hook fuer Senior-App
// Plan: docs/plans/2026-04-19-senior-app-stufe1-implementation.md
//
// Holt alle ROTATE_INTERVAL_MS einen frischen refresh_token und
// schreibt ihn ins localStorage. Bei 401 (Token revoked/expired)
// werden die LS-Eintraege geloescht - die App muss dann neu pairen.

"use client";

import { useEffect, useRef } from "react";

export const REFRESH_TOKEN_LS_KEY = "nachbar.senior.refresh_token";
export const USER_ID_LS_KEY = "nachbar.senior.user_id";
export const DEVICE_ID_LS_KEY = "nachbar.senior.device_id";
export const REFRESH_EXPIRES_LS_KEY = "nachbar.senior.refresh_expires_at";

export const ROTATE_INTERVAL_MS = 5 * 60 * 1000; // 5 Minuten

interface UseRefreshOptions {
  /** Wenn true: rotiert sofort beim Mount (statt erst nach Interval). */
  rotateImmediately?: boolean;
  /** Test-Override fuer das Rotations-Intervall. */
  intervalMs?: number;
}

async function rotateOnce(): Promise<void> {
  const current = window.localStorage.getItem(REFRESH_TOKEN_LS_KEY);
  if (!current) return;
  let res: Response;
  try {
    res = await fetch("/api/device/pair/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: current }),
    });
  } catch {
    return;
  }
  if (res.status === 401) {
    window.localStorage.removeItem(REFRESH_TOKEN_LS_KEY);
    window.localStorage.removeItem(USER_ID_LS_KEY);
    window.localStorage.removeItem(REFRESH_EXPIRES_LS_KEY);
    return;
  }
  if (!res.ok) return;
  const data = (await res.json()) as {
    refresh_token: string;
    user_id: string;
    expires_at: string;
  };
  window.localStorage.setItem(REFRESH_TOKEN_LS_KEY, data.refresh_token);
  window.localStorage.setItem(USER_ID_LS_KEY, data.user_id);
  window.localStorage.setItem(REFRESH_EXPIRES_LS_KEY, data.expires_at);
}

export function useRefreshTokenRotation(opts: UseRefreshOptions = {}): void {
  const { rotateImmediately = false, intervalMs = ROTATE_INTERVAL_MS } = opts;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rotateImmediately) void rotateOnce();
    timerRef.current = setInterval(() => {
      void rotateOnce();
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [rotateImmediately, intervalMs]);
}

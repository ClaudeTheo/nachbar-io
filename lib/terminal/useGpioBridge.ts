"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * GPIO-Bridge WebSocket Client fuer das Senioren-Terminal.
 * Verbindet sich mit dem lokalen Python-WebSocket-Server (ws://localhost:8765).
 * Steuert: Buzzer, LED, Display-Helligkeit.
 *
 * Reconnect-Logik: Exponentielles Backoff (1s, 2s, 4s, 8s, max 30s).
 * Im Browser-Modus (kein WebSocket auf localhost) wird simuliert.
 */

// Buzzer-Muster (muessen mit bridge.py uebereinstimmen)
export type BuzzerPattern =
  | "medication"
  | "checkin"
  | "emergency"
  | "alert"
  | "notification";

// LED-Modi
export type LedMode = "on" | "off" | "blink";

interface GpioBridgeState {
  connected: boolean;
  gpioAvailable: boolean;
}

interface UseGpioBridgeReturn {
  connected: boolean;
  gpioAvailable: boolean;
  playBuzzer: (pattern: BuzzerPattern) => void;
  setLed: (mode: LedMode) => void;
  setBrightness: (level: number) => void;
  ping: () => void;
}

const WS_URL = "ws://localhost:8765";
const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export function useGpioBridge(): UseGpioBridgeReturn {
  const [state, setState] = useState<GpioBridgeState>({
    connected: false,
    gpioAvailable: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const mountedRef = useRef(true);

  // WebSocket-Nachricht senden (nur wenn verbunden)
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.debug("[GPIO-Bridge] Nicht verbunden — Nachricht verworfen:", message);
    }
  }, []);

  // Verbindung herstellen
  const connect = useCallback(() => {
    // Verhindern, dass mehrere Verbindungen gleichzeitig laufen
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.info("[GPIO-Bridge] Verbunden mit", WS_URL);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        setState((prev) => ({ ...prev, connected: true }));

        // Status abfragen
        ws.send(JSON.stringify({ action: "status" }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          // GPIO-Verfuegbarkeit aus Status-Antwort
          if (data.gpio !== undefined) {
            setState((prev) => ({ ...prev, gpioAvailable: data.gpio }));
          }
        } catch {
          console.warn("[GPIO-Bridge] Ungueltige Nachricht:", event.data);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        console.info("[GPIO-Bridge] Verbindung geschlossen");
        setState({ connected: false, gpioAvailable: false });
        wsRef.current = null;

        // Reconnect mit exponentiellem Backoff
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
        console.debug(`[GPIO-Bridge] Reconnect in ${delay}ms...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      };

      ws.onerror = () => {
        // onclose wird danach automatisch aufgerufen
        console.debug("[GPIO-Bridge] WebSocket-Fehler (wird reconnecten)");
      };

      wsRef.current = ws;
    } catch {
      // WebSocket-Konstruktor kann in bestimmten Umgebungen fehlen
      console.debug("[GPIO-Bridge] WebSocket nicht verfuegbar");
    }
  }, []);

  // Verbindung bei Mount, Cleanup bei Unmount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // --- API-Funktionen ---

  const playBuzzer = useCallback(
    (pattern: BuzzerPattern) => {
      sendMessage({ action: "buzzer", pattern });
    },
    [sendMessage]
  );

  const setLed = useCallback(
    (mode: LedMode) => {
      sendMessage({ action: "led", mode });
    },
    [sendMessage]
  );

  const setBrightness = useCallback(
    (level: number) => {
      const clamped = Math.max(10, Math.min(255, Math.round(level)));
      sendMessage({ action: "brightness", level: clamped });
    },
    [sendMessage]
  );

  const ping = useCallback(() => {
    sendMessage({ action: "ping" });
  }, [sendMessage]);

  return {
    connected: state.connected,
    gpioAvailable: state.gpioAvailable,
    playBuzzer,
    setLed,
    setBrightness,
    ping,
  };
}

"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useTerminalData, type TerminalStatusData } from "./useTerminalData";

/** Pruefen ob die aktuelle Stunde im Nachtmodus-Fenster liegt (22:00–06:59) */
function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 7;
}

// Verfuegbare Bildschirme im Terminal
export type TerminalScreen =
  | "home"
  | "checkin"
  | "board"             // Schwarzes Brett (Quartier-Nachrichten)
  | "news"              // KI-News
  | "reminders"         // Erinnerungen (Welle 2)
  | "videochat"         // Videochat-Kontaktliste (Welle 3)
  | "photos"            // Familienfotos (Welle 2)
  | "emergency-numbers" // Wichtige Nummern (Sidebar)
  | "active-call";      // Aktiver Videoanruf (Welle 3)

// Eingehender Anruf (Overlay ueber aktuellem Screen)
export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  autoAnswer: boolean;
  offer: RTCSessionDescriptionInit;
}

// Aktiver Anruf (Video oder Audio-only)
export interface ActiveCallData {
  callId: string;
  remoteUserId: string;
  remoteName: string;
  isInitiator: boolean;
  offer?: RTCSessionDescriptionInit;
  mediaMode: 'video' | 'audio-only';
}

const UNKNOWN_CONTACT_NAME = "Unbekannter Kontakt";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDisplayName(value: unknown): string {
  return normalizeRequiredString(value) ?? UNKNOWN_CONTACT_NAME;
}

function normalizeNullableString(value: unknown): string | null {
  return normalizeRequiredString(value);
}

function normalizeOffer(value: unknown): RTCSessionDescriptionInit | null {
  if (!isRecord(value)) return null;
  if (value.type !== "offer") return null;
  const sdp = normalizeRequiredString(value.sdp);
  if (!sdp) return null;
  return { type: "offer", sdp };
}

export function normalizeIncomingCallData(call: IncomingCallData | null): IncomingCallData | null {
  if (!isRecord(call)) return null;
  const callId = normalizeRequiredString(call.callId);
  const callerId = normalizeRequiredString(call.callerId);
  const offer = normalizeOffer(call.offer);
  if (!callId || !callerId || !offer) return null;

  return {
    callId,
    callerId,
    callerName: normalizeDisplayName(call.callerName),
    callerAvatar: normalizeNullableString(call.callerAvatar),
    autoAnswer: typeof call.autoAnswer === "boolean" ? call.autoAnswer : false,
    offer,
  };
}

export function normalizeActiveCallData(call: ActiveCallData | null): ActiveCallData | null {
  if (!isRecord(call)) return null;
  const callId = normalizeRequiredString(call.callId);
  const remoteUserId = normalizeRequiredString(call.remoteUserId);
  if (!callId || !remoteUserId) return null;

  const offer = normalizeOffer(call.offer);
  const mediaMode = call.mediaMode === "audio-only" ? "audio-only" : "video";

  return {
    callId,
    remoteUserId,
    remoteName: normalizeDisplayName(call.remoteName),
    isInitiator: typeof call.isInitiator === "boolean" ? call.isInitiator : false,
    ...(offer ? { offer } : {}),
    mediaMode,
  };
}

interface TerminalContextValue {
  // Device-Token (fuer direkte API-Aufrufe aus Child-Komponenten)
  token: string;

  // Daten aus der Device-API
  data: TerminalStatusData | null;
  loading: boolean;
  error: string | null;

  // API-Aktionen
  sendCheckin: () => Promise<void>;
  ackAlert: (alertId: string) => Promise<void>;
  refresh: () => Promise<void>;

  // Bildschirm-Navigation
  activeScreen: TerminalScreen;
  setActiveScreen: (screen: TerminalScreen) => void;

  // Nachtmodus (22:00–07:00)
  isNightMode: boolean;
  nightModeOverrideUntil: Date | null;
  dismissNightMode: () => void;

  // Videoanruf-State (Welle 3)
  incomingCall: IncomingCallData | null;
  activeCall: ActiveCallData | null;
  setIncomingCall: (call: IncomingCallData | null) => void;
  setActiveCall: (call: ActiveCallData | null) => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

interface TerminalProviderProps {
  token: string;
  children: ReactNode;
}

/**
 * TerminalProvider: Stellt Terminal-Daten und Navigation fuer alle Kinder bereit.
 * Verwendet useTerminalData intern fuer API-Anbindung.
 */
export function TerminalProvider({ token, children }: TerminalProviderProps) {
  const { data, loading, error, sendCheckin, ackAlert, refresh } = useTerminalData(token);
  const [activeScreen, setActiveScreenState] = useState<TerminalScreen>("home");
  const [isNightTime_, setIsNightTime] = useState(isNightTime());
  const [nightModeOverrideUntil, setNightModeOverrideUntil] = useState<Date | null>(null);
  const [incomingCall, setIncomingCallState] = useState<IncomingCallData | null>(null);
  const [activeCall, setActiveCallState] = useState<ActiveCallData | null>(null);

  // Jede Minute pruefen ob Nachtmodus aktiv ist
  useEffect(() => {
    const interval = setInterval(() => {
      setIsNightTime(isNightTime());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Berechnen ob Nachtmodus-Overlay angezeigt werden soll
  const isNightModeOverridden =
    nightModeOverrideUntil !== null && new Date() < nightModeOverrideUntil;
  const isNightMode = isNightTime_ && !isNightModeOverridden;

  // Nachtmodus fuer 5 Minuten ausblenden
  const dismissNightMode = useCallback(() => {
    const until = new Date(Date.now() + 5 * 60 * 1000);
    setNightModeOverrideUntil(until);
  }, []);

  const setActiveScreen = useCallback((screen: TerminalScreen) => {
    setActiveScreenState(screen);
  }, []);

  const setIncomingCall = useCallback((call: IncomingCallData | null) => {
    setIncomingCallState(normalizeIncomingCallData(call));
  }, []);

  const setActiveCall = useCallback((call: ActiveCallData | null) => {
    setActiveCallState(normalizeActiveCallData(call));
  }, []);

  const value: TerminalContextValue = {
    token,
    data,
    loading,
    error,
    sendCheckin,
    ackAlert,
    refresh,
    activeScreen,
    setActiveScreen,
    isNightMode,
    nightModeOverrideUntil,
    dismissNightMode,
    incomingCall,
    activeCall,
    setIncomingCall,
    setActiveCall,
  };

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
}

/**
 * Hook: Zugriff auf den TerminalContext.
 * Wirft einen Fehler, wenn ausserhalb von TerminalProvider verwendet.
 */
export function useTerminal(): TerminalContextValue {
  const ctx = useContext(TerminalContext);
  if (!ctx) {
    throw new Error(
      "useTerminal() muss innerhalb von <TerminalProvider> verwendet werden."
    );
  }
  return ctx;
}

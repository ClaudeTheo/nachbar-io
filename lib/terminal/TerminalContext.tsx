"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useTerminalData, type TerminalStatusData } from "./useTerminalData";

// Verfuegbare Bildschirme im Terminal
export type TerminalScreen =
  | "home"
  | "checkin"
  | "emergency"
  | "medications"
  | "video"
  | "news";

interface TerminalContextValue {
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

  const setActiveScreen = useCallback((screen: TerminalScreen) => {
    setActiveScreenState(screen);
  }, []);

  const value: TerminalContextValue = {
    data,
    loading,
    error,
    sendCheckin,
    ackAlert,
    refresh,
    activeScreen,
    setActiveScreen,
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

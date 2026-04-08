"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface SosContextValue {
  isOpen: boolean;
  openSos: () => void;
  closeSos: () => void;
}

const SosContext = createContext<SosContextValue | null>(null);

/**
 * SOS-Kontext: Steuert die Sichtbarkeit des SOS-Bestaetigungsblatts.
 * Wird im App-Layout eingebunden, damit Dashboard-Kachel und Header-Icon
 * beide das gleiche Sheet oeffnen koennen.
 */
export function SosProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSos = useCallback(() => setIsOpen(true), []);
  const closeSos = useCallback(() => setIsOpen(false), []);

  return (
    <SosContext.Provider value={{ isOpen, openSos, closeSos }}>
      {children}
    </SosContext.Provider>
  );
}

export function useSos(): SosContextValue {
  const ctx = useContext(SosContext);
  if (!ctx) {
    throw new Error(
      "useSos() muss innerhalb eines <SosProvider> verwendet werden",
    );
  }
  return ctx;
}

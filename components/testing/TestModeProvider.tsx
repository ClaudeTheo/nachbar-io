"use client";

// components/testing/TestModeProvider.tsx
// Nachbar.io — Globaler Test-Modus Provider
// Stellt den Testmodus-State fuer die gesamte App bereit

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TestSession, TestResult, TestStatus, IssueSeverity, IssueType, SessionFeedback } from "@/lib/testing/types";
import { TestModePanel } from "./TestModePanel";

// ============================================================
// Context Definition
// ============================================================

interface TestModeContextValue {
  // Status
  isTester: boolean;
  isLoading: boolean;
  session: TestSession | null;
  results: Map<string, TestResult>;  // Key = test_point_id
  onboardingComplete: boolean;

  // Aktionen
  startSession: (metadata?: {
    app_version?: string;
    device_type?: string;
    browser_info?: string;
    started_from_route?: string;
    test_run_label?: string;
  }) => Promise<void>;
  updateResult: (testPointId: string, status: TestStatus, details?: {
    comment?: string;
    severity?: IssueSeverity;
    issue_type?: IssueType;
    screenshot_url?: string;
    duration_seconds?: number;
  }) => Promise<void>;
  completeSession: (feedback: SessionFeedback) => Promise<void>;
  abandonSession: () => Promise<void>;
  completeOnboarding: () => void;
  refreshSession: () => Promise<void>;

  // UI-State
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  activePathId: string | null;
  setActivePathId: (id: string | null) => void;
}

const TestModeContext = createContext<TestModeContextValue | null>(null);

export function useTestMode() {
  const ctx = useContext(TestModeContext);
  if (!ctx) {
    throw new Error("useTestMode muss innerhalb von TestModeProvider verwendet werden");
  }
  return ctx;
}

/** Sicherer Hook: gibt null zurueck wenn kein Provider vorhanden */
export function useTestModeOptional() {
  return useContext(TestModeContext);
}

// ============================================================
// Provider Komponente
// ============================================================

export function TestModeProvider({ children }: { children: ReactNode }) {
  const [isTester, setIsTester] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<TestSession | null>(null);
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());
  const [panelOpen, setPanelOpen] = useState(false);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const initialized = useRef(false);

  // ─────────────────────────────────────────────────
  // Initialisierung: Tester-Status + aktive Session laden
  // ─────────────────────────────────────────────────
  const loadTesterState = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Tester-Check
      const { data: profile } = await supabase
        .from("users")
        .select("is_tester, settings")
        .eq("id", user.id)
        .single();

      if (!profile?.is_tester) {
        setIsLoading(false);
        return;
      }

      setIsTester(true);
      setOnboardingComplete(
        (profile.settings as Record<string, unknown>)?.tester_onboarding_complete === true
      );

      // Aktive Session laden
      const res = await fetch("/api/testing/session");
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
          const map = new Map<string, TestResult>();
          for (const r of data.results ?? []) {
            map.set(r.test_point_id, r);
          }
          setResults(map);
        }
      }
    } catch (error) {
      console.error("[TestModeProvider] Initialisierung fehlgeschlagen:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadTesterState();
    }
  }, [loadTesterState]);

  // ─────────────────────────────────────────────────
  // Session starten
  // ─────────────────────────────────────────────────
  const startSession = useCallback(async (metadata?: {
    app_version?: string;
    device_type?: string;
    browser_info?: string;
    started_from_route?: string;
    test_run_label?: string;
  }) => {
    const res = await fetch("/api/testing/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata ?? {}),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Session konnte nicht gestartet werden");
    }

    const data = await res.json();
    setSession(data.session);

    const map = new Map<string, TestResult>();
    for (const r of data.results ?? []) {
      map.set(r.test_point_id, r);
    }
    setResults(map);
    setPanelOpen(true);
  }, []);

  // ─────────────────────────────────────────────────
  // Ergebnis speichern
  // ─────────────────────────────────────────────────
  const updateResult = useCallback(async (
    testPointId: string,
    status: TestStatus,
    details?: {
      comment?: string;
      severity?: IssueSeverity;
      issue_type?: IssueType;
      screenshot_url?: string;
      duration_seconds?: number;
    }
  ) => {
    const res = await fetch("/api/testing/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        test_point_id: testPointId,
        status,
        ...details,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Ergebnis konnte nicht gespeichert werden");
    }

    const result: TestResult = await res.json();
    setResults(prev => {
      const next = new Map(prev);
      next.set(testPointId, result);
      return next;
    });
  }, []);

  // ─────────────────────────────────────────────────
  // Session abschliessen
  // ─────────────────────────────────────────────────
  const completeSession = useCallback(async (feedback: SessionFeedback) => {
    const res = await fetch("/api/testing/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        ...feedback,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Session konnte nicht abgeschlossen werden");
    }

    const updated = await res.json();
    setSession(updated);
    setPanelOpen(false);
  }, []);

  // ─────────────────────────────────────────────────
  // Session abbrechen
  // ─────────────────────────────────────────────────
  const abandonSession = useCallback(async () => {
    const res = await fetch("/api/testing/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "abandoned" }),
    });

    if (res.ok) {
      const updated = await res.json();
      setSession(updated);
      setPanelOpen(false);
    }
  }, []);

  // ─────────────────────────────────────────────────
  // Onboarding abschliessen
  // ─────────────────────────────────────────────────
  const completeOnboarding = useCallback(() => {
    setOnboardingComplete(true);
    // In DB speichern: settings JSONB direkt updaten
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("settings")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            const settings = (data?.settings as Record<string, unknown>) ?? {};
            supabase
              .from("users")
              .update({ settings: { ...settings, tester_onboarding_complete: true } })
              .eq("id", user.id)
              .then(() => {});
          });
      }
    });
  }, []);

  // ─────────────────────────────────────────────────
  // Session neu laden (z.B. nach Reconnect)
  // ─────────────────────────────────────────────────
  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/testing/session");
    if (res.ok) {
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        const map = new Map<string, TestResult>();
        for (const r of data.results ?? []) {
          map.set(r.test_point_id, r);
        }
        setResults(map);
      }
    }
  }, []);

  // ─────────────────────────────────────────────────
  // Context Value
  // ─────────────────────────────────────────────────
  const value: TestModeContextValue = {
    isTester,
    isLoading,
    session,
    results,
    onboardingComplete,
    startSession,
    updateResult,
    completeSession,
    abandonSession,
    completeOnboarding,
    refreshSession,
    panelOpen,
    setPanelOpen,
    activePathId,
    setActivePathId,
  };

  // Nicht-Tester: Nur Children rendern, kein Overhead
  if (!isTester && !isLoading) {
    return <>{children}</>;
  }

  return (
    <TestModeContext.Provider value={value}>
      {children}
      {isTester && !isLoading && <TestModePanel />}
    </TestModeContext.Provider>
  );
}

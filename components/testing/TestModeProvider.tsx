"use client";

// components/testing/TestModeProvider.tsx
// Nachbar.io — Globaler Test-Modus Provider
// Stellt den Testmodus-State fuer die gesamte App bereit

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TestSession, TestResult, TestStatus, IssueSeverity, IssueType, SessionFeedback, VisitedRoute } from "@/lib/testing/types";
import { TestModePanel } from "./TestModePanel";

// ============================================================
// Context Definition
// ============================================================

/** Schluesselrouten die fuer das Auto-Tracking relevant sind */
export const KEY_ROUTES = [
  "/dashboard", "/map", "/help", "/help/new",
  "/marketplace", "/leihboerse", "/whohas", "/lost-found",
  "/board", "/events", "/tips", "/news", "/polls",
  "/messages", "/profile", "/profile/edit",
  "/care", "/notifications",
] as const;

interface TestModeContextValue {
  // Status
  isTester: boolean;
  isLoading: boolean;
  session: TestSession | null;
  results: Map<string, TestResult>;  // Key = test_point_id
  visitedRoutes: VisitedRoute[];
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
  const [visitedRoutes, setVisitedRoutes] = useState<VisitedRoute[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const initialized = useRef(false);
  const visitedRoutesRef = useRef<VisitedRoute[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

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
          // Besuchte Routen aus Session laden
          const routes: VisitedRoute[] = data.session.visited_routes ?? [];
          setVisitedRoutes(routes);
          visitedRoutesRef.current = routes;
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
    // Letzte Visited-Routes synchronisieren vor Abschluss
    const res = await fetch("/api/testing/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        visited_routes: visitedRoutesRef.current,
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
  // Automatisches Seiten-Tracking
  // ─────────────────────────────────────────────────
  const syncVisitedRoutes = useCallback(async (routes: VisitedRoute[]) => {
    if (!session || session.status !== "active" || routes.length === 0) return;
    try {
      await fetch("/api/testing/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visited_routes: routes }),
      });
    } catch {
      // Silent fail — naechster Sync-Versuch bei Route-Wechsel
    }
  }, [session]);

  // Bei Routenwechsel: Route erfassen
  useEffect(() => {
    if (!isTester || !session || session.status !== "active" || !pathname) return;

    // Normalisierte Route (ohne Query-Parameter, dynamische Segmente vereinfacht)
    const normalizedRoute = pathname.replace(/\/[0-9a-f-]{36}/g, "/[id]");

    const now = new Date().toISOString();
    const existing = visitedRoutesRef.current.find(r => r.route === normalizedRoute);

    let updated: VisitedRoute[];
    if (existing) {
      updated = visitedRoutesRef.current.map(r =>
        r.route === normalizedRoute
          ? { ...r, visit_count: r.visit_count + 1 }
          : r
      );
    } else {
      updated = [
        ...visitedRoutesRef.current,
        { route: normalizedRoute, first_visit: now, visit_count: 1 },
      ];
    }

    visitedRoutesRef.current = updated;
    setVisitedRoutes(updated);

    // Debounced Sync: Alle 10 Sekunden nach dem letzten Route-Wechsel
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = setTimeout(() => {
      syncVisitedRoutes(visitedRoutesRef.current);
    }, 10_000);
  }, [pathname, isTester, session, syncVisitedRoutes]);

  // Cleanup: Sync beim Unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      // Letzter Sync-Versuch
      if (visitedRoutesRef.current.length > 0) {
        syncVisitedRoutes(visitedRoutesRef.current);
      }
    };
  }, [syncVisitedRoutes]);

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
    visitedRoutes,
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

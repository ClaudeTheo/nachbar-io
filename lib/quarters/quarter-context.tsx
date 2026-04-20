"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { quarterDisplayName } from "@/lib/quarter-shadow";
import type { Quarter } from "./types";

// Maskiert das Schatten-Quartier (Mig 175) als "Ohne Quartier" fuer die UI.
// Free-first-Bewohner sehen so nicht den internen Seed-Namen, alle 22 Konsumenten
// von currentQuarter.name greifen automatisch auf den maskierten Namen zu.
function maskQuarter(q: Quarter | null): Quarter | null {
  if (!q) return q;
  const masked = quarterDisplayName(q.id, q.name);
  return masked === q.name ? q : { ...q, name: masked };
}

interface QuarterContextType {
  currentQuarter: Quarter | null;
  allQuarters: Quarter[];
  loading: boolean;
  switchQuarter: (quarterId: string) => void;
  refreshQuarter: () => Promise<void>;
}

// Exportiert fuer direkten useContext-Zugriff (z.B. BugReportButton anonymous-Modus)
export const QuarterContext = createContext<QuarterContextType | null>(null);

export function QuarterProvider({ children }: { children: ReactNode }) {
  const [currentQuarter, setCurrentQuarter] = useState<Quarter | null>(null);
  const [allQuarters, setAllQuarters] = useState<Quarter[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQuarter = useCallback(async () => {
    const supabase = createClient();
    const { user } = await getCachedUser(supabase);
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "super_admin") {
      // Super-Admins sehen alle Quartiere und koennen wechseln
      const { data: quarters } = await supabase
        .from("quarters")
        .select("*")
        .order("name");
      if (quarters) {
        // allQuarters bleibt unmasked, damit Super-Admin das Schatten-Quartier
        // in der Liste anhand des echten Namens identifizieren kann.
        setAllQuarters(quarters);
        const { getStorage } = await import("@/lib/platform-storage");
        const savedId = await getStorage("selected_quarter_id");
        const found = quarters.find((q) => q.id === savedId);
        setCurrentQuarter(maskQuarter(found ?? quarters[0] ?? null));
      }
    } else {
      // Normale Nutzer: Quartier ueber Haushalt ermitteln
      const { data: membership } = await supabase
        .from("household_members")
        .select("households(quarter_id)")
        .eq("user_id", user.id)
        .not("verified_at", "is", null)
        .limit(1)
        .single();

      const quarterId = (
        membership?.households as unknown as { quarter_id: string } | null
      )?.quarter_id;
      if (quarterId) {
        const { data: quarter } = await supabase
          .from("quarters")
          .select("*")
          .eq("id", quarterId)
          .single();
        if (quarter) setCurrentQuarter(maskQuarter(quarter));
      }
    }
    setLoading(false);
  }, []);

  const switchQuarter = useCallback(
    (quarterId: string) => {
      const found = allQuarters.find((q) => q.id === quarterId);
      if (found) {
        setCurrentQuarter(maskQuarter(found));
        import("@/lib/platform-storage").then(({ setStorage }) => {
          setStorage("selected_quarter_id", quarterId);
        });
      }
    },
    [allQuarters],
  );

  const refreshQuarter = useCallback(async () => {
    setLoading(true);
    await loadQuarter();
  }, [loadQuarter]);

  useEffect(() => {
    loadQuarter();
  }, [loadQuarter]);

  return (
    <QuarterContext.Provider
      value={{
        currentQuarter,
        allQuarters,
        loading,
        switchQuarter,
        refreshQuarter,
      }}
    >
      {children}
    </QuarterContext.Provider>
  );
}

// Hook fuer Zugriff auf den Quartier-Kontext
export function useQuarter() {
  const ctx = useContext(QuarterContext);
  if (!ctx)
    throw new Error(
      "useQuarter muss innerhalb von QuarterProvider verwendet werden",
    );
  return ctx;
}

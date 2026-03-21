"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseGuidelinesAcceptedReturn {
  /** true wenn Richtlinien akzeptiert wurden */
  accepted: boolean;
  /** true waehrend Ladezustand */
  loading: boolean;
  /** Richtlinien akzeptieren und in User Metadata speichern */
  acceptGuidelines: () => Promise<void>;
}

// Speichert in auth.users.raw_user_meta_data (JSONB, kein Schema-Aenderung noetig)
export function useGuidelinesAccepted(): UseGuidelinesAcceptedReturn {
  const [accepted, setAccepted] = useState(true); // Default true um Flash zu vermeiden
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAcceptance() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        setAccepted(!!user.user_metadata?.guidelines_accepted_at);
      } catch {
        // Bei Fehler nicht blockieren
        setAccepted(true);
      } finally {
        setLoading(false);
      }
    }

    checkAcceptance();
  }, []);

  const acceptGuidelines = useCallback(async () => {
    try {
      const supabase = createClient();

      await supabase.auth.updateUser({
        data: { guidelines_accepted_at: new Date().toISOString() },
      });

      setAccepted(true);
    } catch {
      // Fehler ignorieren, beim naechsten Mal erneut versuchen
    }
  }, []);

  return { accepted, loading, acceptGuidelines };
}

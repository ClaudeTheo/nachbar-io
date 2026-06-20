// modules/care/hooks/useMyCaregivers.ts
// Gegenstueck zu useAssignedSeniors: laedt fuer einen Bewohner (resident) die
// mit ihm verbundenen Angehoerigen/Helfer (caregivers). Welle S2 (Befund C2:2):
// Der Senior sah bisher niemanden in "Mein Kreis", weil dort nur die
// Caregiver->Senior-Richtung gerendert wurde. RLS-scoped:
// caregiver_links_select_resident (auth.uid() = resident_id) — der Senior liest
// ausschliesslich seine eigenen Verknuepfungen.
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";

export interface CaregiverInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
  relationship_type: string | null;
}

interface UseMyCaregiversResult {
  caregivers: CaregiverInfo[];
  loading: boolean;
  error: string | null;
}

export function useMyCaregivers(): UseMyCaregiversResult {
  const [caregivers, setCaregivers] = useState<CaregiverInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { user } = await getCachedUser(supabase);
        if (!user) {
          setLoading(false);
          return;
        }

        // Eigene aktive Verknuepfungen (resident-Richtung)
        const { data: links, error: linksError } = await supabase
          .from("caregiver_links")
          .select("caregiver_id, relationship_type")
          .eq("resident_id", user.id)
          .is("revoked_at", null);

        if (linksError) {
          setError(linksError.message);
          setLoading(false);
          return;
        }

        const relMeta = new Map<string, string | null>();
        const caregiverIds = Array.from(
          new Set(
            (links ?? [])
              .map((link) => {
                if (typeof link.caregiver_id === "string") {
                  relMeta.set(link.caregiver_id, link.relationship_type ?? null);
                }
                return link.caregiver_id;
              })
              .filter(
                (id): id is string => typeof id === "string" && id.length > 0,
              ),
          ),
        );

        if (!caregiverIds.length) {
          setCaregivers([]);
          setLoading(false);
          return;
        }

        // Caregiver-Profile laden
        const { data: profiles, error: profileError } = await supabase
          .from("users")
          .select("id, display_name, avatar_url")
          .in("id", caregiverIds);

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }

        setCaregivers(
          (profiles ?? []).map((u) => ({
            id: u.id,
            display_name: u.display_name ?? "Unbekannt",
            avatar_url: u.avatar_url ?? null,
            relationship_type: relMeta.get(u.id) ?? null,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { caregivers, loading, error };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import type { MemoryFact, MemoryConsent } from "../types";

interface UseMemoryFactsReturn {
  facts: MemoryFact[];
  consents: MemoryConsent[];
  loading: boolean;
  error: string | null;
  deleteFact: (id: string) => Promise<void>;
  updateFact: (id: string, value: string) => Promise<void>;
  resetFacts: (
    scope: "basis" | "care_need" | "personal" | "all",
  ) => Promise<void>;
  reload: () => void;
}

export interface UseMemoryFactsOptions {
  // C8: Wenn gesetzt, liest der Hook Fakten eines anderen Users via
  // ?subject_user_id=<id>. Typischer Aufrufer: Caregiver-Seite, die
  // Senior-Fakten listet. Consents werden in diesem Modus NICHT geladen
  // (Consents sind Senior-persoenlich, fuer Caregiver-UI nicht relevant).
  subjectUserId?: string;
}

export function useMemoryFacts(
  options: UseMemoryFactsOptions = {},
): UseMemoryFactsReturn {
  const { subjectUserId } = options;
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [consents, setConsents] = useState<MemoryConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const factsUrl = subjectUserId
        ? `/api/memory/facts?subject_user_id=${encodeURIComponent(subjectUserId)}`
        : "/api/memory/facts";

      if (subjectUserId) {
        // Caregiver-Modus: nur Facts, keine Consents (wir zeigen sie nicht
        // und wuerden ohnehin die des Caregivers, nicht die des Seniors,
        // bekommen).
        const factsRes = await fetch(factsUrl);
        const factsData = await factsRes.json();
        if (factsData.success) setFacts(factsData.data || []);
      } else {
        const [factsRes, consentsRes] = await Promise.all([
          fetch(factsUrl),
          fetch("/api/memory/consent"),
        ]);
        const factsData = await factsRes.json();
        const consentsData = await consentsRes.json();
        if (factsData.success) setFacts(factsData.data || []);
        if (consentsData.success) setConsents(consentsData.data || []);
      }
    } catch {
      setError("Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [subjectUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const deleteFact = useCallback(async (id: string) => {
    const res = await fetch(`/api/memory/facts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFacts((prev) => prev.filter((f) => f.id !== id));
    }
  }, []);

  const updateFact = useCallback(async (id: string, value: string) => {
    const res = await fetch(`/api/memory/facts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (res.ok) {
      setFacts((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)));
    }
  }, []);

  const resetFacts = useCallback(
    async (scope: "basis" | "care_need" | "personal" | "all") => {
      const res = await fetch("/api/memory/facts/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      if (res.ok) {
        load();
      }
    },
    [load],
  );

  return {
    facts,
    consents,
    loading,
    error,
    deleteFact,
    updateFact,
    resetFacts,
    reload: load,
  };
}

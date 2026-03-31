"use client";

import { useState, useEffect, useCallback } from "react";
import type { MemoryFact, MemoryCategory, MemoryConsent } from "../types";

interface UseMemoryFactsReturn {
  facts: MemoryFact[];
  consents: MemoryConsent[];
  loading: boolean;
  error: string | null;
  deleteFact: (id: string) => Promise<void>;
  updateFact: (id: string, value: string) => Promise<void>;
  resetFacts: (scope: "basis" | "care_need" | "personal" | "all") => Promise<void>;
  reload: () => void;
}

export function useMemoryFacts(): UseMemoryFactsReturn {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [consents, setConsents] = useState<MemoryConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [factsRes, consentsRes] = await Promise.all([
        fetch("/api/memory/facts"),
        fetch("/api/memory/consent"),
      ]);
      const factsData = await factsRes.json();
      const consentsData = await consentsRes.json();

      if (factsData.success) setFacts(factsData.data || []);
      if (consentsData.success) setConsents(consentsData.data || []);
    } catch {
      setError("Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setFacts((prev) =>
        prev.map((f) => (f.id === id ? { ...f, value } : f)),
      );
    }
  }, []);

  const resetFacts = useCallback(async (scope: "basis" | "care_need" | "personal" | "all") => {
    const res = await fetch("/api/memory/facts/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    });
    if (res.ok) {
      load();
    }
  }, [load]);

  return { facts, consents, loading, error, deleteFact, updateFact, resetFacts, reload: load };
}

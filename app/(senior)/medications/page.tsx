// app/(senior)/medications/page.tsx
// Nachbar.io — Senior-Geraet: Medikamenten-Ansicht
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SeniorMedicationScreen } from "@/modules/care/components/senior/SeniorMedicationScreen";
import type { CareMedication } from "@/lib/care/types";
import { getCachedUser } from "@/lib/supabase/cached-auth";

interface DueMed {
  medication: CareMedication;
  scheduled_at: string;
  status: string;
  snoozed_until: string | null;
}

export default function SeniorMedicationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [dueMeds, setDueMeds] = useState<DueMed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    getCachedUser(supabase).then(({ user }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const loadDueMeds = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/care/medications/due?senior_id=${userId}`);
      if (res.ok) setDueMeds(await res.json());
    } catch {
      /* Stille Fehlerbehandlung fuer Geraet */
    }
    setLoading(false);
  }, [userId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadDueMeds();
  }, [loadDueMeds]);

  // Auto-refresh alle 5 Min
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(loadDueMeds, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, loadDueMeds]);

  const handleAction = async (
    medicationId: string,
    scheduledAt: string,
    status: "taken" | "snoozed",
  ) => {
    try {
      const res = await fetch("/api/care/medications/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medication_id: medicationId,
          scheduled_at: scheduledAt,
          status,
        }),
      });
      if (res.ok) {
        await loadDueMeds();
        if (status === "taken") {
          window.location.href = "/confirmed";
        }
      }
    } catch {
      /* Stille Fehlerbehandlung fuer Geraet */
    }
  };

  const mappedMeds = dueMeds.map((d) => ({
    medication: {
      id: d.medication.id,
      name: d.medication.name,
      dosage: d.medication.dosage,
    },
    scheduled_at: d.scheduled_at,
    status: d.status,
  }));

  if (loading && dueMeds.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-3xl font-bold text-gray-600">
          Erinnerungen werden geladen...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center">Erinnerungen</h1>
      <SeniorMedicationScreen
        medications={mappedMeds}
        onAction={handleAction}
        loading={loading}
      />
    </div>
  );
}

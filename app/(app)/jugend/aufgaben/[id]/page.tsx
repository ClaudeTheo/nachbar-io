// app/(app)/jugend/aufgaben/[id]/page.tsx
// Jugend-Modul: Aufgaben-Detailseite
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient as _createClient } from "@/lib/supabase/client";
import { useYouthProfile, YouthGuard } from "@/modules/youth";
import { PageHeader } from "@/components/ui/page-header";

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  risk_level: string;
  estimated_minutes: number | null;
  points_reward: number;
  status: string;
  created_by: string;
  accepted_by: string | null;
}

export default function AufgabeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile: _profile } = useYouthProfile();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/youth/tasks/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data.task);
      }
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function handleAccept() {
    setActionLoading(true);
    const res = await fetch(`/api/youth/tasks/${id}/accept`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setTask(data.task);
    }
    setActionLoading(false);
  }

  async function handleComplete() {
    setActionLoading(true);
    const res = await fetch(`/api/youth/tasks/${id}/complete`, {
      method: "POST",
    });
    if (res.ok) {
      router.push("/jugend/aufgaben");
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center text-gray-500">
        Aufgabe nicht gefunden.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={task.title} backHref="/jugend/aufgaben" />
      <p className="text-gray-600">{task.description}</p>

      <div className="flex flex-wrap gap-3">
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
          {task.category}
        </span>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          {task.points_reward} Punkte
        </span>
        {task.estimated_minutes && (
          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
            ~{task.estimated_minutes} Min.
          </span>
        )}
        {task.risk_level === "mittel" && (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
            Mittleres Risiko
          </span>
        )}
      </div>

      {/* Aktions-Buttons */}
      {task.status === "open" && (
        <YouthGuard
          minLevel="erweitert"
          fallback={
            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              Um Aufgaben anzunehmen, benötigst du die Stufe
              &quot;Erweitert&quot;.
            </p>
          }
        >
          <button
            onClick={handleAccept}
            disabled={actionLoading}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            type="button"
          >
            {actionLoading ? "Wird angenommen..." : "Aufgabe annehmen"}
          </button>
        </YouthGuard>
      )}

      {task.status === "accepted" && task.accepted_by && (
        <button
          onClick={handleComplete}
          disabled={actionLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          type="button"
        >
          {actionLoading ? "Wird abgeschlossen..." : "Als erledigt markieren"}
        </button>
      )}

      {task.status === "completed" && (
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-center">
          <p className="font-semibold text-green-700">Aufgabe erledigt! ✓</p>
        </div>
      )}
    </div>
  );
}

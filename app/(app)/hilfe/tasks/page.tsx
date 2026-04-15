"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Loader2,
  MapPin,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { haptic } from "@/lib/haptics";

type TaskStatus = "open" | "in_progress" | "completed";
type FilterStatus = "all" | TaskStatus;

interface HelperProfileRow {
  id: string;
}

interface HelpMatchRow {
  id: string;
  request_id: string;
  confirmed_at: string | null;
  created_at: string;
}

interface HelpRequestRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  created_at: string;
  status: string;
}

interface UserRow {
  id: string;
  display_name: string | null;
}

interface HilfeTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  requester_name: string;
  category: string;
  created_at: string;
  scheduled_date: string | null;
  distance_km: number | null;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  open: { label: "Offen", color: "text-info-blue", bg: "bg-info-blue/10", icon: Clock },
  in_progress: { label: "In Bearbeitung", color: "text-alert-amber", bg: "bg-alert-amber/10", icon: Loader2 },
  completed: { label: "Erledigt", color: "text-quartier-green", bg: "bg-quartier-green/10", icon: CheckCircle2 },
};

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "Laufend" },
  { value: "completed", label: "Erledigt" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}

export default function HelferTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<HilfeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    if (!user?.id) return;

    async function loadTasks() {
      try {
        const supabase = createClient();
        const { data: helperProfile } = await supabase
          .from("neighborhood_helpers")
          .select("id")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (!helperProfile) {
          setTasks([]);
          return;
        }

        const { data: matches } = await supabase
          .from("help_matches")
          .select("id, request_id, confirmed_at, created_at")
          .eq("helper_id", (helperProfile as HelperProfileRow).id)
          .order("created_at", { ascending: false });

        const matchRows = (matches ?? []) as HelpMatchRow[];
        if (matchRows.length === 0) {
          setTasks([]);
          return;
        }

        const requestIds = matchRows.map((match) => match.request_id);
        const { data: requests } = await supabase
          .from("help_requests")
          .select("id, user_id, title, description, category, created_at, status")
          .in("id", requestIds);

        const requestRows = (requests ?? []) as HelpRequestRow[];
        const requesterIds = Array.from(
          new Set(requestRows.map((request) => request.user_id)),
        );
        const { data: requesters } = await supabase
          .from("users")
          .select("id, display_name")
          .in("id", requesterIds);

        const requesterMap = new Map(
          ((requesters ?? []) as UserRow[]).map((requester) => [
            requester.id,
            requester.display_name?.trim() || "Nachbar",
          ]),
        );
        const requestMap = new Map(
          requestRows.map((request) => [request.id, request]),
        );

        setTasks(
          matchRows
            .map((match) => {
              const request = requestMap.get(match.request_id);
              if (!request) return null;

              let status: TaskStatus = "open";
              if (request.status === "closed") {
                status = "completed";
              } else if (match.confirmed_at || request.status === "matched") {
                status = "in_progress";
              }

              return {
                id: request.id,
                title: request.title || request.category || "Hilfe-Anfrage",
                description: request.description || "",
                status,
                requester_name:
                  requesterMap.get(request.user_id) || "Nachbar",
                category: request.category || "",
                created_at: request.created_at,
                scheduled_date: null,
                distance_km: null,
              };
            })
            .filter((task): task is HilfeTask => task !== null),
        );
      } catch (err) {
        console.error("[HelferTasks] Fehler:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [user]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const counts = useMemo(() => ({
    open: tasks.filter((t) => t.status === "open").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  }), [tasks]);

  if (loading) {
    return (
      <div className="space-y-4" data-testid="tasks-loading">
        <PageHeader title="Meine Einsätze" subtitle="Aktive Hilfe-Einsätze" backHref="/hilfe" />
        <div className="h-20 rounded-2xl bg-muted animate-shimmer" />
        <div className="h-20 rounded-2xl bg-muted animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tasks-page">
      <PageHeader
        title="Meine Einsätze"
        subtitle={`${tasks.length} Einsätze insgesamt`}
        backHref="/hilfe"
      />

      {/* Status-Übersicht */}
      <div className="grid grid-cols-3 gap-2" data-testid="status-overview">
        <div className="rounded-xl bg-info-blue/10 p-3 text-center">
          <p className="text-xl font-bold text-info-blue">{counts.open}</p>
          <p className="text-xs text-muted-foreground">Offen</p>
        </div>
        <div className="rounded-xl bg-alert-amber/10 p-3 text-center">
          <p className="text-xl font-bold text-alert-amber">{counts.in_progress}</p>
          <p className="text-xs text-muted-foreground">Laufend</p>
        </div>
        <div className="rounded-xl bg-quartier-green/10 p-3 text-center">
          <p className="text-xl font-bold text-quartier-green">{counts.completed}</p>
          <p className="text-xs text-muted-foreground">Erledigt</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto" data-testid="task-filter">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setFilter(opt.value); haptic("light"); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              filter === opt.value
                ? "bg-anthrazit text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-testid={`filter-${opt.value}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Task-Liste */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "Noch keine Einsätze. Schauen Sie unter Anfragen, ob jemand Hilfe braucht."
                : `Keine ${FILTER_OPTIONS.find((f) => f.value === filter)?.label?.toLowerCase()} Einsätze.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 animate-stagger">
          {filteredTasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.status];
            const StatusIcon = statusConfig.icon;
            return (
              <Link
                key={task.id}
                href={`/hilfe/${task.id}`}
                onClick={() => haptic("light")}
                data-testid={`task-${task.id}`}
              >
                <Card className="card-interactive">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`flex-shrink-0 rounded-lg p-2 ${statusConfig.bg}`}>
                      <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-anthrazit truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {task.requester_name}
                        {task.scheduled_date && ` · ${formatDate(task.scheduled_date)}`}
                      </p>
                      {task.distance_km != null && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {task.distance_km.toFixed(1)} km
                          </span>
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

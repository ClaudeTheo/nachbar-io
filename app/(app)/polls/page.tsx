"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft, BarChart3, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Poll } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [filter, setFilter] = useState<"active" | "closed" | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      let query = supabase
        .from("polls")
        .select("*, user:users(display_name, avatar_url)")
        .order("created_at", { ascending: false });

      if (filter) query = query.eq("status", filter);

      const { data } = await query;
      if (data) {
        // Stimmen zaehlen pro Umfrage
        const pollIds = data.map((p: { id: string }) => p.id);
        const { data: votes } = await supabase
          .from("poll_votes")
          .select("poll_id")
          .in("poll_id", pollIds);

        const voteCounts: Record<string, number> = {};
        votes?.forEach((v: { poll_id: string }) => {
          voteCounts[v.poll_id] = (voteCounts[v.poll_id] || 0) + 1;
        });

        setPolls(
          data.map((p: Poll) => ({ ...p, vote_count: voteCounts[p.id] || 0 })) as Poll[]
        );
      }
    }
    load();
  }, [filter]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="rounded-lg p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-anthrazit">Umfragen</h1>
        </div>
        <Link
          href="/polls/new"
          className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
        >
          <Plus className="h-4 w-4" />
          Neu
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !filter ? "bg-anthrazit text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "active" ? "bg-quartier-green text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <span className="mr-1">🟢</span> Aktiv
        </button>
        <button
          onClick={() => setFilter("closed")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "closed" ? "bg-anthrazit text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <span className="mr-1">🔒</span> Beendet
        </button>
      </div>

      {/* Umfragen-Liste */}
      {polls.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-4xl">📊</div>
          <p className="text-muted-foreground">Noch keine Umfragen vorhanden.</p>
          <Link href="/polls/new" className="mt-2 inline-block text-sm text-quartier-green hover:underline">
            Starten Sie die erste Abstimmung.
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}

function PollCard({ poll }: { poll: Poll }) {
  const timeAgo = formatDistanceToNow(new Date(poll.created_at), { addSuffix: true, locale: de });
  const isClosed = poll.status === "closed";

  return (
    <Link
      href={`/polls/${poll.id}`}
      className="block rounded-lg border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isClosed ? "bg-muted" : "bg-quartier-green/10"}`}>
          {isClosed ? <CheckCircle2 className="h-5 w-5 text-muted-foreground" /> : <BarChart3 className="h-5 w-5 text-quartier-green" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-anthrazit">{poll.question}</h3>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={isClosed ? "secondary" : "default"}>
              {isClosed ? "Beendet" : "Aktiv"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {poll.vote_count || 0} Stimmen
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{poll.user?.display_name}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

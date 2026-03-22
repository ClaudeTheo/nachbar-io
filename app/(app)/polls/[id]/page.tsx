"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Lock, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from '@/hooks/use-auth';
import { createNotification } from "@/lib/notifications";
import type { Poll, PollOption, PollVote } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function PollDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<(PollOption & { vote_count: number })[]>([]);
  const [myVotes, setMyVotes] = useState<string[]>([]);

  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadPoll = useCallback(async () => {
    const supabase = createClient();

    // Umfrage laden
    const { data: pollData } = await supabase
      .from("polls")
      .select("*, user:users(display_name, avatar_url)")
      .eq("id", id)
      .maybeSingle();

    if (!pollData) { setLoading(false); return; }
    setPoll(pollData as unknown as Poll);

    // Optionen laden
    const { data: optData } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", id)
      .order("sort_order");

    // Stimmen laden
    const { data: voteData } = await supabase
      .from("poll_votes")
      .select("*")
      .eq("poll_id", id);

    const votes = (voteData || []) as PollVote[];
    const voteCounts: Record<string, number> = {};
    votes.forEach((v) => {
      voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
    });

    // Eigene Stimmen
    if (user) {
      setMyVotes(votes.filter((v) => v.user_id === user.id).map((v) => v.option_id));
    }

    // Unique Voter zaehlen
    const uniqueVoters = new Set(votes.map((v) => v.user_id));
    setTotalVotes(uniqueVoters.size);

    setOptions(
      (optData || []).map((o: PollOption) => ({
        ...o,
        vote_count: voteCounts[o.id] || 0,
      }))
    );

    setLoading(false);
  }, [id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadPoll(); }, [loadPoll]);

  async function vote(optionId: string) {
    if (!user?.id || !poll || poll.status === "closed") return;
    if (!poll.multiple_choice && myVotes.length > 0) return;
    if (myVotes.includes(optionId)) return;

    const supabase = createClient();
    const { error } = await supabase.from("poll_votes").insert({
      poll_id: poll.id,
      option_id: optionId,
      user_id: user?.id,
    });

    if (error) {
      toast.error("Abstimmung fehlgeschlagen.");
      return;
    }

    toast.success("Stimme abgegeben!");

    // Ersteller benachrichtigen
    if (poll.user_id) {
      createNotification({
        userId: poll.user_id,
        type: "poll_vote",
        title: "Neue Abstimmung",
        body: `Jemand hat bei „${poll.question.length > 50 ? poll.question.slice(0, 50) + "..." : poll.question}" abgestimmt.`,
        referenceId: poll.id,
        referenceType: "poll",
      });
    }

    loadPoll();
  }

  async function closePoll() {
    if (!poll) return;
    const supabase = createClient();
    await supabase.from("polls").update({ status: "closed" }).eq("id", poll.id);
    toast.success("Umfrage beendet.");
    loadPoll();
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Laden...</div>;
  if (!poll) return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">Umfrage nicht gefunden.</p>
      <Link href="/polls" className="mt-2 inline-block text-sm text-quartier-green hover:underline">Zurück</Link>
    </div>
  );

  const hasVoted = myVotes.length > 0;
  const showResults = hasVoted || poll.status === "closed";
  const maxVotes = Math.max(...options.map((o) => o.vote_count), 1);
  const isOwner = user?.id === poll.user_id;
  const timeAgo = formatDistanceToNow(new Date(poll.created_at), { addSuffix: true, locale: de });

  return (
    <div className="space-y-6">
      <PageHeader title="Umfrage" backHref="/polls" />

      {/* Frage */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant={poll.status === "closed" ? "secondary" : "default"}>
            {poll.status === "closed" ? "Beendet" : "Aktiv"}
          </Badge>
          {poll.multiple_choice && <Badge variant="outline">Mehrfachauswahl</Badge>}
        </div>
        <h2 className="text-xl font-bold text-anthrazit">{poll.question}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {poll.user?.display_name} · {timeAgo}
        </p>
      </div>

      {/* Optionen / Ergebnisse */}
      <div className="space-y-2">
        {options.map((opt) => {
          const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
          const isMyVote = myVotes.includes(opt.id);

          return (
            <button
              key={opt.id}
              onClick={() => !showResults && vote(opt.id)}
              disabled={showResults || poll.status === "closed"}
              className={`relative w-full overflow-hidden rounded-lg border-2 p-4 text-left transition-all ${
                isMyVote
                  ? "border-quartier-green bg-quartier-green/5"
                  : showResults
                    ? "border-border bg-white"
                    : "border-border bg-white hover:border-quartier-green hover:shadow-sm"
              }`}
            >
              {/* Balken */}
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 bg-quartier-green/10 transition-all duration-500"
                  style={{ width: `${(opt.vote_count / maxVotes) * 100}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className={`font-medium ${isMyVote ? "text-quartier-green" : "text-anthrazit"}`}>
                  {isMyVote && "✓ "}{opt.label}
                </span>
                {showResults && (
                  <span className="ml-2 shrink-0 text-sm font-semibold text-muted-foreground">
                    {pct}% ({opt.vote_count})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Teilnehmer-Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{totalVotes} {totalVotes === 1 ? "Nachbar hat" : "Nachbarn haben"} abgestimmt</span>
      </div>

      {/* Ersteller: Umfrage schliessen */}
      {isOwner && poll.status === "active" && (
        <Button variant="outline" onClick={closePoll} className="w-full">
          <Lock className="mr-2 h-4 w-4" />
          Umfrage beenden
        </Button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Hand, Send, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import { haversineDistance, RADIUS_DIRECT } from "@/lib/geo";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import type { HelpRequest } from "@/lib/supabase/types";

// Schnellvorschläge
const QUICK_SUGGESTIONS = [
  "eine Leiter",
  "Eier",
  "einen Akkuschrauber",
  "eine Bohrmaschine",
  "Zucker",
  "eine Sackkarre",
];

// Response-Typ
interface WhoHasResponse {
  id: string;
  help_request_id: string;
  responder_user_id: string;
  message: string;
  created_at: string;
  responder?: { display_name: string; avatar_url: string | null };
}

// Mapping: user_id → { lat, lng }
type UserPosMap = Map<string, { lat: number; lng: number }>;

export default function WhoHasPage() {
  const [questions, setQuestions] = useState<HelpRequest[]>([]);
  const [responses, setResponses] = useState<Map<string, WhoHasResponse[]>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");

  // Distanz
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [userPositions, setUserPositions] = useState<UserPosMap>(new Map());

  const { currentQuarter } = useQuarter();

  const loadData = useCallback(async () => {
    if (!currentQuarter) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    try {
      // Nur letzte 24h
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      const [questionsResult, householdsResult, membersResult] = await Promise.all([
        supabase
          .from("help_requests")
          .select("*, user:users(display_name, avatar_url)")
          .eq("quarter_id", currentQuarter.id)
          .eq("category", "whohas")
          .eq("status", "active")
          .gte("created_at", yesterday.toISOString())
          .order("created_at", { ascending: false }),
        supabase.from("households").select("id, lat, lng"),
        supabase.from("household_members").select("user_id, household_id").not("verified_at", "is", null),
      ]);

      // Position-Mapping aufbauen
      const households = (householdsResult.data ?? []) as { id: string; lat: number; lng: number }[];
      const members = (membersResult.data ?? []) as { user_id: string; household_id: string }[];
      const householdMap = new Map(households.map((h) => [h.id, { lat: h.lat, lng: h.lng }]));
      const posMap: UserPosMap = new Map();
      for (const m of members) {
        const pos = householdMap.get(m.household_id);
        if (pos) posMap.set(m.user_id, pos);
      }
      setUserPositions(posMap);
      const myPosition = posMap.get(user.id);
      if (myPosition) setMyPos(myPosition);

      const activeQuestions = (questionsResult.data ?? []) as unknown as HelpRequest[];
      setQuestions(activeQuestions);

      // Antworten laden für alle Fragen
      if (activeQuestions.length > 0) {
        const questionIds = activeQuestions.map((q) => q.id);
        const { data: respData } = await supabase
          .from("help_responses")
          .select("*, responder:users!help_responses_responder_user_id_fkey(display_name, avatar_url)")
          .in("help_request_id", questionIds)
          .order("created_at", { ascending: true });

        if (respData) {
          const respMap = new Map<string, WhoHasResponse[]>();
          for (const r of respData as unknown as WhoHasResponse[]) {
            const existing = respMap.get(r.help_request_id) ?? [];
            existing.push(r);
            respMap.set(r.help_request_id, existing);
          }
          setResponses(respMap);
        }
      }
    } catch {
      toast.error("Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [currentQuarter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function distanceTo(userId: string): number | null {
    if (!myPos) return null;
    const otherPos = userPositions.get(userId);
    if (!otherPos) return null;
    return haversineDistance(myPos.lat, myPos.lng, otherPos.lat, otherPos.lng);
  }

  function isDirect(userId: string): boolean {
    const dist = distanceTo(userId);
    if (dist === null) return true;
    return dist <= RADIUS_DIRECT;
  }

  async function submitQuestion() {
    if (!currentUserId || !newQuestion.trim()) return;
    setSending(true);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("help_requests")
      .insert({
        user_id: currentUserId,
        quarter_id: currentQuarter?.id,
        type: "need",
        category: "whohas",
        title: `Wer hat ${newQuestion.trim()}?`,
        description: null,
        status: "active",
        expires_at: expiresAt.toISOString(),
      })
      .select("*, user:users(display_name, avatar_url)")
      .single();

    if (error) {
      toast.error("Frage konnte nicht gesendet werden.");
      setSending(false);
      return;
    }

    setQuestions([data as unknown as HelpRequest, ...questions]);
    setNewQuestion("");
    toast.success("Frage an die Nachbarschaft gesendet!");
    setSending(false);
  }

  async function respondIch(questionId: string) {
    if (!currentUserId) return;
    setRespondingTo(questionId);

    const supabase = createClient();
    const { error } = await supabase.from("help_responses").insert({
      help_request_id: questionId,
      responder_user_id: currentUserId,
      message: "Ich!",
    });

    if (error) {
      toast.error("Antwort fehlgeschlagen.");
      setRespondingTo(null);
      return;
    }

    // Antwort lokal hinzufügen
    const newResp: WhoHasResponse = {
      id: crypto.randomUUID(),
      help_request_id: questionId,
      responder_user_id: currentUserId,
      message: "Ich!",
      created_at: new Date().toISOString(),
    };
    const updated = new Map(responses);
    const existing = updated.get(questionId) ?? [];
    updated.set(questionId, [...existing, newResp]);
    setResponses(updated);

    toast.success("Gemeldet!");
    setRespondingTo(null);
  }

  async function closeQuestion(id: string) {
    const supabase = createClient();
    await supabase.from("help_requests").update({ status: "closed" }).eq("id", id);
    setQuestions(questions.filter((q) => q.id !== id));
    toast.success("Frage geschlossen.");
  }

  // Aufteilen
  const myQuestions = questions.filter((q) => q.user_id === currentUserId);
  const otherQuestions = questions.filter((q) => q.user_id !== currentUserId);
  const directQuestions = otherQuestions.filter((q) => isDirect(q.user_id));
  const widerQuestions = otherQuestions.filter((q) => !isDirect(q.user_id));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Wer hat...?</h1>
      </div>

      {/* Info */}
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <Search className="mt-0.5 h-5 w-5 text-emerald-600" />
          <p className="text-sm text-emerald-700">
            Fragen Sie die Nachbarschaft! Nachbarn antworten mit einem Tap.
            Fragen verfallen automatisch nach 24 Stunden.
          </p>
        </div>
      </div>

      {/* Neue Frage */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-anthrazit">Wer hat...</h2>

        <div className="mb-3 flex gap-2">
          <Input
            placeholder="z.B. eine Leiter, Eier, einen Akkuschrauber"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            maxLength={100}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newQuestion.trim()) submitQuestion();
            }}
            className="flex-1"
          />
          <span className="flex items-center text-lg font-bold text-anthrazit">?</span>
        </div>

        {/* Schnellvorschläge */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setNewQuestion(s)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-quartier-green hover:text-anthrazit transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        <Button
          onClick={submitQuestion}
          disabled={sending || !newQuestion.trim()}
          className="w-full bg-quartier-green text-white hover:bg-quartier-green-dark"
        >
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Wird gefragt..." : "Nachbarn fragen"}
        </Button>
      </div>

      {/* Meine Fragen */}
      {myQuestions.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-anthrazit">Meine Fragen</h2>
          <div className="space-y-3">
            {myQuestions.map((q) => {
              const resps = responses.get(q.id) ?? [];
              return (
                <div key={q.id} className="rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-anthrazit">{q.title}</p>
                    <Button variant="outline" size="sm" onClick={() => closeQuestion(q.id)} className="shrink-0">
                      Schließen
                    </Button>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Verfällt {q.expires_at ? formatDistanceToNow(new Date(q.expires_at), { addSuffix: true, locale: de }) : ""}
                  </p>
                  {resps.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resps.map((r) => (
                        <div key={r.id} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm shadow-sm">
                          <Hand className="h-3.5 w-3.5 text-quartier-green" />
                          <span className="font-medium text-anthrazit">
                            {r.responder?.display_name ?? "Nachbar"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {resps.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">Noch keine Antworten</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fragen von direkten Nachbarn */}
      {directQuestions.length > 0 && (
        <QuestionList
          title="Direkte Nachbarn fragen"
          questions={directQuestions}
          responses={responses}
          currentUserId={currentUserId}
          respondingTo={respondingTo}
          onRespond={respondIch}
          distanceFn={distanceTo}
        />
      )}

      {/* Fragen von weiteren Nachbarn */}
      {widerQuestions.length > 0 && (
        <QuestionList
          title="Weitere Nachbarn fragen"
          questions={widerQuestions}
          responses={responses}
          currentUserId={currentUserId}
          respondingTo={respondingTo}
          onRespond={respondIch}
          distanceFn={distanceTo}
        />
      )}

      {/* Keine Fragen */}
      {otherQuestions.length === 0 && myQuestions.length === 0 && (
        <div className="py-8 text-center">
          <div className="mb-3 text-5xl" aria-hidden="true">🔍</div>
          <p className="text-muted-foreground">Keine offenen Fragen. Brauchen Sie etwas?</p>
        </div>
      )}
    </div>
  );
}

// Fragen-Liste
function QuestionList({
  title,
  questions,
  responses,
  currentUserId,
  respondingTo,
  onRespond,
  distanceFn,
}: {
  title: string;
  questions: HelpRequest[];
  responses: Map<string, WhoHasResponse[]>;
  currentUserId: string | null;
  respondingTo: string | null;
  onRespond: (id: string) => void;
  distanceFn: (userId: string) => number | null;
}) {
  return (
    <div>
      <h2 className="mb-3 font-semibold text-anthrazit">{title} ({questions.length})</h2>
      <div className="space-y-3">
        {questions.map((q) => {
          const dist = distanceFn(q.user_id);
          const resps = responses.get(q.id) ?? [];
          const alreadyResponded = resps.some((r) => r.responder_user_id === currentUserId);

          return (
            <div key={q.id} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg">
                  🔍
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-anthrazit">{q.user?.display_name ?? "Nachbar"}</p>
                  <p className="mt-0.5 text-sm text-anthrazit">{q.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dist !== null ? `~${Math.round(dist)}m · ` : ""}
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true, locale: de })}
                  </p>
                </div>
              </div>

              {/* Antworten */}
              {resps.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {resps.map((r) => (
                    <Badge key={r.id} className="bg-emerald-100 text-emerald-700">
                      <Hand className="mr-1 h-3 w-3" />
                      {r.responder?.display_name ?? "Nachbar"}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Antwort-Button */}
              {!alreadyResponded ? (
                <Button
                  onClick={() => onRespond(q.id)}
                  disabled={respondingTo === q.id}
                  className="mt-3 w-full bg-emerald-500 text-white hover:bg-emerald-600"
                  size="sm"
                >
                  <Hand className="mr-2 h-4 w-4" />
                  {respondingTo === q.id ? "..." : "Ich!"}
                </Button>
              ) : (
                <p className="mt-3 text-center text-xs text-emerald-600 font-medium">
                  Sie haben sich gemeldet
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

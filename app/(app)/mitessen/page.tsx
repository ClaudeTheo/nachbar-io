"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Clock, Users, ChevronRight, CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { useQuarter } from "@/lib/quarters";
import { availableServings, isNewMeal, formatMealTime } from "@/lib/meals";
import type { SharedMeal } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

export default function MitessenPage() {
  const [meals, setMeals] = useState<SharedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentQuarter } = useQuarter();

  useEffect(() => {
    if (!currentQuarter) return;
    async function load() {
      try {
        const supabase = createClient();
        const today = new Date().toISOString().split("T")[0];

        // Aktive Mahlzeiten laden
        const { data, error } = await supabase
          .from("shared_meals")
          .select("*, user:users(display_name, avatar_url)")
          .eq("quarter_id", currentQuarter!.id)
          .in("status", ["active", "full"])
          .gte("meal_date", today)
          .order("created_at", { ascending: false });

        if (error) {
          toast.error("Mitess-Plätze konnten nicht geladen werden.");
          return;
        }

        if (data) {
          const typedMeals = data as unknown as SharedMeal[];
          const mealIds = typedMeals.map((m) => m.id);

          // Signup-Counts in einer Abfrage laden (N+1 vermeiden)
          const { data: signupData } = mealIds.length > 0
            ? await supabase
                .from("meal_signups")
                .select("meal_id")
                .in("meal_id", mealIds)
                .eq("status", "confirmed")
            : { data: [] };

          const countMap = new Map<string, number>();
          for (const row of signupData ?? []) {
            countMap.set(row.meal_id, (countMap.get(row.meal_id) ?? 0) + 1);
          }

          // Eigene Signups pruefen
          const { user } = await getCachedUser(supabase);
          let mySignups = new Map<string, string>();
          if (user && mealIds.length > 0) {
            const { data: myData } = await supabase
              .from("meal_signups")
              .select("meal_id, status")
              .in("meal_id", mealIds)
              .eq("user_id", user.id);
            for (const row of myData ?? []) {
              mySignups.set(row.meal_id, row.status);
            }
          }

          const mealsWithCounts = typedMeals.map((meal) => ({
            ...meal,
            signup_count: countMap.get(meal.id) ?? 0,
            my_signup: (mySignups.get(meal.id) as SharedMeal["my_signup"]) ?? null,
          }));
          setMeals(mealsWithCounts);
        }
      } catch {
        toast.error("Netzwerkfehler beim Laden der Mitess-Plätze.");
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuarter?.id]);

  const portions = meals.filter((m) => m.type === "portion");
  const invitations = meals.filter((m) => m.type === "invitation");

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Mitess-Plätze</h1>
        <Link
          href="/mitessen/neu"
          className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
          data-testid="create-meal-button"
        >
          <Plus className="h-4 w-4" />
          Anbieten
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="portions">
          <TabsList className="w-full">
            <TabsTrigger value="portions" className="flex-1" data-testid="tab-portions">
              🍲 Portionen ({portions.length})
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex-1" data-testid="tab-invitations">
              🍽️ Einladungen ({invitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portions" className="mt-4 space-y-3">
            {portions.length === 0 ? (
              <EmptyState
                emoji="🍲"
                text="Keine Portionen verfügbar."
                subtext="Haben Sie etwas übrig? Teilen Sie es mit Ihren Nachbarn!"
              />
            ) : (
              portions.map((meal) => <MealCard key={meal.id} meal={meal} />)
            )}
          </TabsContent>

          <TabsContent value="invitations" className="mt-4 space-y-3">
            {invitations.length === 0 ? (
              <EmptyState
                emoji="🍽️"
                text="Keine Einladungen vorhanden."
                subtext="Laden Sie Ihre Nachbarn zum gemeinsamen Essen ein!"
              />
            ) : (
              invitations.map((meal) => <MealCard key={meal.id} meal={meal} />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function MealCard({ meal }: { meal: SharedMeal }) {
  const router = useRouter();
  const [signing, setSigning] = useState(false);
  const free = availableServings(meal.servings, meal.signup_count ?? 0);
  const isNew = isNewMeal(meal.created_at);
  const isFull = meal.status === "full" || free === 0;
  const alreadySignedUp = meal.my_signup === "confirmed";
  const timeLabel = formatMealTime(meal.meal_time);
  const timeAgo = formatDistanceToNow(new Date(meal.created_at), {
    addSuffix: true,
    locale: de,
  });

  async function handleSignup() {
    if (isFull || alreadySignedUp || signing) return;
    setSigning(true);
    try {
      const res = await fetch("/api/meals/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_id: meal.id, portions: 1 }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Anmeldung fehlgeschlagen.");
        return;
      }
      toast.success(meal.type === "portion" ? "Portion gesichert!" : "Anmeldung bestätigt!");
      // Seite neu laden fuer aktuellen Stand
      router.refresh();
      window.location.reload();
    } catch {
      toast.error("Netzwerkfehler bei der Anmeldung.");
    } finally {
      setSigning(false);
    }
  }

  return (
    <div
      className={`card-interactive rounded-lg border border-border bg-white p-4 shadow-soft ${
        isFull ? "opacity-60" : ""
      }`}
      data-testid="meal-card"
    >
      <div className="flex items-start gap-3">
        {/* Bild oder Emoji */}
        {meal.image_url ? (
          <img
            src={meal.image_url}
            alt={meal.title}
            className="h-14 w-14 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-quartier-green/10 text-2xl">
            {meal.type === "portion" ? "🍲" : "🍽️"}
          </div>
        )}

        {/* Inhalt */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-anthrazit truncate">{meal.title}</h3>
            {isNew && !isFull && (
              <Badge className="bg-quartier-green text-white shrink-0">Neu</Badge>
            )}
            {isFull && (
              <Badge variant="secondary" className="shrink-0">Vergeben</Badge>
            )}
            {alreadySignedUp && (
              <Badge variant="outline" className="shrink-0 border-quartier-green text-quartier-green">Angemeldet</Badge>
            )}
          </div>

          {meal.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {meal.description}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {free}/{meal.servings} frei
            </span>
            {timeLabel && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeLabel}
              </span>
            )}
            {meal.cost_hint && (
              <span className="text-quartier-green font-medium">
                {meal.cost_hint}
              </span>
            )}
          </div>

          {meal.pickup_info && meal.type === "portion" && (
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {meal.pickup_info}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {meal.user?.display_name ?? "Nachbar"} · {timeAgo}
            </p>

            {!isFull && !alreadySignedUp && (
              <button
                onClick={handleSignup}
                disabled={signing}
                className="rounded-lg bg-quartier-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-quartier-green-dark disabled:opacity-50 min-h-[44px]"
                data-testid="signup-button"
              >
                {signing
                  ? "..."
                  : meal.type === "portion"
                    ? "Portion sichern"
                    : "Ich bin dabei"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ emoji, text, subtext }: { emoji: string; text: string; subtext?: string }) {
  return (
    <div className="py-12 text-center">
      <div className="text-5xl">{emoji}</div>
      <p className="mt-3 text-muted-foreground">{text}</p>
      {subtext && (
        <p className="mt-1 text-sm text-muted-foreground/70">{subtext}</p>
      )}
    </div>
  );
}

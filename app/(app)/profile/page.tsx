"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut, Star, Shield, ChevronRight, Pencil, Bell, TrendingUp, Plane, MapPin, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrustBadge } from "@/components/TrustBadge";
import { ReputationBadge } from "@/components/ReputationBadge";
import { createClient } from "@/lib/supabase/client";
import { getCachedReputation, getProgressToNextLevel } from "@/lib/reputation";
import type { User, Household, ReputationStats } from "@/lib/supabase/types";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [reputation, setReputation] = useState<ReputationStats | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (userData) {
        setUser(userData as User);
        // Gecachte Reputation laden
        const cached = getCachedReputation(userData.settings as Record<string, unknown> | null);
        if (cached) setReputation(cached);
      }

      const { data: membership } = await supabase
        .from("household_members")
        .select("household:households(*)")
        .eq("user_id", authUser.id)
        .single();
      if (membership?.household) setHousehold(membership.household as unknown as Household);
    }
    load();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function toggleUiMode() {
    if (!user) return;
    const supabase = createClient();
    const newMode = user.ui_mode === "active" ? "senior" : "active";
    await supabase.from("users").update({ ui_mode: newMode }).eq("id", user.id);
    setUser({ ...user, ui_mode: newMode });

    // Zur passenden Startseite wechseln
    if (newMode === "senior") {
      router.push("/senior/home");
    } else {
      router.push("/dashboard");
    }
  }

  if (!user) {
    return <div className="py-12 text-center text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-anthrazit">Mein Profil</h1>

      {/* Profil-Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-quartier-green/10 text-2xl">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                "👤"
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-anthrazit">{user.display_name}</h2>
              <TrustBadge level={user.trust_level} showLabel size="md" />
              {household && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {household.street_name} {household.house_number}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menü */}
      <Card>
        <CardContent className="p-0">
          <Link
            href="/profile/edit"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Pencil className="h-5 w-5 text-muted-foreground" />
              <span>Profil bearbeiten</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/profile/skills"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-muted-foreground" />
              <span>Meine Kompetenzen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/profile/reputation"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <span>Meine Reputation</span>
                {reputation && reputation.level >= 1 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    <ReputationBadge level={reputation.level} showLabel size="sm" />
                    {reputation.points > 0 && (
                      <span className="ml-1">
                        · {reputation.points} Punkte
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/profile/notifications"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span>Benachrichtigungen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/profile/vacation"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Plane className="h-5 w-5 text-muted-foreground" />
              <span>Urlaub-Modus</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/profile/map-position"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span>Kartenposition anpassen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/help-center"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <span>Hilfecenter</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <button
            onClick={toggleUiMode}
            className="flex w-full items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span>
                {user.ui_mode === "active"
                  ? "Zum einfachen Modus wechseln"
                  : "Zum aktiven Modus wechseln"}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <Separator />

          {user.is_admin && (
            <>
              <Link
                href="/admin"
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span>Admin-Bereich</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Separator />
            </>
          )}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 p-4 text-emergency-red hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            <span>Abmelden</span>
          </button>
        </CardContent>
      </Card>

      {/* DSGVO-Info + Rechtliche Links */}
      <div className="text-center text-xs text-muted-foreground">
        <p>Ihre Daten sind geschützt. Sie können Ihr Konto jederzeit löschen.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/impressum" className="hover:text-anthrazit hover:underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-anthrazit hover:underline">
            Datenschutz
          </Link>
        </div>
      </div>
    </div>
  );
}

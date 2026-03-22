"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut, Star, Shield, ChevronRight, Pencil, Bell, TrendingUp, Plane, MapPin, CircleHelp, BarChart3, Package, UserPlus, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrustBadge } from "@/components/TrustBadge";
import { resolveAvatarUrl } from "@/lib/storage";
import { ReputationBadge } from "@/components/ReputationBadge";
import { createClient } from "@/lib/supabase/client";
import { getCachedReputation, getReputationLevel } from "@/lib/reputation";
import type { User, Household, ReputationStats } from "@/lib/supabase/types";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [reputation, setReputation] = useState<ReputationStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const supabase = createClient();
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
          console.error("[Profile] Auth fehlgeschlagen:", authError?.message || "Kein User");
          router.push("/login");
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (userError || !userData) {
          console.error("[Profile] Profil nicht gefunden:", userError?.message || "Kein Profil-Eintrag");
          setLoadError(
            "Ihr Profil konnte nicht geladen werden. " +
            "Möglicherweise wurde die Registrierung nicht vollständig abgeschlossen. " +
            "Bitte versuchen Sie es erneut oder melden Sie sich neu an."
          );
          setIsLoading(false);
          return;
        }

        setUser(userData as User);
        // Gecachte Reputation laden
        const cached = getCachedReputation(userData.settings as Record<string, unknown> | null);
        if (cached) setReputation(cached);

        // Haushalt-Daten laden (optional, Fehler nicht kritisch)
        try {
          const { data: membership } = await supabase
            .from("household_members")
            .select("household:households(*)")
            .eq("user_id", authUser.id)
            .maybeSingle();
          if (membership?.household) setHousehold(membership.household as unknown as Household);
        } catch (householdErr) {
          console.warn("[Profile] Haushalt konnte nicht geladen werden:", householdErr);
          // Nicht kritisch — Profil wird trotzdem angezeigt
        }
      } catch (err) {
        console.error("[Profile] Unerwarteter Fehler:", err);
        setLoadError("Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function toggleUiMode() {
    if (!user) return;
    const supabase = createClient();
    const newMode = (user.ui_mode || "active") === "active" ? "senior" : "active";
    await supabase.from("users").update({ ui_mode: newMode }).eq("id", user.id);
    setUser({ ...user, ui_mode: newMode });

    // Zur passenden Startseite wechseln
    if (newMode === "senior") {
      router.push("/senior/home");
    } else {
      router.push("/dashboard");
    }
  }

  // Fehler-Zustand: klare Meldung + Retry + Logout
  if (loadError) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-sm text-emergency-red">{loadError}</p>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Seite neu laden
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-emergency-red"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Abmelden
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !user) {
    return <div className="py-12 text-center text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-anthrazit">Mein Profil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Einstellungen und Übersicht</p>
      </div>

      {/* Profil-Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-quartier-green/10 text-2xl">
              {(() => {
                const av = resolveAvatarUrl(user.avatar_url);
                return av.type === "image"
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={av.value} alt="" className="h-full w-full rounded-full object-cover" />
                  : <span>{av.value}</span>;
              })()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-anthrazit">{user.display_name || "Unbekannt"}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <TrustBadge level={user.trust_level} showLabel size="md" />
                {reputation && reputation.points > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getReputationLevel(reputation.points).bgColor} ${getReputationLevel(reputation.points).color}`}
                    title={`Reputation: ${getReputationLevel(reputation.points).name}`}
                  >
                    <span>{getReputationLevel(reputation.points).icon}</span>
                    {reputation.points} Punkte
                  </span>
                )}
              </div>
              {user.bio && (
                <p className="mt-1 text-sm text-muted-foreground">{user.bio}</p>
              )}
              {household && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {household.street_name} {household.house_number}
                </p>
              )}
              {user.phone && (
                <p className="mt-0.5 text-xs text-muted-foreground">{user.phone}</p>
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
            href="/profile/location"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span>Standortfreigabe bei Hilferufen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/care/consent"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-quartier-green" />
              <div>
                <p className="font-medium text-anthrazit">Care-Einwilligungen</p>
                <p className="text-sm text-muted-foreground">Gesundheitsdaten-Einwilligungen verwalten</p>
              </div>
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
            href="/help"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <CircleHelp className="h-5 w-5 text-muted-foreground" />
              <span>Hilfecenter</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/invitations"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              <span>Meine Einladungen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/polls"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <span>Umfragen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Separator />

          <Link
            href="/packages"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span>Paketannahme</span>
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
                {(user.ui_mode || "active") === "active"
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

      {/* DSGVO — Daten & Konto */}
      <Card className="border-muted">
        <CardContent className="p-0">
          <Link
            href="/profile/delete"
            className="flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Daten exportieren & Konto löschen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* DSGVO-Info + Rechtliche Links */}
      <div className="text-center text-xs text-muted-foreground">
        <p>Ihre Daten sind geschützt gemäß DSGVO.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/impressum" className="hover:text-anthrazit hover:underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-anthrazit hover:underline">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-anthrazit hover:underline">
            AGB
          </Link>
        </div>
      </div>
    </div>
  );
}

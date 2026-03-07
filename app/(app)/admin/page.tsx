"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Users, Home, Bell, BarChart3, RefreshCw, HandHelping, ShoppingBag, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type { Alert, User, Household } from "@/lib/supabase/types";

interface Stats {
  totalUsers: number;
  totalHouseholds: number;
  occupiedHouseholds: number;
  openAlerts: number;
  totalAlerts: number;
  resolvedAlerts: number;
  activeHelpRequests: number;
  activeMarketplace: number;
  recentSignups: number;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [households, setHouseholds] = useState<(Household & { memberCount: number })[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Admin-Status prüfen
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      router.push("/dashboard");
      return;
    }

    setIsAdmin(true);
    await loadData();
  }

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    // Nutzer laden
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    // Haushalte laden
    const { data: householdData } = await supabase
      .from("households")
      .select("*")
      .order("street_name", { ascending: true });

    // Mitgliedschaften zählen
    const { data: memberData } = await supabase
      .from("household_members")
      .select("household_id");

    // Alerts laden
    const { data: alertData } = await supabase
      .from("alerts")
      .select("*, user:users(display_name), household:households(street_name, house_number)")
      .order("created_at", { ascending: false })
      .limit(50);

    // Hilfe-Börse zählen
    const { count: helpCount } = await supabase
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    // Marktplatz zählen
    const { count: marketCount } = await supabase
      .from("marketplace_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    const userList = (userData ?? []) as User[];
    const householdList = householdData ?? [];
    const members = memberData ?? [];
    const alertList = (alertData ?? []) as unknown as Alert[];

    // Mitglieder pro Haushalt zählen
    const memberCounts = new Map<string, number>();
    members.forEach((m) => {
      memberCounts.set(m.household_id, (memberCounts.get(m.household_id) ?? 0) + 1);
    });

    const enrichedHouseholds = householdList.map((h) => ({
      ...h,
      memberCount: memberCounts.get(h.id) ?? 0,
    }));

    // Registrierungen der letzten 7 Tage
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentUsers = userList.filter((u) => new Date(u.created_at) > weekAgo);

    setUsers(userList);
    setHouseholds(enrichedHouseholds);
    setAlerts(alertList);
    setStats({
      totalUsers: userList.length,
      totalHouseholds: householdList.length,
      occupiedHouseholds: enrichedHouseholds.filter((h) => h.memberCount > 0).length,
      openAlerts: alertList.filter((a) => a.status === "open").length,
      totalAlerts: alertList.length,
      resolvedAlerts: alertList.filter((a) => a.status === "resolved").length,
      activeHelpRequests: helpCount ?? 0,
      activeMarketplace: marketCount ?? 0,
      recentSignups: recentUsers.length,
    });
    setLoading(false);
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Zugriff wird geprüft...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-quartier-green" />
          <h1 className="text-xl font-bold text-anthrazit">Admin-Dashboard</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Statistiken */}
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Users className="h-5 w-5" />} label="Registrierte Nutzer" value={stats.totalUsers} />
            <StatCard icon={<Home className="h-5 w-5" />} label="Belegte Haushalte" value={`${stats.occupiedHouseholds}/${stats.totalHouseholds}`} />
            <StatCard icon={<Bell className="h-5 w-5 text-alert-amber" />} label="Offene Meldungen" value={stats.openAlerts} highlight={stats.openAlerts > 0} />
            <StatCard icon={<CheckCircle className="h-5 w-5 text-quartier-green" />} label="Erledigte Meldungen" value={stats.resolvedAlerts} />
            <StatCard icon={<HandHelping className="h-5 w-5" />} label="Aktive Hilfegesuche" value={stats.activeHelpRequests} />
            <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Marktplatz-Inserate" value={stats.activeMarketplace} />
          </div>

          {/* Aktivitäts-Hinweis */}
          <Card className="border-quartier-green/20 bg-quartier-green/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-quartier-green" />
                <span className="font-medium text-anthrazit">Letzte 7 Tage</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.recentSignups} neue Registrierung{stats.recentSignups !== 1 ? "en" : ""} · {stats.openAlerts} offene Meldung{stats.openAlerts !== 1 ? "en" : ""} · {Math.round((stats.occupiedHouseholds / stats.totalHouseholds) * 100)}% Belegungsquote
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tabs für Details */}
      <Tabs defaultValue="users">
        <TabsList className="w-full">
          <TabsTrigger value="users" className="flex-1">
            Nutzer ({users.length})
          </TabsTrigger>
          <TabsTrigger value="households" className="flex-1">
            Haushalte ({households.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex-1">
            Meldungen ({alerts.length})
          </TabsTrigger>
        </TabsList>

        {/* Nutzer-Tab */}
        <TabsContent value="users" className="mt-4 space-y-2">
          {users.map((user) => (
            <Card key={user.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-anthrazit">{user.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Registriert: {new Date(user.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge variant={user.is_admin ? "default" : "secondary"}>
                    {user.trust_level}
                  </Badge>
                  <Badge variant="outline">{user.ui_mode}</Badge>
                </div>
              </div>
            </Card>
          ))}
          {users.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">Keine Nutzer registriert.</p>
          )}
        </TabsContent>

        {/* Haushalte-Tab */}
        <TabsContent value="households" className="mt-4 space-y-2">
          {households.map((h) => (
            <Card key={h.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-anthrazit">
                    {h.street_name} {h.house_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Code: <span className="font-mono font-bold">{h.invite_code}</span>
                  </p>
                </div>
                <Badge variant={h.memberCount > 0 ? "default" : "secondary"}>
                  {h.memberCount > 0 ? `${h.memberCount} Bewohner` : "Frei"}
                </Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Meldungen-Tab */}
        <TabsContent value="alerts" className="mt-4 space-y-2">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`p-3 ${alert.status === "open" ? "border-alert-amber/50" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-anthrazit">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.household?.street_name} {alert.household?.house_number} · {alert.user?.display_name} · {new Date(alert.created_at).toLocaleString("de-DE")}
                  </p>
                </div>
                <Badge className={
                  alert.status === "open" ? "bg-alert-amber text-white" :
                  alert.status === "help_coming" ? "bg-quartier-green text-white" :
                  "bg-gray-400 text-white"
                }>
                  {alert.status === "open" ? "Offen" : alert.status === "help_coming" ? "Hilfe kommt" : "Erledigt"}
                </Badge>
              </div>
              {alert.description && (
                <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
              )}
            </Card>
          ))}
          {alerts.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">Keine Meldungen vorhanden.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Statistik-Karte Komponente
function StatCard({ icon, label, value, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-alert-amber/50 bg-alert-amber/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`mt-1 text-2xl font-bold ${highlight ? "text-alert-amber" : "text-anthrazit"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

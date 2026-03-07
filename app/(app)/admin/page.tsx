"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Users, Home, Bell, RefreshCw, HandHelping, ShoppingBag,
  TrendingUp, CheckCircle, QrCode, FileText, Activity, Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type { Alert, User, Household } from "@/lib/supabase/types";

// Admin-Komponenten
import { UserManagement } from "./components/UserManagement";
import { ContentModeration } from "./components/ContentModeration";
import { HouseholdManagement } from "./components/HouseholdManagement";
import { InviteCodeManager } from "./components/InviteCodeManager";
import { ActivityFeed } from "./components/ActivityFeed";

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
  activeLostFound: number;
  activeEvents: number;
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

    // Admin-Status pruefen
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

    // Alle Daten parallel laden
    const [
      { data: userData },
      { data: householdData },
      { data: memberData },
      { data: alertData },
      { count: helpCount },
      { count: marketCount },
      { count: lostFoundCount },
      { count: eventCount },
    ] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("households").select("*").order("street_name", { ascending: true }),
      supabase.from("household_members").select("household_id"),
      supabase
        .from("alerts")
        .select("*, user:users(display_name), household:households(street_name, house_number)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("help_requests").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("marketplace_items").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("lost_found_items").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("events").select("id", { count: "exact", head: true }).gte("event_date", new Date().toISOString().split("T")[0]),
    ]);

    const userList = (userData ?? []) as User[];
    const householdList = householdData ?? [];
    const members = memberData ?? [];
    const alertList = (alertData ?? []) as unknown as Alert[];

    // Mitglieder pro Haushalt zaehlen
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
      activeLostFound: lostFoundCount ?? 0,
      activeEvents: eventCount ?? 0,
      recentSignups: recentUsers.length,
    });
    setLoading(false);
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Zugriff wird geprueft...</p>
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

          {/* Aktivitaets-Zusammenfassung */}
          <Card className="border-quartier-green/20 bg-quartier-green/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-quartier-green" />
                <span className="font-medium text-anthrazit">Letzte 7 Tage</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.recentSignups} neue Registrierung{stats.recentSignups !== 1 ? "en" : ""}
                {" · "}{stats.openAlerts} offene Meldung{stats.openAlerts !== 1 ? "en" : ""}
                {" · "}{stats.activeEvents} anstehende Events
                {" · "}{Math.round((stats.occupiedHouseholds / Math.max(stats.totalHouseholds, 1)) * 100)}% Belegungsquote
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tabs fuer alle Admin-Bereiche */}
      <Tabs defaultValue="activity">
        <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="activity" className="text-xs flex-1 min-w-[80px]">
            <Activity className="h-3.5 w-3.5 mr-1" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs flex-1 min-w-[80px]">
            <Users className="h-3.5 w-3.5 mr-1" />
            Nutzer
          </TabsTrigger>
          <TabsTrigger value="households" className="text-xs flex-1 min-w-[80px]">
            <Home className="h-3.5 w-3.5 mr-1" />
            Haushalte
          </TabsTrigger>
          <TabsTrigger value="moderation" className="text-xs flex-1 min-w-[80px]">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Inhalte
          </TabsTrigger>
          <TabsTrigger value="codes" className="text-xs flex-1 min-w-[80px]">
            <QrCode className="h-3.5 w-3.5 mr-1" />
            Codes
          </TabsTrigger>
        </TabsList>

        {/* Aktivitaets-Feed */}
        <TabsContent value="activity" className="mt-4">
          <ActivityFeed />
        </TabsContent>

        {/* Nutzerverwaltung */}
        <TabsContent value="users" className="mt-4">
          <UserManagement users={users} onRefresh={loadData} />
        </TabsContent>

        {/* Haushalt-Verwaltung */}
        <TabsContent value="households" className="mt-4">
          <HouseholdManagement households={households} onRefresh={loadData} />
        </TabsContent>

        {/* Inhalts-Moderation */}
        <TabsContent value="moderation" className="mt-4">
          <ContentModeration />
        </TabsContent>

        {/* Einladungscode-Verwaltung */}
        <TabsContent value="codes" className="mt-4">
          <InviteCodeManager households={households} onRefresh={loadData} />
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Users, Home, RefreshCw, HandHelping, ShoppingBag,
  TrendingUp, QrCode, FileText, Activity, Megaphone,
  Newspaper, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
  TriangleAlert, Eye, MapPin, Globe, ExternalLink, Database, Terminal, Wrench,
  Settings2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Alert, User, Household } from "@/lib/supabase/types";

// Tab-Gruppen
const SYSTEM_TAB_VALUES = [
  "push", "codes", "map", "quarters", "system",
  "external", "database", "api", "devops", "flags", "kpi",
] as const;

// Admin-Komponenten
import { UserManagement } from "./components/UserManagement";
import { ContentModeration } from "./components/ContentModeration";
import { HouseholdManagement } from "./components/HouseholdManagement";
import { InviteCodeManager } from "./components/InviteCodeManager";
import { ActivityFeed } from "./components/ActivityFeed";
import { PushBroadcast } from "./components/PushBroadcast";
import { NewsManagement } from "./components/NewsManagement";
import { EventManagement } from "./components/EventManagement";
import { SystemHealth } from "./components/SystemHealth";
import { MapEditor } from "./components/MapEditor";
import { QuarterManagement } from "./components/QuarterManagement";
import { ExternalLinks } from "./components/ExternalLinks";
import { DatabaseOverview } from "./components/DatabaseOverview";
import { ApiTester } from "./components/ApiTester";
import { DevOpsPanel } from "./components/DevOpsPanel";
import { VerificationQueue } from "./components/VerificationQueue";
import { SuperAdminOverview } from "./components/SuperAdminOverview";
import { QuarterWizard } from "./components/QuarterWizard";
import { FeatureFlagManager } from "./components/FeatureFlagManager";
import { BugReports } from "./components/BugReports";
import { KpiDashboard } from "@/components/admin/KpiDashboard";
import { useUserRole } from "@/lib/quarters";

// ============================================================
// TYPEN
// ============================================================
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
  totalMessages: number;
  totalNews: number;
  seniorUsers: number;
  signupTrend: number;
  alertTrend: number;
  helpTrend: number;
}

interface QuickStat {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  highlight?: boolean;
  color?: string;
}

// ============================================================
// HAUPTKOMPONENTE
// ============================================================
export default function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [households, setHouseholds] = useState<(Household & { memberCount: number })[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [wizardOpen, setWizardOpen] = useState(false);
  const router = useRouter();
  const { isSuperAdmin } = useUserRole();

  // Standardtab fuer Super-Admins setzen
  useEffect(() => {
    if (isSuperAdmin && activeTab === "overview") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab("super-overview");
    }
  }, [isSuperAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Daten laden
  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [
      { data: userData },
      { data: householdData },
      { data: memberData },
      { data: alertData },
      { count: helpCount },
      { count: marketCount },
      { count: lostFoundCount },
      { count: eventCount },
      { count: messageCount },
      { count: newsCount },
      { count: recentSignupCount },
      { count: prevSignupCount },
      { count: recentAlertCount },
      { count: prevAlertCount },
      { count: recentHelpCount },
      { count: prevHelpCount },
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
      supabase.from("lost_found").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("events").select("id", { count: "exact", head: true }).gte("event_date", now.toISOString().split("T")[0]),
      supabase.from("conversations").select("id", { count: "exact", head: true }),
      supabase.from("news_items").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
      supabase.from("alerts").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
      supabase.from("alerts").select("id", { count: "exact", head: true }).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
      supabase.from("help_requests").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
      supabase.from("help_requests").select("id", { count: "exact", head: true }).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
    ]);

    const userList = (userData ?? []) as User[];
    const householdList = householdData ?? [];
    const members = memberData ?? [];
    const alertList = (alertData ?? []) as unknown as Alert[];

    const memberCounts = new Map<string, number>();
    members.forEach((m) => {
      memberCounts.set(m.household_id, (memberCounts.get(m.household_id) ?? 0) + 1);
    });

    const enrichedHouseholds = householdList.map((h) => ({
      ...h,
      memberCount: memberCounts.get(h.id) ?? 0,
    }));

    function calcTrend(recent: number, prev: number): number {
      if (prev === 0) return recent > 0 ? 100 : 0;
      return Math.round(((recent - prev) / prev) * 100);
    }

    setUsers(userList);
    setHouseholds(enrichedHouseholds);
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
      recentSignups: recentSignupCount ?? 0,
      totalMessages: messageCount ?? 0,
      totalNews: newsCount ?? 0,
      seniorUsers: userList.filter((u) => u.ui_mode === "senior").length,
      signupTrend: calcTrend(recentSignupCount ?? 0, prevSignupCount ?? 0),
      alertTrend: calcTrend(recentAlertCount ?? 0, prevAlertCount ?? 0),
      helpTrend: calcTrend(recentHelpCount ?? 0, prevHelpCount ?? 0),
    });
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  // Admin-Pruefung + Daten laden
  useEffect(() => {
    async function init() {
      if (!user) return;
      const supabase = createClient();

      const { data: profile } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) { router.push("/dashboard"); return; }

      setIsAdmin(true);
      await loadData();
    }
    init();
  }, [router, loadData, user]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground animate-pulse" />
          <p className="mt-2 text-muted-foreground">Zugriff wird geprueft...</p>
        </div>
      </div>
    );
  }

  const occupancyRate = stats
    ? Math.round((stats.occupiedHouseholds / Math.max(stats.totalHouseholds, 1)) * 100)
    : 0;

  const quickStats: QuickStat[] = stats ? [
    { icon: <Users className="h-5 w-5" />, label: "Nutzer gesamt", value: stats.totalUsers, trend: stats.signupTrend },
    { icon: <Home className="h-5 w-5" />, label: "Belegungsquote", value: `${occupancyRate}%`, color: occupancyRate > 50 ? "text-quartier-green" : "text-alert-amber" },
    { icon: <TriangleAlert className="h-5 w-5 text-alert-amber" />, label: "Offene Meldungen", value: stats.openAlerts, highlight: stats.openAlerts > 0, trend: stats.alertTrend },
    { icon: <HandHelping className="h-5 w-5 text-blue-500" />, label: "Aktive Hilfegesuche", value: stats.activeHelpRequests, trend: stats.helpTrend },
    { icon: <ShoppingBag className="h-5 w-5 text-purple-500" />, label: "Marktplatz-Inserate", value: stats.activeMarketplace },
    { icon: <Calendar className="h-5 w-5 text-indigo-500" />, label: "Anstehende Events", value: stats.activeEvents },
  ] : [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-quartier-green/10">
            <Shield className="h-5 w-5 text-quartier-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-anthrazit">Admin-Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Aktualisiert: {lastRefresh.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Navigation */}
      <div className="space-y-2">
        {/* Primaere Tabs: Quartier-Verwaltung */}
        <Tabs value={SYSTEM_TAB_VALUES.includes(activeTab as typeof SYSTEM_TAB_VALUES[number]) ? "" : activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
            {isSuperAdmin && (
              <TabsTrigger value="super-overview" className="text-xs flex-1 min-w-[70px]">
                <Globe className="h-3.5 w-3.5 mr-1" />Plattform
              </TabsTrigger>
            )}
            <TabsTrigger value="overview" className="text-xs flex-1 min-w-[60px]">
              <BarChart3 className="h-3.5 w-3.5 mr-1" />Uebersicht
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs flex-1 min-w-[50px]">
              <Activity className="h-3.5 w-3.5 mr-1" />Feed
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs flex-1 min-w-[55px]">
              <Users className="h-3.5 w-3.5 mr-1" />Nutzer
            </TabsTrigger>
            <TabsTrigger value="households" className="text-xs flex-1 min-w-[65px]">
              <Home className="h-3.5 w-3.5 mr-1" />Haushalte
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs flex-1 min-w-[55px]">
              <FileText className="h-3.5 w-3.5 mr-1" />Inhalte
            </TabsTrigger>
            <TabsTrigger value="news" className="text-xs flex-1 min-w-[50px]">
              <Newspaper className="h-3.5 w-3.5 mr-1" />News
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs flex-1 min-w-[55px]">
              <Calendar className="h-3.5 w-3.5 mr-1" />Events
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* System-Tabs: Dropdown */}
        <Select
          value={SYSTEM_TAB_VALUES.includes(activeTab as typeof SYSTEM_TAB_VALUES[number]) ? activeTab : null}
          onValueChange={(val) => setActiveTab(val as string)}
        >
          <SelectTrigger className="w-full h-8 text-xs">
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="System & Werkzeuge..." />
            </div>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              <SelectLabel>System & Werkzeuge</SelectLabel>
              <SelectItem value="push"><Megaphone className="h-3.5 w-3.5 text-muted-foreground" />Push</SelectItem>
              <SelectItem value="codes"><QrCode className="h-3.5 w-3.5 text-muted-foreground" />Codes</SelectItem>
              <SelectItem value="map"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />Karte</SelectItem>
              <SelectItem value="quarters"><Globe className="h-3.5 w-3.5 text-muted-foreground" />Quartiere</SelectItem>
              <SelectItem value="system"><Eye className="h-3.5 w-3.5 text-muted-foreground" />System-Health</SelectItem>
              <SelectItem value="external"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />Externe Links</SelectItem>
              <SelectItem value="database"><Database className="h-3.5 w-3.5 text-muted-foreground" />Datenbank</SelectItem>
              <SelectItem value="api"><Terminal className="h-3.5 w-3.5 text-muted-foreground" />API-Tester</SelectItem>
              <SelectItem value="devops"><Wrench className="h-3.5 w-3.5 text-muted-foreground" />DevOps</SelectItem>
              <SelectItem value="flags"><Settings2 className="h-3.5 w-3.5 text-muted-foreground" />Feature Flags</SelectItem>
              <SelectItem value="kpi"><BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />KPI-Dashboard</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Bug-Reports als eigener Button (base-ui Select hat 12-Item-Limit) */}
        <button
          onClick={() => setActiveTab("bugs")}
          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
            activeTab === "bugs"
              ? "border-alert-amber bg-alert-amber/10 text-alert-amber font-medium"
              : "border-input bg-transparent text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <TriangleAlert className="h-3.5 w-3.5" />
          Bug-Reports
        </button>
      </div>

      {/* QuarterWizard Dialog (fuer Super-Admins) */}
      {isSuperAdmin && (
        <QuarterWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onCreated={() => {
            setWizardOpen(false);
            // SuperAdminOverview laedt selbst nach
          }}
        />
      )}

      {/* Tab-Inhalte (bedingt gerendert) */}
      <div className="mt-4">
        {activeTab === "super-overview" && isSuperAdmin && (
          <SuperAdminOverview
            onOpenWizard={() => setWizardOpen(true)}
            onSwitchTab={setActiveTab}
          />
        )}

        {activeTab === "overview" && stats && (
          <div className="space-y-4">
            {/* Verifizierungs-Queue — immer ganz oben */}
            <VerificationQueue />

            <div className="grid grid-cols-2 gap-3">
              {quickStats.map((qs, i) => (
                <StatCard key={i} stat={qs} />
              ))}
            </div>

            {/* Quartierspuls */}
            <Card className="border-quartier-green/20 bg-quartier-green/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-quartier-green" />
                  <span className="font-semibold text-anthrazit">Quartierspuls — Letzte 7 Tage</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <PulseItem label="Neue Nutzer" value={stats.recentSignups} />
                  <PulseItem label="Belegungsquote" value={`${occupancyRate}%`} />
                  <PulseItem label="Erledigte Alerts" value={stats.resolvedAlerts} color="text-quartier-green" />
                  <PulseItem label="Seniorenmodus" value={stats.seniorUsers} />
                </div>
              </CardContent>
            </Card>

            {/* Modulnutzung */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-anthrazit mb-3">Modulnutzung</h3>
                <div className="space-y-2.5">
                  <ActivityBar label="Meldungen" value={stats.openAlerts} max={Math.max(stats.totalAlerts, 1)} color="bg-alert-amber" />
                  <ActivityBar label="Hilfe-Boerse" value={stats.activeHelpRequests} max={Math.max(stats.activeHelpRequests + 5, 10)} color="bg-blue-500" />
                  <ActivityBar label="Marktplatz" value={stats.activeMarketplace} max={Math.max(stats.activeMarketplace + 5, 10)} color="bg-purple-500" />
                  <ActivityBar label="Events" value={stats.activeEvents} max={Math.max(stats.activeEvents + 3, 10)} color="bg-indigo-500" />
                  <ActivityBar label="Fundbuero" value={stats.activeLostFound} max={Math.max(stats.activeLostFound + 3, 10)} color="bg-orange-500" />
                  <ActivityBar label="Nachrichten" value={stats.totalMessages} max={Math.max(stats.totalMessages + 5, 10)} color="bg-quartier-green" />
                  <ActivityBar label="News" value={stats.totalNews} max={Math.max(stats.totalNews + 5, 10)} color="bg-rose-500" />
                </div>
              </CardContent>
            </Card>

            {/* Schnellzugriff */}
            <div className="grid grid-cols-2 gap-2">
              <QuickActionCard icon={<TriangleAlert className="h-5 w-5 text-alert-amber" />} label="Offene Meldungen" count={stats.openAlerts} onClick={() => setActiveTab("content")} urgent={stats.openAlerts > 0} />
              <QuickActionCard icon={<Users className="h-5 w-5 text-quartier-green" />} label="Nutzer verwalten" count={stats.totalUsers} onClick={() => setActiveTab("users")} />
              <QuickActionCard icon={<Megaphone className="h-5 w-5 text-blue-500" />} label="Push senden" onClick={() => setActiveTab("push")} />
              <QuickActionCard icon={<Newspaper className="h-5 w-5 text-rose-500" />} label="News erstellen" onClick={() => setActiveTab("news")} />
            </div>
          </div>
        )}

        {activeTab === "activity" && <ActivityFeed />}
        {activeTab === "users" && <UserManagement users={users} onRefresh={loadData} />}
        {activeTab === "households" && <HouseholdManagement households={households} onRefresh={loadData} />}
        {activeTab === "content" && <ContentModeration />}
        {activeTab === "news" && <NewsManagement />}
        {activeTab === "events" && <EventManagement />}
        {activeTab === "push" && <PushBroadcast />}
        {activeTab === "codes" && <InviteCodeManager households={households} onRefresh={loadData} />}
        {activeTab === "map" && <MapEditor />}
        {activeTab === "quarters" && <QuarterManagement />}
        {activeTab === "system" && <SystemHealth stats={stats} users={users} households={households} />}
        {activeTab === "external" && <ExternalLinks />}
        {activeTab === "database" && <DatabaseOverview />}
        {activeTab === "api" && <ApiTester />}
        {activeTab === "devops" && <DevOpsPanel />}
        {activeTab === "flags" && <FeatureFlagManager />}
        {activeTab === "kpi" && <KpiDashboard />}
        {activeTab === "bugs" && <BugReports />}
      </div>
    </div>
  );
}

// ============================================================
// HILFSKOMPONENTEN
// ============================================================

function StatCard({ stat }: { stat: QuickStat }) {
  return (
    <Card className={stat.highlight ? "border-alert-amber/50 bg-alert-amber/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            {stat.icon}
            <span className="text-xs">{stat.label}</span>
          </div>
          {stat.trend !== undefined && stat.trend !== 0 && <TrendIndicator value={stat.trend} />}
        </div>
        <p className={`mt-1 text-2xl font-bold ${stat.color ?? (stat.highlight ? "text-alert-amber" : "text-anthrazit")}`}>
          {stat.value}
        </p>
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ value }: { value: number }) {
  if (value > 0) return <span className="flex items-center gap-0.5 text-xs font-medium text-quartier-green"><ArrowUpRight className="h-3 w-3" />{value}%</span>;
  if (value < 0) return <span className="flex items-center gap-0.5 text-xs font-medium text-red-500"><ArrowDownRight className="h-3 w-3" />{Math.abs(value)}%</span>;
  return <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" /></span>;
}

function PulseItem({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${color ?? "text-anthrazit"}`}>{value}</span>
    </div>
  );
}

function ActivityBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = Math.min(100, Math.max(2, (value / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-anthrazit">{value}</span>
    </div>
  );
}

function QuickActionCard({ icon, label, count, onClick, urgent }: { icon: React.ReactNode; label: string; count?: number; onClick: () => void; urgent?: boolean }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-md active:scale-[0.98] ${urgent ? "border-alert-amber/50 bg-alert-amber/5" : "border-border bg-white"}`}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-anthrazit">{label}</p>
        {count !== undefined && <p className={`text-xs ${urgent ? "text-alert-amber font-semibold" : "text-muted-foreground"}`}>{count} aktiv</p>}
      </div>
    </button>
  );
}

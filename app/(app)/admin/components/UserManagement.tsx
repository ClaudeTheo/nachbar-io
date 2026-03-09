"use client";

import { useState } from "react";
import { UserCog, ShieldCheck, ShieldOff, Ban, CheckCircle, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { TRUST_LEVELS } from "@/lib/constants";
import type { User, TrustLevel } from "@/lib/supabase/types";
import { toast } from "sonner";

interface UserManagementProps {
  users: User[];
  onRefresh: () => void;
}

export function UserManagement({ users, onRefresh }: UserManagementProps) {
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");

  // Bann-Funktion: Trust-Level auf "banned" setzen (deaktiviert Zugang via RLS)
  async function banUser(userId: string, isBanned: boolean) {
    setUpdating(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ trust_level: isBanned ? "new" : "banned" })
      .eq("id", userId);

    if (error) {
      toast.error("Fehler beim Sperren/Entsperren");
    } else {
      toast.success(isBanned ? "Nutzer entsperrt" : "Nutzer gesperrt");
      onRefresh();
    }
    setUpdating(null);
  }

  // Aktivitaets-Filter
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Filter nach Suchbegriff und Aktivitaet
  const filtered = users.filter((u) => {
    const matchesSearch =
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.trust_level.includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activityFilter === "active") {
      return u.last_seen && new Date(u.last_seen) > thirtyDaysAgo;
    }
    if (activityFilter === "inactive") {
      return !u.last_seen || new Date(u.last_seen) <= thirtyDaysAgo;
    }
    return true;
  });

  // Trust-Level aendern
  async function changeTrustLevel(userId: string, newLevel: TrustLevel) {
    setUpdating(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ trust_level: newLevel })
      .eq("id", userId);

    if (error) {
      toast.error("Fehler beim Aendern des Trust-Levels");
    } else {
      toast.success(`Trust-Level auf "${TRUST_LEVELS[newLevel].label}" geaendert`);
      onRefresh();
    }
    setUpdating(null);
  }

  // Admin-Status umschalten
  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    setUpdating(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ is_admin: !currentIsAdmin })
      .eq("id", userId);

    if (error) {
      toast.error("Fehler beim Aendern des Admin-Status");
    } else {
      toast.success(currentIsAdmin ? "Admin-Rechte entzogen" : "Admin-Rechte vergeben");
      onRefresh();
    }
    setUpdating(null);
  }

  // UI-Modus aendern
  async function changeUiMode(userId: string, newMode: "active" | "senior") {
    setUpdating(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ ui_mode: newMode })
      .eq("id", userId);

    if (error) {
      toast.error("Fehler beim Aendern des Modus");
    } else {
      toast.success(`Modus auf "${newMode === "senior" ? "Seniorenmodus" : "Normal"}" geaendert`);
      onRefresh();
    }
    setUpdating(null);
  }

  const trustLevelOrder: TrustLevel[] = ["new", "verified", "trusted", "admin"];

  return (
    <div className="space-y-3">
      {/* Suchfeld */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nutzer suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Aktivitaets-Filter */}
      <div className="flex gap-1.5">
        <Button size="sm" variant={activityFilter === "all" ? "default" : "outline"} className="text-xs h-7" onClick={() => setActivityFilter("all")}>
          Alle ({users.length})
        </Button>
        <Button size="sm" variant={activityFilter === "active" ? "default" : "outline"} className="text-xs h-7" onClick={() => setActivityFilter("active")}>
          Aktiv (30d)
        </Button>
        <Button size="sm" variant={activityFilter === "inactive" ? "default" : "outline"} className="text-xs h-7" onClick={() => setActivityFilter("inactive")}>
          Inaktiv
        </Button>
      </div>

      {/* Statistik-Zeile */}
      <div className="flex gap-2 text-xs text-muted-foreground">
        <span>{filtered.length} Nutzer</span>
        <span>·</span>
        <span>{users.filter(u => u.is_admin).length} Admins</span>
        <span>·</span>
        <span>{users.filter(u => u.ui_mode === "senior").length} Senioren</span>
        <span>·</span>
        <span>{users.filter(u => (u.trust_level as string) === "banned").length} Gesperrt</span>
      </div>

      {/* Nutzer-Liste */}
      {filtered.map((user) => {
        const isExpanded = expandedUser === user.id;
        const isUpdating = updating === user.id;

        return (
          <Card key={user.id} className={`overflow-hidden transition-all ${isUpdating ? "opacity-60" : ""}`}>
            {/* Nutzer-Zeile (klickbar) */}
            <button
              className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/30"
              onClick={() => setExpandedUser(isExpanded ? null : user.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-anthrazit truncate">{user.display_name}</p>
                  {user.is_admin && (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-purple-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registriert: {new Date(user.created_at).toLocaleDateString("de-DE")}
                  {user.last_seen && ` · Zuletzt: ${new Date(user.last_seen).toLocaleDateString("de-DE")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={user.trust_level === "admin" ? "default" : "secondary"}
                  className={
                    user.trust_level === "trusted" ? "bg-blue-100 text-blue-800" :
                    user.trust_level === "verified" ? "bg-green-100 text-green-800" :
                    user.trust_level === "new" ? "bg-gray-100 text-gray-600" :
                    ""
                  }
                >
                  {TRUST_LEVELS[user.trust_level]?.label ?? user.trust_level}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Erweiterte Aktionen */}
            {isExpanded && (
              <CardContent className="border-t bg-muted/10 p-3 space-y-3">
                {/* Trust-Level */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Trust-Level aendern</p>
                  <div className="flex flex-wrap gap-1.5">
                    {trustLevelOrder.map((level) => (
                      <Button
                        key={level}
                        size="sm"
                        variant={user.trust_level === level ? "default" : "outline"}
                        className="text-xs h-7"
                        disabled={isUpdating || user.trust_level === level}
                        onClick={() => changeTrustLevel(user.id, level)}
                      >
                        {TRUST_LEVELS[level].label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* UI-Modus */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">UI-Modus</p>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={user.ui_mode === "active" ? "default" : "outline"}
                      className="text-xs h-7"
                      disabled={isUpdating || user.ui_mode === "active"}
                      onClick={() => changeUiMode(user.id, "active")}
                    >
                      Normal
                    </Button>
                    <Button
                      size="sm"
                      variant={user.ui_mode === "senior" ? "default" : "outline"}
                      className="text-xs h-7"
                      disabled={isUpdating || user.ui_mode === "senior"}
                      onClick={() => changeUiMode(user.id, "senior")}
                    >
                      Seniorenmodus
                    </Button>
                  </div>
                </div>

                {/* Admin-Toggle */}
                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-2">
                    {user.is_admin ? (
                      <ShieldCheck className="h-4 w-4 text-purple-500" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {user.is_admin ? "Administrator" : "Standard-Nutzer"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={user.is_admin ? "destructive" : "outline"}
                    className="text-xs h-7"
                    disabled={isUpdating}
                    onClick={() => toggleAdmin(user.id, user.is_admin)}
                  >
                    {user.is_admin ? "Admin entziehen" : "Zum Admin machen"}
                  </Button>
                </div>

                {/* Bann-Aktion */}
                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-2">
                    <Ban className={`h-4 w-4 ${(user.trust_level as string) === "banned" ? "text-red-500" : "text-muted-foreground"}`} />
                    <span className="text-sm">
                      {(user.trust_level as string) === "banned" ? "Nutzer ist gesperrt" : "Nutzer sperren"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={(user.trust_level as string) === "banned" ? "outline" : "destructive"}
                    className="text-xs h-7"
                    disabled={isUpdating}
                    onClick={() => banUser(user.id, (user.trust_level as string) === "banned")}
                  >
                    {(user.trust_level as string) === "banned" ? "Entsperren" : "Sperren"}
                  </Button>
                </div>

                {/* Nutzer-ID (fuer Debugging) */}
                <p className="text-[10px] text-muted-foreground/50 font-mono truncate pt-1">
                  ID: {user.id}
                </p>
              </CardContent>
            )}
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          {search ? "Keine Nutzer gefunden." : "Keine Nutzer registriert."}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Users, UserCog, ShieldCheck, ShieldOff, Ban, Search, ChevronDown, ChevronUp, UserPlus, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { TRUST_LEVELS } from "@/lib/constants";
import type { User, TrustLevel } from "@/lib/supabase/types";
import { toast } from "sonner";
import { VerificationQueue } from "./VerificationQueue";

interface UserManagementProps {
  users: User[];
  onRefresh: () => void;
}

export function UserManagement({ users, onRefresh }: UserManagementProps) {
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserStreet, setNewUserStreet] = useState("");
  const [newUserHouseNumber, setNewUserHouseNumber] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserMode, setNewUserMode] = useState<"active" | "senior">("senior");
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Admin: Konto fuer Nachbar erstellen
  async function createUserAccount() {
    if (!newUserName.trim() || !newUserStreet || !newUserHouseNumber.trim()) {
      toast.error("Name, Strasse und Hausnummer sind erforderlich");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: newUserName.trim(),
          street: newUserStreet,
          houseNumber: newUserHouseNumber.trim(),
          email: newUserEmail.trim() || undefined,
          uiMode: newUserMode,
          verified: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Fehler beim Erstellen");
      } else {
        toast.success(`Konto für ${newUserName} erstellt`);
        setCreatedCredentials({ email: data.email, password: data.tempPassword });
        setNewUserName("");
        setNewUserHouseNumber("");
        setNewUserEmail("");
        onRefresh();
      }
    } catch {
      toast.error("Netzwerkfehler");
    }
    setCreating(false);
  }

  async function copyPassword(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      toast.success("Passwort kopiert!");
      setTimeout(() => setCopiedPassword(false), 3000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

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
  const bannedCount = users.filter(u => (u.trust_level as string) === "banned").length;

  return (
    <div className="space-y-4">
      {/* Konto fuer Nachbar erstellen — kompakt wenn eingeklappt */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 text-sm font-medium text-quartier-green hover:text-quartier-green-dark transition-colors py-1"
        >
          <UserPlus className="h-4 w-4" />
          Konto fuer Nachbar erstellen
          <ChevronDown className="h-3 w-3" />
        </button>
      ) : (
        <Card className="border-quartier-green/30">
          <CardContent className="p-4 space-y-3">
            <button
              onClick={() => { setShowCreateForm(false); setCreatedCredentials(null); }}
              className="flex w-full items-center justify-between"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-quartier-green">
                <UserPlus className="h-4 w-4" /> Konto fuer Nachbar erstellen
              </span>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="space-y-2 pt-2 border-t">
              <Input
                placeholder="Name (z.B. Erika Mueller)"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Strasse..."
                  value={newUserStreet}
                  onChange={(e) => setNewUserStreet(e.target.value)}
                />
                <Input
                  placeholder="Hausnr."
                  value={newUserHouseNumber}
                  onChange={(e) => setNewUserHouseNumber(e.target.value)}
                />
              </div>
              <Input
                placeholder="E-Mail (optional)"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={newUserMode === "senior" ? "default" : "outline"}
                  className="flex-1 text-xs h-8"
                  onClick={() => setNewUserMode("senior")}
                >
                  Seniorenmodus
                </Button>
                <Button
                  size="sm"
                  variant={newUserMode === "active" ? "default" : "outline"}
                  className="flex-1 text-xs h-8"
                  onClick={() => setNewUserMode("active")}
                >
                  Normal
                </Button>
              </div>
              <Button
                className="w-full bg-quartier-green hover:bg-quartier-green-dark"
                onClick={createUserAccount}
                disabled={creating || !newUserName.trim() || !newUserStreet || !newUserHouseNumber.trim()}
              >
                {creating ? "Wird erstellt..." : "Konto erstellen"}
              </Button>

              {createdCredentials && (
                <Card className="border-quartier-green bg-quartier-green/5">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-semibold text-quartier-green">Zugangsdaten (einmalig sichtbar!):</p>
                    <div className="text-xs space-y-1">
                      <p><span className="text-muted-foreground">E-Mail:</span> <span className="font-mono">{createdCredentials.email}</span></p>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Passwort:</span>
                        <span className="font-mono font-bold">{createdCredentials.password}</span>
                        <button
                          onClick={() => copyPassword(createdCredentials.password)}
                          className="ml-1"
                          title="Passwort kopieren"
                        >
                          {copiedPassword ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-alert-amber">
                      Bitte notieren und dem Nutzer mitteilen. Das Passwort kann danach nicht mehr angezeigt werden.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verifizierungs-Queue */}
      <VerificationQueue />

      {/* Nutzerliste */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nutzerliste
        </h3>

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

        {/* Statistik-Pillen */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-anthrazit/5 px-3 py-1 text-xs font-medium text-anthrazit">
            <Users className="h-3 w-3" />
            {filtered.length} Nutzer
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
            <ShieldCheck className="h-3 w-3" />
            {users.filter(u => u.is_admin).length} Admins
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <UserCog className="h-3 w-3" />
            {users.filter(u => u.ui_mode === "senior").length} Senioren
          </span>
          {bannedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
              <Ban className="h-3 w-3" />
              {bannedCount} Gesperrt
            </span>
          )}
        </div>

        {/* Nutzer-Liste mit Avataren */}
        <div className="space-y-2">
          {filtered.map((user) => {
            const isExpanded = expandedUser === user.id;
            const isUpdating = updating === user.id;

            return (
              <Card key={user.id} className={`overflow-hidden transition-all ${isUpdating ? "opacity-60" : ""}`}>
                <button
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/30"
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                >
                  {/* Avatar mit Initialen */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${getAvatarColor(user.display_name)}`}>
                    {getInitials(user.display_name)}
                  </div>

                  {/* Name + Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-anthrazit truncate">{user.display_name}</p>
                      {user.is_admin && (
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                      )}
                      {user.ui_mode === "senior" && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-200 text-blue-600">
                          Senior
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("de-DE")}
                      {user.last_seen && ` · ${new Date(user.last_seen).toLocaleDateString("de-DE")}`}
                    </p>
                  </div>

                  {/* Status-Badge + Chevron */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant={user.trust_level === "admin" ? "default" : "secondary"}
                      className={
                        (user.trust_level as string) === "banned" ? "bg-red-100 text-red-700" :
                        user.trust_level === "trusted" ? "bg-blue-100 text-blue-800" :
                        user.trust_level === "verified" ? "bg-green-100 text-green-800" :
                        user.trust_level === "new" ? "bg-gray-100 text-gray-600" :
                        ""
                      }
                    >
                      {(user.trust_level as string) === "banned"
                        ? "Gesperrt"
                        : (TRUST_LEVELS[user.trust_level]?.label ?? user.trust_level)}
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

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">UI-Modus</p>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant={user.ui_mode === "active" ? "default" : "outline"} className="text-xs h-7" disabled={isUpdating || user.ui_mode === "active"} onClick={() => changeUiMode(user.id, "active")}>Normal</Button>
                        <Button size="sm" variant={user.ui_mode === "senior" ? "default" : "outline"} className="text-xs h-7" disabled={isUpdating || user.ui_mode === "senior"} onClick={() => changeUiMode(user.id, "senior")}>Seniorenmodus</Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t">
                      <div className="flex items-center gap-2">
                        {user.is_admin ? <ShieldCheck className="h-4 w-4 text-purple-500" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm">{user.is_admin ? "Administrator" : "Standard-Nutzer"}</span>
                      </div>
                      <Button size="sm" variant={user.is_admin ? "destructive" : "outline"} className="text-xs h-7" disabled={isUpdating} onClick={() => toggleAdmin(user.id, user.is_admin)}>
                        {user.is_admin ? "Admin entziehen" : "Zum Admin machen"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t">
                      <div className="flex items-center gap-2">
                        <Ban className={`h-4 w-4 ${(user.trust_level as string) === "banned" ? "text-red-500" : "text-muted-foreground"}`} />
                        <span className="text-sm">{(user.trust_level as string) === "banned" ? "Nutzer ist gesperrt" : "Nutzer sperren"}</span>
                      </div>
                      <Button size="sm" variant={(user.trust_level as string) === "banned" ? "outline" : "destructive"} className="text-xs h-7" disabled={isUpdating} onClick={() => banUser(user.id, (user.trust_level as string) === "banned")}>
                        {(user.trust_level as string) === "banned" ? "Entsperren" : "Sperren"}
                      </Button>
                    </div>

                    <p className="text-[10px] text-muted-foreground/50 font-mono truncate pt-1">
                      ID: {user.id}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            {search ? "Keine Nutzer gefunden." : "Keine Nutzer registriert."}
          </p>
        )}
      </div>
    </div>
  );
}

// Avatar-Farbe deterministisch aus Name berechnen
function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

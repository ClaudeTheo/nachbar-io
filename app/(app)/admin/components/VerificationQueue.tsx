"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, MapPin, User, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface VerificationRequest {
  id: string;
  user_id: string;
  household_id: string;
  method: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  user?: { display_name: string };
  household?: { street_name: string; house_number: string };
}

export function VerificationQueue() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);

  async function loadRequests() {
    setLoading(true);
    const supabase = createClient();

    // verification_requests hat FKs zu auth.users (nicht public.users),
    // daher separate Abfragen fuer Requests + Households und Users
    const { data: rawRequests, error } = await supabase
      .from("verification_requests")
      .select("*, household:households(street_name, house_number)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fehler beim Laden:", error);
      toast.error("Fehler beim Laden der Anfragen");
      setLoading(false);
      return;
    }

    const rows = rawRequests ?? [];
    // User-Display-Namen separat laden
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, display_name")
        .in("id", userIds);
      if (users) {
        userMap = Object.fromEntries(users.map(u => [u.id, u.display_name]));
      }
    }

    // Zusammenfuehren
    const merged = rows.map(r => ({
      ...r,
      user: userMap[r.user_id] ? { display_name: userMap[r.user_id] } : undefined,
    }));

    setRequests(merged as unknown as VerificationRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests();
  }, []);

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setProcessing(requestId);
    const note = noteInput[requestId] || "";

    try {
      const response = await fetch("/api/admin/verify-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, note }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Fehler bei der Verarbeitung");
      } else {
        toast.success(action === "approve" ? "Verifizierung genehmigt" : "Verifizierung abgelehnt");
        await loadRequests();
      }
    } catch {
      toast.error("Netzwerkfehler");
    }
    setProcessing(null);
  }

  const pendingRequests = requests.filter(r => r.status === "pending");
  const historyRequests = requests.filter(r => r.status !== "pending");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-alert-amber" />
          <h3 className="font-semibold text-anthrazit">
            Ausstehende Verifizierungen
          </h3>
          {pendingRequests.length > 0 && (
            <Badge className="bg-alert-amber text-white">{pendingRequests.length}</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={loadRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Ausstehende Anfragen */}
      {pendingRequests.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2">
          <CheckCircle className="h-4 w-4 text-quartier-green/50" />
          <p className="text-xs text-muted-foreground">
            Keine ausstehenden Verifizierungen
          </p>
        </div>
      ) : (
        pendingRequests.map((req) => (
          <Card key={req.id} className="border-alert-amber/30 bg-alert-amber/5">
            <CardContent className="p-4 space-y-3">
              {/* Nutzer-Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-anthrazit">
                    {req.user?.display_name ?? "Unbekannt"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: de })}
                </span>
              </div>

              {/* Adresse */}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>
                  {req.household?.street_name} {req.household?.house_number}
                </span>
                <Badge variant="outline" className="text-xs">
                  {req.method === "address_manual" ? "Manuelle Adresse" : req.method}
                </Badge>
              </div>

              {/* Notiz-Feld + Aktionen */}
              <div className="space-y-2">
                <Input
                  placeholder="Optionale Notiz..."
                  value={noteInput[req.id] || ""}
                  onChange={(e) => setNoteInput(prev => ({ ...prev, [req.id]: e.target.value }))}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
                    disabled={processing === req.id}
                    onClick={() => handleAction(req.id, "approve")}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Genehmigen
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={processing === req.id}
                    onClick={() => handleAction(req.id, "reject")}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Ablehnen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Verlauf */}
      {historyRequests.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-anthrazit"
          >
            Bearbeitete Anfragen ({historyRequests.length})
            <span className="text-[10px]">{showHistory ? "▲" : "▼"}</span>
          </button>

          {showHistory && historyRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${req.status === "approved" ? "bg-quartier-green" : "bg-red-400"}`} />
                <span className="text-sm">{req.user?.display_name ?? "Unbekannt"}</span>
                <span className="text-xs text-muted-foreground">
                  {req.household?.street_name} {req.household?.house_number}
                </span>
              </div>
              <Badge variant="outline" className={`text-xs ${req.status === "approved" ? "text-green-600" : "text-red-500"}`}>
                {req.status === "approved" ? "Genehmigt" : "Abgelehnt"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

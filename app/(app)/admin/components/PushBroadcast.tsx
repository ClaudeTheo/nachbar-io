"use client";

import { useState, useEffect } from "react";
import { Megaphone, Send, Users, MapPin, AlertTriangle, Info, CheckCircle, History, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QUARTIER_STREETS } from "@/lib/constants";
import { toast } from "sonner";

type Audience = "all" | "street" | "seniors";
type Urgency = "normal" | "important" | "urgent";

interface BroadcastHistoryItem {
  title: string;
  body: string;
  created_at: string;
  recipientCount: number;
}

export function PushBroadcast() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [street, setStreet] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  // Broadcast-History aus DB laden
  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/broadcast");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history ?? []);
      }
    } catch {
      // Stille Fehlerbehandlung
    }
    setLoadingHistory(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  // Push senden ueber Admin-Broadcast-API
  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error("Titel und Nachricht sind erforderlich");
      return;
    }
    if (audience === "street" && !street) {
      toast.error("Bitte waehlen Sie eine Strasse");
      return;
    }

    // Bestaetigung verlangen
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          audience,
          street: audience === "street" ? street : undefined,
          urgency,
        }),
      });

      if (!res.ok) throw new Error("Broadcast-Fehler");

      const result = await res.json();

      toast.success(`Broadcast an ${result.sent} Empfaenger gesendet`);
      setTitle("");
      setBody("");
      setShowConfirm(false);

      // History neu laden
      loadHistory();
    } catch {
      toast.error("Fehler beim Senden der Push-Nachricht");
    }
    setSending(false);
  }

  function cancelConfirm() {
    setShowConfirm(false);
  }

  // Relative Zeit formatieren
  function timeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Gerade eben";
    if (diffMin < 60) return `vor ${diffMin} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
    return new Date(dateStr).toLocaleDateString("de-DE");
  }

  const audienceLabel = audience === "all" ? "Gesamtes Quartier"
    : audience === "street" ? (street || "Strasse waehlen")
    : "Alle Senioren";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="h-5 w-5 text-blue-500" />
        <h2 className="font-semibold text-anthrazit">Push-Benachrichtigung senden</h2>
      </div>

      {/* Nachricht verfassen */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Titel */}
          <div>
            <label htmlFor="push-title" className="mb-1 block text-xs font-medium text-muted-foreground">
              Titel
            </label>
            <Input
              id="push-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Strassenreinigung morgen"
              maxLength={100}
            />
          </div>

          {/* Nachricht */}
          <div>
            <label htmlFor="push-body" className="mb-1 block text-xs font-medium text-muted-foreground">
              Nachricht
            </label>
            <Textarea
              id="push-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Bitte denken Sie daran, Ihre Autos umzuparken..."
              maxLength={300}
              rows={3}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{body.length}/300</p>
          </div>

          {/* Empfaenger */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Empfaenger</p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={audience === "all" ? "default" : "outline"}
                className="text-xs h-8"
                onClick={() => setAudience("all")}
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                Alle
              </Button>
              <Button
                size="sm"
                variant={audience === "street" ? "default" : "outline"}
                className="text-xs h-8"
                onClick={() => setAudience("street")}
              >
                <MapPin className="h-3.5 w-3.5 mr-1" />
                Strasse
              </Button>
              <Button
                size="sm"
                variant={audience === "seniors" ? "default" : "outline"}
                className="text-xs h-8"
                onClick={() => setAudience("seniors")}
              >
                👴 Senioren
              </Button>
            </div>

            {audience === "street" && (
              <select
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Strasse waehlen...</option>
                {QUARTIER_STREETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>

          {/* Dringlichkeit */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Dringlichkeit</p>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={urgency === "normal" ? "default" : "outline"}
                className="text-xs h-8"
                onClick={() => setUrgency("normal")}
              >
                <Info className="h-3.5 w-3.5 mr-1" />
                Normal
              </Button>
              <Button
                size="sm"
                variant={urgency === "important" ? "default" : "outline"}
                className="text-xs h-8"
                onClick={() => setUrgency("important")}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Wichtig
              </Button>
              <Button
                size="sm"
                variant={urgency === "urgent" ? "default" : "outline"}
                className="text-xs h-8 text-emergency-red border-emergency-red/50"
                onClick={() => setUrgency("urgent")}
              >
                🚨 Dringend
              </Button>
            </div>
          </div>

          {/* Vorschau / Bestaetigung */}
          {showConfirm && (
            <Card className="border-alert-amber/50 bg-alert-amber/5 p-3">
              <p className="text-sm font-semibold text-anthrazit mb-1">Bestaetigung</p>
              <p className="text-xs text-muted-foreground mb-2">
                Folgende Nachricht wird an <strong>{audienceLabel}</strong> gesendet:
              </p>
              <div className="rounded-lg bg-white p-3 border text-sm">
                <p className="font-semibold">{urgency === "urgent" ? `DRINGEND: ${title}` : title}</p>
                <p className="text-muted-foreground mt-1">{body}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleSend} disabled={sending} className="flex-1 bg-quartier-green hover:bg-quartier-green-dark">
                  <Send className="h-3.5 w-3.5 mr-1" />
                  {sending ? "Wird gesendet..." : "Jetzt senden"}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelConfirm} className="flex-1">
                  Abbrechen
                </Button>
              </div>
            </Card>
          )}

          {!showConfirm && (
            <Button
              onClick={handleSend}
              disabled={!title.trim() || !body.trim() || (audience === "street" && !street)}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Nachricht vorbereiten
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Schnellvorlagen */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-anthrazit mb-2">Schnellvorlagen</p>
          <div className="space-y-1.5">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.title}
                onClick={() => { setTitle(tpl.title); setBody(tpl.body); setUrgency(tpl.urgency); }}
                className="w-full rounded-lg bg-muted/30 p-2 text-left text-xs hover:bg-muted/60 transition-colors"
              >
                <span className="font-medium text-anthrazit">{tpl.title}</span>
                <p className="text-muted-foreground mt-0.5 truncate">{tpl.body}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Persistente Broadcast-History */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Sende-Verlauf</p>
        </div>

        {loadingHistory ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Laden...</p>
        ) : history.length > 0 ? (
          <div className="space-y-1.5">
            {history.map((item, idx) => (
              <Card key={idx} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-anthrazit truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.body}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {timeAgo(item.created_at)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {item.recipientCount} Empfaenger
                      </span>
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-quartier-green shrink-0 mt-0.5" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Noch keine Broadcasts gesendet.
          </p>
        )}
      </div>
    </div>
  );
}

// Schnellvorlagen
const TEMPLATES = [
  { title: "Muellabfuhr-Erinnerung", body: "Bitte denken Sie daran, morgen frueh die Tonnen rauszustellen.", urgency: "normal" as Urgency },
  { title: "Strassenreinigung", body: "Am kommenden Montag findet die Strassenreinigung statt. Bitte parken Sie Ihre Fahrzeuge um.", urgency: "important" as Urgency },
  { title: "Nachbarschaftstreffen", body: "Wir laden herzlich zum Nachbarschaftstreffen ein. Details folgen in der App.", urgency: "normal" as Urgency },
  { title: "Wichtiger Hinweis", body: "Es gibt eine wichtige Information fuer alle Bewohner des Quartiers.", urgency: "important" as Urgency },
];

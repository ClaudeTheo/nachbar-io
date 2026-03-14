"use client";

import { useState } from "react";
import { X, Mail, MessageCircle, Copy, Check, UserPlus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { QUARTIER_STREETS } from "@/lib/constants";
import { formatCode } from "@/lib/invite-codes";
import { toast } from "sonner";

interface InviteNeighborModalProps {
  open: boolean;
  onClose: () => void;
}

type InviteMethod = "email" | "whatsapp" | "code";

export function InviteNeighborModal({ open, onClose }: InviteNeighborModalProps) {
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [method, setMethod] = useState<InviteMethod | null>(null);
  const [emailTarget, setEmailTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    inviteCode: string;
    registerUrl: string;
    whatsappUrl: string;
    emailSent?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  function reset() {
    setStreet("");
    setHouseNumber("");
    setMethod(null);
    setEmailTarget("");
    setResult(null);
    setCopied(false);
  }

  async function sendInvite() {
    if (!street || !houseNumber.trim() || !method) return;

    setLoading(true);
    try {
      const response = await fetch("/api/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street,
          houseNumber: houseNumber.trim(),
          method,
          target: method === "email" ? emailTarget : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Fehler beim Senden der Einladung");
      } else {
        setResult(data);

        // Erfolgs-Feedback je nach Methode
        if (method === "email" && data.emailSent) {
          toast.success("Einladung per E-Mail versendet!");
        } else if (method === "email" && !data.emailSent) {
          toast.success("Einladung erstellt! E-Mail konnte nicht gesendet werden — teilen Sie den Code manuell.");
        } else {
          toast.success("Einladung erstellt!");
        }

        // WhatsApp direkt oeffnen (window.location fuer mobile Kompatibilitaet)
        if (method === "whatsapp" && data.whatsappUrl) {
          // Verzögerung damit React-State zuerst aktualisiert wird
          setTimeout(() => {
            window.location.href = data.whatsappUrl;
          }, 100);
        }
      }
    } catch {
      toast.error("Netzwerkfehler");
    }
    setLoading(false);
  }

  async function copyLink(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Link kopiert!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => { reset(); onClose(); }}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 mb-4 w-full max-w-md animate-fade-in-up rounded-2xl bg-white p-6 shadow-xl sm:mb-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-quartier-green" />
            <h2 className="text-lg font-bold text-anthrazit">Nachbar einladen</h2>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="rounded-full p-1.5 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Ergebnis anzeigen */}
        {result ? (
          <div className="space-y-4">
            <Card className="border-quartier-green/30 bg-quartier-green/5">
              <CardContent className="p-4 text-center space-y-3">
                <div className="text-3xl">🎉</div>
                <p className="font-semibold text-anthrazit">Einladung erstellt!</p>
                <p className="text-sm text-muted-foreground">
                  Code: <span className="font-mono font-bold text-quartier-green">{formatCode(result.inviteCode)}</span>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Teilen Sie diesen Code oder den Link unten mit Ihrem Nachbarn.
                  Damit kann er sich bei nachbar.io registrieren und Ihrem Quartier beitreten.
                  Der Code ist 30 Tage gültig.
                </p>
              </CardContent>
            </Card>

            {/* Registrierungslink */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Registrierungslink:</p>
              <div className="flex gap-2">
                <Input value={result.registerUrl} readOnly className="text-xs font-mono" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(result.registerUrl)}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* E-Mail-Status */}
            {result.emailSent && (
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-sm text-quartier-green font-medium">
                  ✅ E-Mail wurde versendet
                </p>
              </div>
            )}

            {/* WhatsApp Button — Link statt window.open fuer mobile Kompatibilitaet */}
            <a
              href={result.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1da851] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Per WhatsApp teilen
            </a>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => { reset(); onClose(); }}
            >
              Fertig
            </Button>

            <p className="text-[10px] text-center text-muted-foreground">
              Sie erhalten 50 Punkte, wenn Ihr Nachbar sich registriert!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Adresse des Nachbarn */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Adresse des Nachbarn
              </label>
              <select
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Straße wählen...</option>
                {QUARTIER_STREETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Input
                placeholder="Hausnummer"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
              />
            </div>

            {/* Methode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Wie möchten Sie einladen?</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMethod("whatsapp")}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors ${
                    method === "whatsapp" ? "border-[#25D366] bg-[#25D366]/5" : "border-border hover:border-[#25D366]/50"
                  }`}
                >
                  <MessageCircle className={`h-5 w-5 ${method === "whatsapp" ? "text-[#25D366]" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">WhatsApp</span>
                </button>
                <button
                  onClick={() => setMethod("email")}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors ${
                    method === "email" ? "border-blue-500 bg-blue-50" : "border-border hover:border-blue-300"
                  }`}
                >
                  <Mail className={`h-5 w-5 ${method === "email" ? "text-blue-500" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">E-Mail</span>
                </button>
                <button
                  onClick={() => setMethod("code")}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors ${
                    method === "code" ? "border-quartier-green bg-quartier-green/5" : "border-border hover:border-quartier-green/50"
                  }`}
                >
                  <Copy className={`h-5 w-5 ${method === "code" ? "text-quartier-green" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">Code</span>
                </button>
              </div>
            </div>

            {/* E-Mail-Eingabe */}
            {method === "email" && (
              <Input
                type="email"
                placeholder="E-Mail des Nachbarn"
                value={emailTarget}
                onChange={(e) => setEmailTarget(e.target.value)}
              />
            )}

            {/* Senden */}
            <Button
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
              disabled={loading || !street || !houseNumber.trim() || !method}
              onClick={sendInvite}
            >
              {loading ? "Wird erstellt..." : "Einladung erstellen"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

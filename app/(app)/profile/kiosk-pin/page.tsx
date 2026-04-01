"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Eye, EyeOff, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Kiosk-PIN Einstellungsseite.
 * Der Bewohner kann hier eine 4-stellige PIN festlegen,
 * mit der er sich am Quartier-Kiosk (AWOW Tablet) anmelden kann.
 */
export default function KioskPinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"view" | "set">("view");

  // Aktuelle PIN laden
  useEffect(() => {
    async function loadPin() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("kiosk_pin")
          .eq("id", user.id)
          .single();

        if (data?.kiosk_pin) {
          setCurrentPin(data.kiosk_pin);
        }
      } catch {
        // Spalte existiert evtl. noch nicht — kein Problem
      }
    }
    loadPin();
  }, []);

  // Zufaellige 4-stellige PIN generieren
  function generatePin(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return num.toString();
  }

  // PIN speichern
  async function savePin() {
    if (pin.length !== 4 || pin !== confirmPin) {
      toast.error("Die PINs stimmen nicht ueberein.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht angemeldet.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ kiosk_pin: pin })
        .eq("id", user.id);

      if (error) {
        // Falls Spalte nicht existiert, in user_metadata speichern
        await supabase.auth.updateUser({
          data: { kiosk_pin: pin },
        });
      }

      setCurrentPin(pin);
      setStep("view");
      setPin("");
      setConfirmPin("");
      toast.success("Kiosk-PIN wurde gespeichert!");
    } catch {
      toast.error("Fehler beim Speichern der PIN.");
    } finally {
      setLoading(false);
    }
  }

  // PIN loeschen
  async function removePin() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({ kiosk_pin: null })
        .eq("id", user.id);

      await supabase.auth.updateUser({
        data: { kiosk_pin: null },
      });

      setCurrentPin(null);
      toast.success("Kiosk-PIN wurde entfernt.");
    } catch {
      toast.error("Fehler beim Entfernen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Kiosk-PIN" backHref="/profile" />

      {/* Erklaerung */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-icon-bg-purple p-3">
              <Monitor className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-anthrazit mb-1">
                Quartier-Kiosk Anmeldung
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mit dieser PIN koennen Sie sich am Quartier-Kiosk (Tablet im
                Gemeinschaftsraum) anmelden — ohne Ihr Handy zu benoetigen.
                Alternativ koennen Sie sich auch per QR-Code anmelden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {step === "view" ? (
        <>
          {/* Aktuelle PIN anzeigen */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-anthrazit">Ihre Kiosk-PIN</h3>
                {currentPin && (
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="p-2 hover:bg-muted/50 rounded-lg"
                  >
                    {showPin ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>

              {currentPin ? (
                <div className="text-center py-4">
                  <div className="text-4xl font-mono font-bold tracking-[0.5em] text-anthrazit">
                    {showPin ? currentPin : "••••"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Geben Sie diese PIN am Kiosk-Bildschirm ein
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    Sie haben noch keine Kiosk-PIN festgelegt.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aktionen */}
          <div className="space-y-3">
            <Button
              onClick={() => {
                setStep("set");
                setPin("");
                setConfirmPin("");
              }}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark text-white py-6 text-base"
            >
              {currentPin ? "PIN aendern" : "PIN festlegen"}
            </Button>

            {currentPin && (
              <Button
                onClick={removePin}
                variant="outline"
                className="w-full py-6 text-base text-emergency-red border-emergency-red/30 hover:bg-emergency-red/5"
                disabled={loading}
              >
                PIN entfernen
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          {/* PIN setzen */}
          <Card>
            <CardContent className="p-5 space-y-5">
              <h3 className="font-semibold text-anthrazit">
                Neue PIN festlegen
              </h3>

              {/* Zufalls-PIN Button */}
              <Button
                variant="outline"
                onClick={() => {
                  const newPin = generatePin();
                  setPin(newPin);
                  setConfirmPin(newPin);
                }}
                className="w-full py-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Zufaellige PIN generieren
              </Button>

              {/* PIN eingeben */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  PIN (4 Ziffern)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPin(v);
                  }}
                  placeholder="••••"
                  className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 px-4 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-quartier-green/50"
                />
              </div>

              {/* PIN bestaetigen */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  PIN bestaetigen
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setConfirmPin(v);
                  }}
                  placeholder="••••"
                  className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 px-4 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-quartier-green/50"
                />
                {pin.length === 4 &&
                  confirmPin.length === 4 &&
                  pin !== confirmPin && (
                    <p className="text-sm text-emergency-red mt-2">
                      Die PINs stimmen nicht ueberein.
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Speichern / Abbrechen */}
          <div className="space-y-3">
            <Button
              onClick={savePin}
              disabled={pin.length !== 4 || pin !== confirmPin || loading}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark text-white py-6 text-base"
            >
              {loading ? "Wird gespeichert..." : "PIN speichern"}
            </Button>
            <Button
              onClick={() => {
                setStep("view");
                setPin("");
                setConfirmPin("");
              }}
              variant="outline"
              className="w-full py-6 text-base"
            >
              Abbrechen
            </Button>
          </div>
        </>
      )}

      {/* Hinweis */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Hinweis:</strong> Die Kiosk-PIN ist nur fuer die Anmeldung
            am Quartier-Kiosk gedacht. Fuer die App auf Ihrem Handy nutzen Sie
            weiterhin Ihre E-Mail oder biometrische Anmeldung. Sie koennen die
            PIN jederzeit aendern oder entfernen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

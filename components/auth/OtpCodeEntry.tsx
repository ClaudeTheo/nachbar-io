"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface OtpCodeEntryProps {
  email: string;
  /** Wohin nach erfolgreichem Login weiterleiten */
  redirectTo?: string;
  /** Callback um zum vorherigen Schritt zurückzukehren */
  onBack: () => void;
  /** Callback um OTP erneut zu senden */
  onResend: () => void;
}

/**
 * OTP-Code-Eingabe für Senioren — 6 einzelne Felder, extra groß.
 * Ersetzt die Magic-Link-Bestätigungsseite.
 *
 * Flow: User gibt den 6-stelligen Code aus der E-Mail ein → verifyOtp → eingeloggt.
 */
export function OtpCodeEntry({ email, redirectTo = "/welcome", onBack, onResend }: OtpCodeEntryProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  // Fokus auf erstes Feld beim Laden
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend-Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function handleDigitChange(index: number, value: string) {
    // Nur Ziffern erlauben
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(null);

    // Auto-Fokus auf nächstes Feld
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-Submit wenn alle 6 Felder ausgefüllt
    if (digit && index === 5 && newDigits.every(d => d !== "")) {
      verifyCode(newDigits.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  // Einfügen aus Zwischenablage (z.B. Code kopiert)
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Fokus auf letztes ausgefülltes Feld oder nächstes leeres
    const nextEmpty = newDigits.findIndex(d => d === "");
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();

    // Auto-Submit wenn alle 6 Felder ausgefüllt
    if (newDigits.every(d => d !== "")) {
      verifyCode(newDigits.join(""));
    }
  }

  async function verifyCode(code: string) {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (verifyError) {
        // B-3 Sicherheitsfix: Einheitliche Fehlermeldung verhindert E-Mail-Enumeration
        // und Rückschlüsse auf Code-Gültigkeit (expired vs. invalid).
        // Vorher: unterschiedliche Meldungen für "abgelaufen" vs. "falsch" vs. "generisch".
        setError("Code ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.");
        setLoading(false);
        // Felder leeren bei Fehler
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // Erfolg — weiterleiten
      router.push(redirectTo);
    } catch {
      setError("Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.");
      setLoading(false);
    }
  }

  function handleResend() {
    onResend();
    setResendCooldown(60);
    setDigits(["", "", "", "", "", ""]);
    setError(null);
    inputRefs.current[0]?.focus();
  }

  return (
    <div className="space-y-5 text-center">
      {/* Erfolgs-Icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-quartier-green/10">
        <CircleCheckBig className="h-8 w-8 text-quartier-green" />
      </div>

      {/* Erklärung */}
      <div>
        <p className="text-base text-muted-foreground">
          Wir haben einen Code an
        </p>
        <p className="mt-1 text-lg font-semibold text-anthrazit">{email}</p>
        <p className="mt-1 text-base text-muted-foreground">
          gesendet. Geben Sie den 6-stelligen Code hier ein:
        </p>
      </div>

      {/* 6 Eingabefelder */}
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={e => handleDigitChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            disabled={loading}
            className="h-14 w-12 rounded-xl border-2 border-gray-300 text-center text-2xl font-bold text-anthrazit
              focus:border-quartier-green focus:outline-none focus:ring-2 focus:ring-quartier-green/30
              disabled:bg-gray-100 disabled:opacity-60
              transition-colors"
            aria-label={`Ziffer ${i + 1} von 6`}
          />
        ))}
      </div>

      {/* Fehler */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Manueller Submit-Button (falls Auto-Submit nicht greift) */}
      <Button
        onClick={() => {
          const code = digits.join("");
          if (code.length === 6) verifyCode(code);
        }}
        disabled={loading || digits.some(d => d === "")}
        className="w-full bg-quartier-green text-white hover:bg-quartier-green/90"
        size="lg"
      >
        {loading ? "Wird geprüft..." : "Anmelden"}
      </Button>

      {/* Spam-Hinweis */}
      <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
        <p className="font-medium">Keine E-Mail erhalten?</p>
        <p className="mt-1">
          Prüfen Sie Ihren Spam-Ordner. Der Code ist 60 Minuten gültig.
        </p>
      </div>

      {/* Erneut senden */}
      <Button
        onClick={handleResend}
        disabled={resendCooldown > 0 || loading}
        variant="outline"
        className="w-full"
      >
        {resendCooldown > 0 ? `Erneut senden (${resendCooldown}s)` : "Code erneut senden"}
      </Button>

      {/* Zurück */}
      <button
        onClick={onBack}
        className="text-sm text-quartier-green hover:underline"
      >
        Zurück
      </button>
    </div>
  );
}

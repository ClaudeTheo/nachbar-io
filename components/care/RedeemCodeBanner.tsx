"use client";

import { useCallback, useRef, useState } from "react";
import { CAREGIVER_RELATIONSHIP_TYPES } from "@/lib/care/constants";
import type { CaregiverRelationshipType } from "@/lib/care/types";
import { toast } from "sonner";

// Fehlermeldungen nach HTTP-Status
const ERROR_MESSAGES: Record<number, string> = {
  403: "Sie koennen sich nicht selbst einladen.",
  404: "Dieser Code ist ungueltig. Bitte pruefen Sie die Eingabe.",
  409: "Dieser Code wurde bereits verwendet.",
  410: "Dieser Code ist abgelaufen. Bitte fordern Sie einen neuen an.",
};

export function RedeemCodeBanner() {
  const [state, setState] = useState<"initial" | "input" | "hidden" | "success">("initial");
  const [code, setCode] = useState<string[]>(Array(8).fill(""));
  const [relationshipType, setRelationshipType] = useState<CaregiverRelationshipType>("child");
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fokus auf ein bestimmtes Feld setzen
  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < 8) {
      inputRefs.current[index]?.focus();
    }
  }, []);

  // Einzelnes Zeichen verarbeiten
  const handleInput = useCallback(
    (index: number, value: string) => {
      // Nur alphanumerische Zeichen, uppercase
      const filtered = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (!filtered) return;

      // Wenn mehrere Zeichen eingefuegt werden (Paste), verteilen
      if (filtered.length > 1) {
        const newCode = [...code];
        for (let i = 0; i < filtered.length && index + i < 8; i++) {
          newCode[index + i] = filtered[i];
        }
        setCode(newCode);
        focusInput(Math.min(index + filtered.length, 7));
        return;
      }

      const newCode = [...code];
      newCode[index] = filtered;
      setCode(newCode);
      if (index < 7) focusInput(index + 1);
    },
    [code, focusInput],
  );

  // Backspace: aktuelles Feld loeschen oder zum vorherigen springen
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (code[index]) {
          const newCode = [...code];
          newCode[index] = "";
          setCode(newCode);
        } else if (index > 0) {
          const newCode = [...code];
          newCode[index - 1] = "";
          setCode(newCode);
          focusInput(index - 1);
        }
        e.preventDefault();
      }
    },
    [code, focusInput],
  );

  // Code einloesen
  const handleRedeem = useCallback(async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 8) {
      toast.error("Bitte geben Sie den vollstaendigen 8-stelligen Code ein.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/caregiver/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode, relationship_type: relationshipType }),
      });

      if (!res.ok) {
        const msg = ERROR_MESSAGES[res.status] || "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.";
        toast.error(msg);
        return;
      }

      toast.success("Einladung erfolgreich angenommen! Sie koennen nun den Status einsehen.");
      setState("success");
    } catch {
      toast.error("Netzwerkfehler. Bitte pruefen Sie Ihre Verbindung.");
    } finally {
      setSubmitting(false);
    }
  }, [code, relationshipType]);

  if (state === "hidden" || state === "success") return null;

  return (
    <div className="rounded-xl border border-[#4CAF87]/20 bg-[#4CAF87]/10 p-4">
      {state === "initial" && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm font-medium text-anthrazit">
            Haben Sie einen Einladungs-Code eines Angehoerigen erhalten?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setState("input");
                // Fokus auf erstes Feld nach Render
                setTimeout(() => focusInput(0), 50);
              }}
              className="rounded-lg bg-[#4CAF87] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4CAF87]/90"
              style={{ minHeight: 44 }}
            >
              Ja
            </button>
            <button
              onClick={() => setState("hidden")}
              className="rounded-lg border border-[#4CAF87]/30 bg-white px-4 text-sm font-medium text-anthrazit transition-colors hover:bg-gray-50"
              style={{ minHeight: 44 }}
            >
              Nein
            </button>
          </div>
        </div>
      )}

      {state === "input" && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-anthrazit">
            Geben Sie den 8-stelligen Code ein:
          </p>

          {/* Code-Eingabefelder */}
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="text"
                maxLength={1}
                value={code[i]}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-11 w-9 rounded-md border border-gray-300 bg-white text-center text-lg font-bold uppercase text-anthrazit shadow-sm focus:border-[#4CAF87] focus:outline-none focus:ring-2 focus:ring-[#4CAF87]/30 sm:h-12 sm:w-11"
                aria-label={`Code Zeichen ${i + 1}`}
              />
            ))}
          </div>

          {/* Beziehungstyp */}
          <div>
            <label htmlFor="relationship-type" className="mb-1 block text-sm text-muted-foreground">
              Ihre Beziehung zum Bewohner:
            </label>
            <select
              id="relationship-type"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as CaregiverRelationshipType)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-anthrazit focus:border-[#4CAF87] focus:outline-none focus:ring-2 focus:ring-[#4CAF87]/30"
              style={{ minHeight: 44 }}
            >
              {CAREGIVER_RELATIONSHIP_TYPES.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Aktionsbuttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRedeem}
              disabled={submitting || code.join("").length !== 8}
              className="flex-1 rounded-lg bg-[#4CAF87] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4CAF87]/90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              {submitting ? "Wird geprueft..." : "Code einloesen"}
            </button>
            <button
              onClick={() => {
                setState("hidden");
                setCode(Array(8).fill(""));
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-anthrazit transition-colors hover:bg-gray-50"
              style={{ minHeight: 44 }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

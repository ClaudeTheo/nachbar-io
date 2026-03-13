"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SeniorButton } from "@/components/SeniorButton";
import { createClient } from "@/lib/supabase/client";

/**
 * Seniorenmodus — Hilfe anfragen
 *
 * Maximal 4 Taps bis zur Hilfe:
 * Tap 1: "Hilfe anfragen" (Home)
 * Tap 2: Kategorie wählen (diese Seite)
 * Tap 3: "Hilfe senden"
 * Tap 4: Bestätigung
 */

type Step = "category" | "confirm" | "sent";

// Vereinfachte Kategorien für Senioren (nur 4 statt 8)
const SENIOR_CATEGORIES = [
  { id: "water_damage", icon: "💧", label: "Wasserproblem" },
  { id: "fall", icon: "🩹", label: "Ich bin gestürzt" },
  { id: "shopping", icon: "🛒", label: "Einkaufshilfe" },
  { id: "other", icon: "❓", label: "Andere Hilfe" },
] as const;

export default function SeniorHelpPage() {
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<string | null>(null);
  const [_loading, setLoading] = useState(false);
  const router = useRouter();

  function handleCategory(id: string) {
    setCategory(id);
    setStep("confirm");
  }

  async function handleSend() {
    if (!category) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .not("verified_at", "is", null)
      .maybeSingle();

    if (!membership) {
      setLoading(false);
      return;
    }

    const cat = SENIOR_CATEGORIES.find((c) => c.id === category);

    await supabase.from("alerts").insert({
      user_id: user.id,
      household_id: membership.household_id,
      category: category,
      title: cat?.label ?? "Hilfe benötigt",
      status: "open",
      is_emergency: false,
      current_radius: 1,
    });

    setLoading(false);
    setStep("sent");
  }

  return (
    <div className="space-y-6">
      {/* Schritt 1: Kategorie */}
      {step === "category" && (
        <>
          <p className="senior-heading text-center text-anthrazit">
            Was brauchen Sie?
          </p>
          <div className="space-y-4">
            {SENIOR_CATEGORIES.map((cat) => (
              <SeniorButton
                key={cat.id}
                icon={cat.icon}
                label={cat.label}
                onClick={() => handleCategory(cat.id)}
                variant="neutral"
              />
            ))}
          </div>
        </>
      )}

      {/* Schritt 2: Bestätigung */}
      {step === "confirm" && (
        <>
          <p className="senior-heading text-center text-anthrazit">
            Hilfe senden?
          </p>
          <p className="senior-text text-center text-muted-foreground">
            Ihre Nachbarn werden benachrichtigt.
          </p>
          <div className="space-y-4">
            <SeniorButton
              icon="✅"
              label="Ja, Hilfe senden"
              onClick={handleSend}
              variant="alert"
            />
            <SeniorButton
              icon="↩️"
              label="Zurück"
              onClick={() => setStep("category")}
              variant="neutral"
            />
          </div>
        </>
      )}

      {/* Schritt 3: Gesendet */}
      {step === "sent" && (
        <div className="space-y-6 text-center">
          <div className="text-6xl">✅</div>
          <p className="senior-heading text-anthrazit">
            Hilfe ist unterwegs!
          </p>
          <p className="senior-text text-muted-foreground">
            Ihre Nachbarn wurden informiert.
            <br />
            Bitte warten Sie.
          </p>
          <SeniorButton
            icon="🏠"
            label="Zurück zur Startseite"
            onClick={() => router.push("/senior/home")}
            variant="primary"
          />
        </div>
      )}
    </div>
  );
}

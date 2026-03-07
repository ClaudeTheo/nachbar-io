"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { ALERT_CATEGORIES, EMERGENCY_CATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

type Step = "category" | "emergency" | "description" | "sent";

export default function NewAlertPage() {
  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Prüfen ob es eine Notfall-Kategorie ist
  const isEmergency = selectedCategory && EMERGENCY_CATEGORIES.includes(selectedCategory as typeof EMERGENCY_CATEGORIES[number]);

  function handleCategorySelect(categoryId: string) {
    setSelectedCategory(categoryId);

    // Bei Notfall-Kategorien: Emergency-Banner zeigen
    if (EMERGENCY_CATEGORIES.includes(categoryId as typeof EMERGENCY_CATEGORIES[number])) {
      setStep("emergency");
    } else {
      setStep("description");
    }
  }

  function handleEmergencyAcknowledge() {
    setStep("description");
  }

  async function handleSubmit() {
    if (!selectedCategory) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Haushalt des Nutzers ermitteln
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .not("verified_at", "is", null)
      .single();

    if (!membership) {
      alert("Ihr Haushalt konnte nicht ermittelt werden. Bitte kontaktieren Sie den Admin.");
      setLoading(false);
      return;
    }

    const category = ALERT_CATEGORIES.find((c) => c.id === selectedCategory);

    const { error } = await supabase.from("alerts").insert({
      user_id: user.id,
      household_id: membership.household_id,
      category: selectedCategory,
      title: category?.label ?? "Hilfeanfrage",
      description: description.trim() || null,
      status: "open",
      is_emergency: isEmergency ?? false,
      current_radius: 1,
    });

    if (error) {
      alert("Fehler beim Senden der Hilfeanfrage.");
      setLoading(false);
      return;
    }

    setStep("sent");
    setLoading(false);
  }

  return (
    <div>
      {/* Emergency-Banner (überlagert alles) */}
      {step === "emergency" && (
        <EmergencyBanner onAcknowledge={handleEmergencyAcknowledge} />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">
          {step === "category" && "Was ist passiert?"}
          {step === "description" && (ALERT_CATEGORIES.find(c => c.id === selectedCategory)?.label ?? "Beschreibung")}
          {step === "sent" && "Hilferuf gesendet"}
        </h1>
      </div>

      {/* Schritt 1: Kategorie wählen */}
      {step === "category" && (
        <div className="grid grid-cols-2 gap-3">
          {ALERT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-white p-4 transition-all hover:border-quartier-green hover:shadow-md active:scale-95"
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-sm font-medium text-anthrazit">{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Schritt 2: Beschreibung */}
      {step === "description" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium">
              Beschreiben Sie kurz das Problem (optional):
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Keller läuft voll, Rohr scheint geplatzt"
              maxLength={500}
              rows={3}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {description.length}/500
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-alert-amber py-6 text-lg font-bold hover:bg-amber-600"
          >
            {loading ? "Wird gesendet..." : "Hilfe senden"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Ihre direkten Nachbarn werden sofort benachrichtigt.
          </p>
        </div>
      )}

      {/* Schritt 3: Bestätigung */}
      {step === "sent" && (
        <div className="space-y-6 text-center">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-anthrazit">Hilferuf gesendet</h2>

          {/* Status-Tracker */}
          <div className="mx-auto max-w-xs space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-quartier-green" />
              <span className="text-sm">Direkte Nachbarn informiert</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <span className="text-sm text-muted-foreground">
                Straße (in 10 Minuten)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <span className="text-sm text-muted-foreground">
                Quartier (in 30 Minuten)
              </span>
            </div>
          </div>

          <Button
            onClick={() => router.push("/dashboard")}
            variant="outline"
            className="mt-4"
          >
            Zurück zum Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}

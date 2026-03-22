"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { ALERT_CATEGORIES, EMERGENCY_CATEGORIES, GPS_ALERT_CATEGORIES } from "@/lib/constants";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ALERT_ICON_MAP, FALLBACK_ICON } from "@/lib/category-icons";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { useQuarter } from "@/lib/quarters";
import { useGeolocation } from "@/hooks/useGeolocation";
import { LocationConsentDialog } from "@/components/alerts/LocationConsentDialog";
import { AlertLocationCheckbox } from "@/components/alerts/AlertLocationCheckbox";
import { GuidelinesGate } from "@/components/moderation/GuidelinesAcceptance";

type Step = "category" | "emergency" | "description" | "sent";

export default function NewAlertPage() {
  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { currentQuarter } = useQuarter();
  const [shareLocation, setShareLocation] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const { position: gpsPosition, loading: gpsLoading, requestPosition, needsDisclosure, acceptDisclosure, declineDisclosure } = useGeolocation("emergency");

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

    // GPS-Kategorie: Consent prüfen und Position anfordern
    const isGpsCategory = GPS_ALERT_CATEGORIES.includes(categoryId as typeof GPS_ALERT_CATEGORIES[number]);
    if (isGpsCategory) {
      const consented = localStorage.getItem("nachbar-gps-consented");
      if (consented === null) {
        setShowConsent(true);
      } else if (consented === "true") {
        requestPosition();
      } else {
        setShareLocation(false);
      }
    }
  }

  function handleEmergencyAcknowledge() {
    setStep("description");
  }

  function handleConsentAccept() {
    localStorage.setItem("nachbar-gps-consented", "true");
    setShowConsent(false);
    requestPosition();
  }

  function handleConsentDecline() {
    localStorage.setItem("nachbar-gps-consented", "false");
    setShowConsent(false);
    setShareLocation(false);
  }

  async function handleSubmit() {
    if (!selectedCategory) return;
    setLoading(true);

    const supabase = createClient();
    const { user } = await getCachedUser(supabase);
    if (!user) return;

    // Haushalt des Nutzers ermitteln
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .not("verified_at", "is", null)
      .maybeSingle();

    if (!membership) {
      toast.error("Ihr Haushalt konnte nicht ermittelt werden. Bitte kontaktieren Sie den Admin.");
      setLoading(false);
      return;
    }

    const category = ALERT_CATEGORIES.find((c) => c.id === selectedCategory);

    // GPS-Daten bestimmen
    const isGpsCategory = GPS_ALERT_CATEGORIES.includes(selectedCategory as typeof GPS_ALERT_CATEGORIES[number]);
    let locationLat: number | null = null;
    let locationLng: number | null = null;
    let locationSource = "none";

    if (isGpsCategory && shareLocation) {
      if (gpsPosition) {
        locationLat = gpsPosition.lat;
        locationLng = gpsPosition.lng;
        locationSource = "gps";
      } else if (membership) {
        // Fallback: Haushalt-Position
        const { data: hh } = await supabase
          .from("households")
          .select("lat, lng")
          .eq("id", membership.household_id)
          .single();
        if (hh?.lat && hh?.lng) {
          locationLat = hh.lat;
          locationLng = hh.lng;
          locationSource = "household";
        }
      }
    }

    const { error } = await supabase.from("alerts").insert({
      user_id: user.id,
      household_id: membership.household_id,
      quarter_id: currentQuarter?.id,
      category: selectedCategory,
      title: category?.label ?? "Hilfeanfrage",
      description: description.trim() || null,
      status: "open",
      is_emergency: isEmergency ?? false,
      current_radius: 1,
      location_lat: locationLat,
      location_lng: locationLng,
      location_source: locationSource,
    });

    if (error) {
      toast.error("Fehler beim Senden der Hilfeanfrage.");
      setLoading(false);
      return;
    }

    toast.success("Hilferuf gesendet! Ihre Nachbarn werden benachrichtigt.");
    setStep("sent");
    setLoading(false);
  }

  return (
    <GuidelinesGate>
    <div>
      {/* GPS Consent-Dialog */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <LocationConsentDialog
            onAccept={handleConsentAccept}
            onDecline={handleConsentDecline}
          />
        </div>
      )}

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
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 shadow-soft transition-all hover:shadow-soft-hover active:scale-95"
            >
              <CategoryIcon
                icon={(ALERT_ICON_MAP[cat.id] ?? FALLBACK_ICON).icon}
                bgColor={(ALERT_ICON_MAP[cat.id] ?? FALLBACK_ICON).bgColor}
                iconColor={(ALERT_ICON_MAP[cat.id] ?? FALLBACK_ICON).iconColor}
                size="lg"
              />
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

          {GPS_ALERT_CATEGORIES.includes(selectedCategory as typeof GPS_ALERT_CATEGORIES[number]) && (
            <AlertLocationCheckbox
              checked={shareLocation}
              onChange={setShareLocation}
              gpsLoading={gpsLoading}
            />
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-alert-amber py-6 text-lg font-bold text-anthrazit hover:bg-amber-600"
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
    </GuidelinesGate>
  );
}

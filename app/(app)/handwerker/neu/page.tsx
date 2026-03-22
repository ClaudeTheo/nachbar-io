"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CRAFTSMAN_SUBCATEGORIES } from "@/lib/constants";
import { validateSubcategories } from "@/lib/craftsmen/hooks";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from '@/hooks/use-auth';
import { useQuarter } from "@/lib/quarters";

type Step = "subcategory" | "details" | "done";

// Rate-Limit: max 3 Eintraege pro Tag
const MAX_ENTRIES_PER_DAY = 3;

export default function NewHandwerkerPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("subcategory");
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [serviceRadius, setServiceRadius] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { currentQuarter } = useQuarter();

  // Subcategory toggle
  function handleSubcategoryToggle(subId: string) {
    setSelectedSubcategories((prev) =>
      prev.includes(subId)
        ? prev.filter((id) => id !== subId)
        : [...prev, subId]
    );
  }

  // Schritt 1 → 2
  function handleNext() {
    const valid = validateSubcategories(selectedSubcategories);
    if (valid.length === 0) {
      toast.error("Bitte wählen Sie mindestens ein Gewerk aus.");
      return;
    }
    setSelectedSubcategories(valid);
    setStep("details");
  }

  async function handleSubmit() {
    if (!businessName.trim()) {
      setError("Bitte geben Sie einen Firmennamen ein.");
      return;
    }
    if (!title.trim()) {
      setError("Bitte geben Sie einen Titel ein.");
      return;
    }
    if (!description.trim()) {
      setError("Bitte geben Sie eine Beschreibung ein.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      if (!user) {
        setError("Bitte melden Sie sich erneut an.");
        setLoading(false);
        return;
      }

      // Rate-Limit pruefen: max 3 Eintraege pro Tag
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count, error: countError } = await supabase
        .from("community_tips")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("category", "craftsmen")
        .gte("created_at", today.toISOString());

      if (!countError && count !== null && count >= MAX_ENTRIES_PER_DAY) {
        setError(`Sie haben heute bereits ${MAX_ENTRIES_PER_DAY} Handwerker eingetragen. Versuchen Sie es morgen erneut.`);
        setLoading(false);
        return;
      }

      // Radius-Wert parsen
      const radiusKm = serviceRadius ? parseFloat(serviceRadius) : null;

      const { error: insertError } = await supabase.from("community_tips").insert({
        user_id: user.id,
        quarter_id: currentQuarter?.id,
        category: "craftsmen",
        subcategories: selectedSubcategories,
        title: title.trim(),
        business_name: businessName.trim(),
        description: description.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        location_hint: locationHint.trim() || null,
        website_url: websiteUrl.trim() || null,
        opening_hours: openingHours.trim() || null,
        service_area: serviceArea.trim() || null,
        service_radius_km: radiusKm,
      });

      if (insertError) {
        console.error("Handwerker-Erstellung Fehler:", insertError);
        toast.error(`Fehler: ${insertError.message}`);
        setError(`Fehler: ${insertError.message}`);
        setLoading(false);
        return;
      }

      toast.success("Handwerker eingetragen! Danke für Ihre Empfehlung.");
      setStep("done");
      setLoading(false);
    } catch (err) {
      console.error("Netzwerkfehler:", err);
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/handwerker" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">
          {step === "subcategory" && "Gewerk wählen"}
          {step === "details" && "Handwerker eintragen"}
          {step === "done" && "Eingetragen!"}
        </h1>
      </div>

      {/* Fortschrittsbalken */}
      {step !== "done" && (
        <div className="mb-4">
          <div className="flex gap-1">
            <div className={`h-1.5 flex-1 rounded-full ${step === "subcategory" || step === "details" ? "bg-quartier-green" : "bg-muted"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step === "details" ? "bg-quartier-green" : "bg-muted"}`} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Schritt {step === "subcategory" ? 1 : 2} von 2
          </p>
        </div>
      )}

      {/* Schritt 1: Gewerk-Auswahl */}
      {step === "subcategory" && (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            Welches Gewerk bietet der Handwerker an? Sie können mehrere auswählen.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CRAFTSMAN_SUBCATEGORIES.map((sub) => {
              const isSelected = selectedSubcategories.includes(sub.id);
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubcategoryToggle(sub.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 bg-white p-4 transition-all min-h-[80px] active:scale-95 ${
                    isSelected
                      ? "border-quartier-green bg-quartier-green/5 shadow-md"
                      : "border-border hover:border-quartier-green hover:shadow-md"
                  }`}
                >
                  <span className="text-3xl">{sub.icon}</span>
                  <span className={`text-sm font-medium text-center ${isSelected ? "text-quartier-green" : "text-anthrazit"}`}>
                    {sub.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Weiter-Button */}
          <Button
            onClick={handleNext}
            disabled={selectedSubcategories.length === 0}
            className="mt-6 w-full bg-quartier-green py-6 text-lg font-bold hover:bg-quartier-green-dark"
          >
            Weiter
          </Button>
        </div>
      )}

      {/* Schritt 2: Details */}
      {step === "details" && (
        <div className="space-y-4">
          {/* Gewaehlte Gewerke anzeigen */}
          <div className="flex flex-wrap gap-1.5">
            {selectedSubcategories.map((subId) => {
              const sub = CRAFTSMAN_SUBCATEGORIES.find((s) => s.id === subId);
              return (
                <span
                  key={subId}
                  className="inline-flex items-center gap-1 rounded-full bg-quartier-green/10 px-2.5 py-1 text-xs font-medium text-quartier-green"
                >
                  {sub?.icon} {sub?.label}
                </span>
              );
            })}
          </div>

          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Titel der Empfehlung *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Zuverlässiger Elektriker für Altbau"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="business" className="mb-1 block text-sm font-medium">
              Firmenname *
            </label>
            <Input
              id="business"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="z.B. Elektro Müller GmbH"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="desc" className="mb-1 block text-sm font-medium">
              Beschreibung *
            </label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Warum empfehlen Sie diesen Handwerker? Was war besonders gut?"
              rows={4}
              required
              maxLength={1000}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {description.length}/1000
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              Telefon (optional)
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="z.B. 07761 1234"
              maxLength={30}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              E-Mail (optional)
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="z.B. info@elektro-mueller.de"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="location" className="mb-1 block text-sm font-medium">
              Standort-Hinweis (optional)
            </label>
            <Input
              id="location"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              placeholder="z.B. Hauptstraße 12, Bad Säckingen"
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="website" className="mb-1 block text-sm font-medium">
              Website (optional)
            </label>
            <Input
              id="website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="z.B. https://www.elektro-mueller.de"
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="hours" className="mb-1 block text-sm font-medium">
              Öffnungszeiten (optional)
            </label>
            <Input
              id="hours"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="z.B. Mo-Fr 8-17 Uhr"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="area" className="mb-1 block text-sm font-medium">
                Einzugsgebiet (optional)
              </label>
              <Input
                id="area"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                placeholder="z.B. Bad Säckingen"
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="radius" className="mb-1 block text-sm font-medium">
                Radius in km (optional)
              </label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={200}
                value={serviceRadius}
                onChange={(e) => setServiceRadius(e.target.value)}
                placeholder="z.B. 30"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Bitte teilen Sie nur öffentlich verfügbare Kontaktdaten.
          </p>

          {error && <p className="text-sm text-emergency-red">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !businessName.trim() || !description.trim()}
            className="w-full bg-quartier-green py-6 text-lg font-bold hover:bg-quartier-green-dark"
          >
            {loading ? "Wird eingetragen..." : "Handwerker eintragen"}
          </Button>

          <button
            onClick={() => setStep("subcategory")}
            className="w-full text-center text-sm text-muted-foreground hover:underline"
          >
            Zurück zur Gewerk-Auswahl
          </button>
        </div>
      )}

      {/* Bestätigung */}
      {step === "done" && (
        <div className="space-y-6 text-center">
          <div className="text-5xl">🔧</div>
          <h2 className="text-xl font-bold text-anthrazit">Handwerker eingetragen!</h2>
          <p className="text-muted-foreground">
            Vielen Dank für Ihre Empfehlung. Ihre Nachbarn können den Handwerker jetzt finden und bewerten.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/handwerker")}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
            >
              Alle Handwerker anzeigen
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              Zum Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

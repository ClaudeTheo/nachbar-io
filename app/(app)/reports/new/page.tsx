"use client";

// Maengelmelder — Mehrstufiges Formular zum Erstellen einer Meldung
// 6 Schritte: Kategorie → Foto → Standort → Beschreibung → Zusammenfassung → Absenden

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, CircleCheckBig, Loader2 } from "lucide-react";
import { ExternalLink } from "@/components/ExternalLink";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import type { ReportCategory } from "@/lib/municipal";
import { REPORT_CATEGORIES, DISCLAIMERS } from "@/lib/municipal";
import { PhotoUpload } from "@/components/municipal/PhotoUpload";
import { GpsPicker } from "@/components/municipal/GpsPicker";

// --- Typen ---

interface FormData {
  category: ReportCategory | null;
  photoUrl: string | null;
  photoPreview: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationText: string;
  description: string;
  disclaimerChecked: boolean;
}

const INITIAL_FORM: FormData = {
  category: null,
  photoUrl: null,
  photoPreview: null,
  locationLat: null,
  locationLng: null,
  locationText: "",
  description: "",
  disclaimerChecked: false,
};

const TOTAL_STEPS = 6;
const MAX_DESCRIPTION = 500;

// --- Fortschrittsanzeige ---

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < currentStep ? "bg-quartier-green" : i === currentStep ? "bg-quartier-green/50" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// --- Schritt 1: Kategorie waehlen ---

function StepCategory({
  onSelect,
}: {
  onSelect: (cat: ReportCategory) => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-sm text-muted-foreground">Was melden Sie?</p>
      <div className="grid grid-cols-2 gap-3">
        {REPORT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-xl bg-white p-4 shadow-soft transition-all hover:shadow-md active:scale-[0.97]"
          >
            <span className="text-3xl" aria-hidden="true">{cat.icon}</span>
            <span className="text-sm font-semibold text-anthrazit">{cat.label}</span>
            <span className="text-[11px] text-muted-foreground leading-tight text-center">{cat.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Schritt 2: Foto (optional) ---
// Nutzt die wiederverwendbare PhotoUpload-Komponente

function StepPhoto({
  photoPreview,
  onPhotoUploaded,
  onPhotoRemoved,
  onNext,
  onSkip,
}: {
  photoPreview: string | null;
  onPhotoUploaded: (url: string, preview: string) => void;
  onPhotoRemoved: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-sm text-muted-foreground">
        Fotografieren Sie den Mangel. Das hilft bei der Bearbeitung.
      </p>

      <PhotoUpload
        bucket="report-photos"
        photoPreview={photoPreview}
        onPhotoUploaded={onPhotoUploaded}
        onPhotoRemoved={onPhotoRemoved}
        hint={DISCLAIMERS.reportPhoto}
      />

      {/* Aktionen */}
      <div className="flex gap-3">
        {photoPreview ? (
          <button
            onClick={onNext}
            className="flex-1 rounded-lg bg-quartier-green px-6 py-3 font-semibold text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97]"
          >
            Weiter
          </button>
        ) : (
          <button
            onClick={onSkip}
            className="flex-1 rounded-lg bg-gray-100 px-6 py-3 font-semibold text-anthrazit transition-all hover:bg-gray-200 active:scale-[0.97]"
          >
            Überspringen
          </button>
        )}
      </div>
    </div>
  );
}

// --- Schritt 3: Standort (mit GPS-Picker Karte) ---

function StepLocation({
  locationText,
  locationLat,
  locationLng,
  onLocationChange,
  onTextChange,
  onNext,
}: {
  locationText: string;
  locationLat: number | null;
  locationLng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  onTextChange: (text: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-sm text-muted-foreground">Wo befindet sich der Mangel?</p>

      {/* GPS-Picker mit Leaflet-Karte */}
      <GpsPicker
        lat={locationLat}
        lng={locationLng}
        locationText={locationText}
        onLocationChange={onLocationChange}
        onTextChange={onTextChange}
      />

      {/* Weiter */}
      <button
        onClick={onNext}
        disabled={!locationText.trim()}
        className="w-full rounded-lg bg-quartier-green px-6 py-3 font-semibold text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Weiter
      </button>
    </div>
  );
}

// --- Schritt 4: Beschreibung (optional) ---

function StepDescription({
  description,
  onChange,
  onNext,
  onSkip,
}: {
  description: string;
  onChange: (text: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const remaining = MAX_DESCRIPTION - description.length;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-sm text-muted-foreground">Beschreiben Sie den Mangel (optional).</p>

      <div>
        <textarea
          value={description}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_DESCRIPTION))}
          placeholder="Was ist das Problem?"
          rows={5}
          maxLength={MAX_DESCRIPTION}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-anthrazit placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        />
        <p className={`mt-1 text-right text-xs ${remaining < 50 ? "text-alert-amber" : "text-muted-foreground"}`}>
          {remaining} Zeichen übrig
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 rounded-lg bg-gray-100 px-6 py-3 font-semibold text-anthrazit transition-all hover:bg-gray-200 active:scale-[0.97]"
        >
          Überspringen
        </button>
        <button
          onClick={onNext}
          disabled={!description.trim()}
          className="flex-1 rounded-lg bg-quartier-green px-6 py-3 font-semibold text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

// --- Schritt 5: Zusammenfassung + Disclaimer ---

function StepSummary({
  formData,
  disclaimerChecked,
  onToggleDisclaimer,
}: {
  formData: FormData;
  disclaimerChecked: boolean;
  onToggleDisclaimer: () => void;
}) {
  // Kategorie-Details ermitteln
  const cat = REPORT_CATEGORIES.find((c) => c.id === formData.category);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-sm text-muted-foreground">Prüfen Sie Ihre Meldung.</p>

      {/* Zusammenfassung */}
      <div className="space-y-3 rounded-xl bg-white p-4 shadow-soft">
        {/* Kategorie */}
        {cat && (
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
            <div>
              <p className="text-sm font-semibold text-anthrazit">{cat.label}</p>
              <p className="text-xs text-muted-foreground">{cat.description}</p>
            </div>
          </div>
        )}

        {/* Foto-Vorschau (blob URL, kein next/image moeglich) */}
        {formData.photoPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={formData.photoPreview}
            alt="Foto-Vorschau"
            className="w-full rounded-lg object-cover"
            style={{ maxHeight: 200 }}
          />
        )}

        {/* Standort */}
        <div className="flex items-start gap-2 text-sm text-anthrazit">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-quartier-green" />
          <span>{formData.locationText}</span>
        </div>

        {/* Beschreibung */}
        {formData.description && (
          <p className="text-sm text-anthrazit">{formData.description}</p>
        )}
      </div>

      {/* Disclaimer: Community-Meldung */}
      <div className="rounded-lg border border-alert-amber/30 bg-alert-amber/5 p-3 text-xs text-muted-foreground">
        {DISCLAIMERS.reportCreate}
      </div>

      {/* Disclaimer: Foto-Hinweis */}
      {formData.photoUrl && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          {DISCLAIMERS.reportPhoto}
        </div>
      )}

      {/* Disclaimer: Rathaus */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-muted-foreground">
        {DISCLAIMERS.reportRathaus}{" "}
        <ExternalLink
          href="https://www.bad-saeckingen.de/kontakt"
          title="Rathaus Kontaktformular"
          className="font-medium text-quartier-green underline"
        >
          Zum Rathaus-Kontaktformular
        </ExternalLink>
      </div>

      {/* Checkbox */}
      <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg bg-white p-3 shadow-soft">
        <input
          type="checkbox"
          checked={disclaimerChecked}
          onChange={onToggleDisclaimer}
          className="h-5 w-5 rounded border-gray-300 text-quartier-green focus:ring-quartier-green"
        />
        <span className="text-sm text-anthrazit">Ich habe die Hinweise gelesen</span>
      </label>
    </div>
  );
}

// --- Hauptkomponente ---

export default function NewReportPage() {
  const router = useRouter();
  const { currentQuarter } = useQuarter();

  // Formular-State
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // --- Navigation ---

  const goBack = useCallback(() => {
    if (step === 0) {
      router.push("/reports");
    } else {
      setStep((s) => s - 1);
    }
  }, [step, router]);

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  // --- Foto-Callbacks (delegiert an PhotoUpload-Komponente) ---

  const handlePhotoUploaded = useCallback((url: string, preview: string) => {
    setFormData((prev) => ({ ...prev, photoUrl: url, photoPreview: preview }));
  }, []);

  const handlePhotoRemoved = useCallback(() => {
    setFormData((prev) => ({ ...prev, photoUrl: null, photoPreview: null }));
  }, []);

  // --- Absenden ---

  const handleSubmit = useCallback(async () => {
    if (!formData.category || !formData.locationText.trim()) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    if (!formData.disclaimerChecked) {
      toast.error("Bitte bestätigen Sie die Hinweise.");
      return;
    }

    if (!currentQuarter) {
      toast.error("Kein Quartier ausgewählt.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Bitte melden Sie sich an.");
        setSubmitting(false);
        return;
      }

      // Eintrag in municipal_reports einfuegen
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        quarter_id: currentQuarter.id,
        category: formData.category,
        description: formData.description.trim() || null,
        photo_url: formData.photoUrl || null,
        location_text: formData.locationText.trim() || null,
        status: "open",
      };

      const { error } = await supabase.from("municipal_reports").insert(insertData);

      if (error) {
        console.error("Insert error:", error);
        toast.error("Meldung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.");
        setSubmitting(false);
        return;
      }

      // Wenn GPS-Koordinaten vorhanden, per RPC/SQL aktualisieren
      if (formData.locationLat !== null && formData.locationLng !== null) {
        // PostGIS-Update ueber rpc (best-effort, Fehler wird toleriert)
        try {
          await supabase.rpc("update_report_location", {
            p_user_id: user.id,
            p_lng: formData.locationLng,
            p_lat: formData.locationLat,
          });
        } catch {
          // PostGIS-Update optional — Fehler still ignorieren
          console.warn("PostGIS location update fehlgeschlagen (non-critical)");
        }
      }

      toast.success("Meldung erfolgreich erstellt!");
      router.push("/reports");
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Ein Fehler ist aufgetreten.");
    } finally {
      setSubmitting(false);
    }
  }, [formData, currentQuarter, router]);

  // --- Render ---

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={goBack}
          className="rounded-full p-1 hover:bg-gray-100"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5 text-anthrazit" />
        </button>
        <h1 className="text-xl font-bold text-anthrazit">Mangel melden</h1>
      </div>

      {/* Fortschritt */}
      <div className="space-y-1">
        <ProgressBar currentStep={step} />
        <p className="text-center text-xs text-muted-foreground">
          Schritt {step + 1} von {TOTAL_STEPS}
        </p>
      </div>

      {/* Schritte */}

      {step === 0 && (
        <StepCategory
          onSelect={(cat) => {
            setFormData((prev) => ({ ...prev, category: cat }));
            goNext();
          }}
        />
      )}

      {step === 1 && (
        <StepPhoto
          photoPreview={formData.photoPreview}
          onPhotoUploaded={handlePhotoUploaded}
          onPhotoRemoved={handlePhotoRemoved}
          onNext={goNext}
          onSkip={goNext}
        />
      )}

      {step === 2 && (
        <StepLocation
          locationText={formData.locationText}
          locationLat={formData.locationLat}
          locationLng={formData.locationLng}
          onLocationChange={(lat, lng) =>
            setFormData((prev) => ({ ...prev, locationLat: lat, locationLng: lng }))
          }
          onTextChange={(text) =>
            setFormData((prev) => ({ ...prev, locationText: text }))
          }
          onNext={goNext}
        />
      )}

      {step === 3 && (
        <StepDescription
          description={formData.description}
          onChange={(text) =>
            setFormData((prev) => ({ ...prev, description: text }))
          }
          onNext={goNext}
          onSkip={goNext}
        />
      )}

      {step === 4 && (
        <StepSummary
          formData={formData}
          disclaimerChecked={formData.disclaimerChecked}
          onToggleDisclaimer={() =>
            setFormData((prev) => ({
              ...prev,
              disclaimerChecked: !prev.disclaimerChecked,
            }))
          }
        />
      )}

      {/* Schritt 5+6 kombiniert: Absenden (nach Zusammenfassung) */}
      {(step === 4 || step === 5) && (
        <div className="animate-fade-in-up">
          <button
            onClick={() => {
              if (step === 4) {
                // Von Zusammenfassung zum Absende-Schritt
                if (!formData.disclaimerChecked) {
                  toast.error("Bitte bestätigen Sie die Hinweise.");
                  return;
                }
                setStep(5);
              } else {
                handleSubmit();
              }
            }}
            disabled={
              (step === 4 && !formData.disclaimerChecked) || submitting
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-quartier-green px-6 py-3 font-semibold text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird gesendet ...
              </>
            ) : step === 5 ? (
              <>
                <CircleCheckBig className="h-4 w-4" />
                Meldung absenden
              </>
            ) : (
              "Weiter zum Absenden"
            )}
          </button>
        </div>
      )}

      {/* Bestaetigung (Schritt 6 — nach erfolgreichem Absenden wird weitergeleitet) */}
      {step === 5 && !submitting && (
        <p className="text-center text-xs text-muted-foreground">
          Mit dem Absenden bestätigen Sie, dass Ihre Angaben korrekt sind.
        </p>
      )}
    </div>
  );
}

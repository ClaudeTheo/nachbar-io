"use client";

import { useState } from "react";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Quarter } from "@/lib/quarters/types";
import type { WizardFormData } from "./wizard/types";
import { initialFormData } from "./wizard/types";
import { StepIndicator } from "./wizard/StepIndicator";
import { StepGrunddaten } from "./wizard/StepGrunddaten";
import { StepStandort } from "./wizard/StepStandort";
import { StepKonfiguration } from "./wizard/StepKonfiguration";
import { StepKarte } from "./wizard/StepKarte";
import { StepUebersicht } from "./wizard/StepUebersicht";
import { WizardNav } from "./wizard/WizardNav";

// -------------------------------------------------------------------
// Typen
// -------------------------------------------------------------------

interface QuarterWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (quarter: Quarter) => void;
}

const STEP_LABELS = ["Grunddaten", "Standort", "Konfiguration", "Karte", "Übersicht"];

// -------------------------------------------------------------------
// Hauptkomponente (Container)
// -------------------------------------------------------------------

export function QuarterWizard({ open, onOpenChange, onCreated }: QuarterWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdQuarter, setCreatedQuarter] = useState<Quarter | null>(null);

  // Formular zurücksetzen beim Schließen
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCurrentStep(1);
      setFormData(initialFormData);
      setCreated(false);
      setCreatedQuarter(null);
    }
    onOpenChange(nextOpen);
  }

  // Feld-Update Helper
  function update<K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  // Validierung pro Schritt
  function validateStep(step: number): string | null {
    switch (step) {
      case 1:
        if (!formData.name.trim()) return "Bitte geben Sie einen Namen ein.";
        if (!formData.city.trim()) return "Bitte geben Sie eine Stadt ein.";
        return null;
      case 2: {
        const lat = parseFloat(formData.centerLat);
        const lng = parseFloat(formData.centerLng);
        if (!formData.centerLat.trim() || isNaN(lat))
          return "Bitte geben Sie einen gültigen Breitengrad ein.";
        if (!formData.centerLng.trim() || isNaN(lng))
          return "Bitte geben Sie einen gültigen Längengrad ein.";
        if (lat < -90 || lat > 90)
          return "Breitengrad muss zwischen -90 und 90 liegen.";
        if (lng < -180 || lng > 180)
          return "Längengrad muss zwischen -180 und 180 liegen.";
        return null;
      }
      case 3:
        if (!formData.invitePrefix.trim())
          return "Bitte geben Sie ein Invite-Präfix ein.";
        if (formData.invitePrefix.length > 10)
          return "Das Invite-Präfix darf maximal 10 Zeichen lang sein.";
        return null;
      default:
        return null;
    }
  }

  function handleNext() {
    const error = validateStep(currentStep);
    if (error) { toast.error(error); return; }
    setCurrentStep((s) => Math.min(s + 1, 5));
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  // Bounding-Box Vorschau
  function getBoundingBoxPreview(): string {
    const lat = parseFloat(formData.centerLat);
    const lng = parseFloat(formData.centerLng);
    if (isNaN(lat) || isNaN(lng)) return "—";
    const offset = 0.003;
    return `SW: ${(lat - offset).toFixed(4)}, ${(lng - offset).toFixed(4)} — NE: ${(lat + offset).toFixed(4)}, ${(lng + offset).toFixed(4)}`;
  }

  // Quartier erstellen
  async function handleSubmit() {
    setSaving(true);
    try {
      const lat = parseFloat(formData.centerLat);
      const lng = parseFloat(formData.centerLng);
      const offset = 0.003;

      const body = {
        name: formData.name.trim(),
        city: formData.city.trim() || null,
        state: formData.state || null,
        description: formData.description.trim() || null,
        contact_email: formData.contactEmail.trim() || null,
        center_lat: lat,
        center_lng: lng,
        zoom_level: formData.zoomLevel,
        bounds_sw_lat: lat - offset,
        bounds_sw_lng: lng - offset,
        bounds_ne_lat: lat + offset,
        bounds_ne_lng: lng + offset,
        invite_prefix: formData.invitePrefix.trim().toUpperCase() || null,
        max_households: formData.maxHouseholds,
        status: formData.activateImmediately ? "active" : "draft",
        settings: {
          allowSelfRegistration: false,
          requireVerification: true,
          enableCareModule: formData.enableCareModule,
          enableMarketplace: formData.enableMarketplace,
          enableEvents: formData.enableEvents,
          enablePolls: formData.enablePolls,
          emergencyBannerEnabled: formData.emergencyBannerEnabled,
          maxMembersPerHousehold: 8,
          defaultLanguage: "de",
        },
        map_config: { type: formData.mapType },
      };

      const res = await fetch("/api/admin/quarters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error("Fehler: " + (err.error ?? "Unbekannt"));
        return;
      }

      const quarter = await res.json();
      setCreatedQuarter(quarter);
      setCreated(true);
      toast.success("Quartier erfolgreich erstellt!");
      onCreated?.(quarter);
    } catch {
      toast.error("Netzwerkfehler beim Erstellen des Quartiers");
    } finally {
      setSaving(false);
    }
  }

  // Erfolgsmeldung nach Erstellung
  if (created && createdQuarter) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <PartyPopper className="h-8 w-8 text-quartier-green" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-anthrazit">
                Quartier erstellt!
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                &quot;{createdQuarter.name}&quot; wurde erfolgreich als{" "}
                {createdQuarter.status === "active" ? "aktives Quartier" : "Entwurf"}{" "}
                angelegt.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Zur Quartiersverwaltung
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Neues Quartier erstellen</DialogTitle>
          <DialogDescription>
            Schritt {currentStep} von 5: {STEP_LABELS[currentStep - 1]}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} />

        <div className="min-h-[280px]">
          {currentStep === 1 && <StepGrunddaten formData={formData} update={update} />}
          {currentStep === 2 && <StepStandort formData={formData} update={update} boundingBoxPreview={getBoundingBoxPreview()} />}
          {currentStep === 3 && <StepKonfiguration formData={formData} update={update} />}
          {currentStep === 4 && <StepKarte formData={formData} update={update} />}
          {currentStep === 5 && <StepUebersicht formData={formData} update={update} />}
        </div>

        <WizardNav
          currentStep={currentStep}
          saving={saving}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

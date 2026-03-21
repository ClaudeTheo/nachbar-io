"use client";

import { useState } from "react";
import {
  MapPin, Settings, Map, CircleCheckBig, ChevronRight,
  ChevronLeft, Loader2, FileText, PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Quarter } from "@/lib/quarters/types";

// -------------------------------------------------------------------
// Typen & Konstanten
// -------------------------------------------------------------------

interface QuarterWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (quarter: Quarter) => void;
}

interface WizardFormData {
  // Schritt 1: Grunddaten
  name: string;
  city: string;
  state: string;
  description: string;
  contactEmail: string;
  // Schritt 2: Standort
  centerLat: string;
  centerLng: string;
  zoomLevel: number;
  // Schritt 3: Konfiguration
  invitePrefix: string;
  maxHouseholds: number;
  enableCareModule: boolean;
  enableMarketplace: boolean;
  enableEvents: boolean;
  enablePolls: boolean;
  emergencyBannerEnabled: boolean;
  // Schritt 4: Karte
  mapType: "svg" | "leaflet";
  // Schritt 5: Status
  activateImmediately: boolean;
}

const initialFormData: WizardFormData = {
  name: "",
  city: "",
  state: "",
  description: "",
  contactEmail: "",
  centerLat: "",
  centerLng: "",
  zoomLevel: 17,
  invitePrefix: "",
  maxHouseholds: 50,
  enableCareModule: true,
  enableMarketplace: true,
  enableEvents: true,
  enablePolls: true,
  emergencyBannerEnabled: true,
  mapType: "leaflet",
  activateImmediately: false,
};

const BUNDESLAENDER: Record<string, string> = {
  BW: "Baden-Wuerttemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thueringen",
};

const STEPS = [
  { label: "Grunddaten", icon: FileText },
  { label: "Standort", icon: MapPin },
  { label: "Konfiguration", icon: Settings },
  { label: "Karte", icon: Map },
  { label: "Uebersicht", icon: CircleCheckBig },
];

// -------------------------------------------------------------------
// Hauptkomponente
// -------------------------------------------------------------------

export function QuarterWizard({ open, onOpenChange, onCreated }: QuarterWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdQuarter, setCreatedQuarter] = useState<Quarter | null>(null);

  // Formular zuruecksetzen beim Schliessen
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

  // -------------------------------------------------------------------
  // Validierung pro Schritt
  // -------------------------------------------------------------------

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
          return "Bitte geben Sie einen gueltigen Breitengrad ein.";
        if (!formData.centerLng.trim() || isNaN(lng))
          return "Bitte geben Sie einen gueltigen Laengengrad ein.";
        if (lat < -90 || lat > 90)
          return "Breitengrad muss zwischen -90 und 90 liegen.";
        if (lng < -180 || lng > 180)
          return "Laengengrad muss zwischen -180 und 180 liegen.";
        return null;
      }
      case 3:
        if (!formData.invitePrefix.trim())
          return "Bitte geben Sie ein Invite-Praefix ein.";
        if (formData.invitePrefix.length > 10)
          return "Das Invite-Praefix darf maximal 10 Zeichen lang sein.";
        return null;
      case 4:
        return null; // Karte ist optional
      case 5:
        return null;
      default:
        return null;
    }
  }

  function handleNext() {
    const error = validateStep(currentStep);
    if (error) {
      toast.error(error);
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, 5));
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  // -------------------------------------------------------------------
  // Erstellen
  // -------------------------------------------------------------------

  async function handleSubmit() {
    setSaving(true);
    try {
      const lat = parseFloat(formData.centerLat);
      const lng = parseFloat(formData.centerLng);
      const offset = 0.003; // ~500m

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
        map_config: {
          type: formData.mapType,
        },
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

  // -------------------------------------------------------------------
  // Bounding-Box Vorschau berechnen
  // -------------------------------------------------------------------

  function getBoundingBoxPreview(): string {
    const lat = parseFloat(formData.centerLat);
    const lng = parseFloat(formData.centerLng);
    if (isNaN(lat) || isNaN(lng)) return "—";
    const offset = 0.003;
    return `SW: ${(lat - offset).toFixed(4)}, ${(lng - offset).toFixed(4)} — NE: ${(lat + offset).toFixed(4)}, ${(lng + offset).toFixed(4)}`;
  }

  // -------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------

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
            Schritt {currentStep} von 5: {STEPS[currentStep - 1].label}
          </DialogDescription>
        </DialogHeader>

        {/* Fortschrittsanzeige */}
        <StepIndicator currentStep={currentStep} />

        {/* Schrittinhalt */}
        <div className="min-h-[280px]">
          {currentStep === 1 && (
            <StepGrunddaten formData={formData} update={update} />
          )}
          {currentStep === 2 && (
            <StepStandort
              formData={formData}
              update={update}
              boundingBoxPreview={getBoundingBoxPreview()}
            />
          )}
          {currentStep === 3 && (
            <StepKonfiguration formData={formData} update={update} />
          )}
          {currentStep === 4 && (
            <StepKarte formData={formData} update={update} />
          )}
          {currentStep === 5 && (
            <StepUebersicht formData={formData} update={update} />
          )}
        </div>

        {/* Navigation */}
        <Separator />
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Zurueck
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              className="bg-quartier-green hover:bg-quartier-green-dark"
            >
              Weiter
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-quartier-green hover:bg-quartier-green-dark"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                "Quartier erstellen"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------
// Fortschrittsanzeige
// -------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between px-2">
      {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const Icon = step.icon;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                  isDone
                    ? "border-quartier-green bg-quartier-green text-white"
                    : isActive
                    ? "border-quartier-green bg-green-50 text-quartier-green"
                    : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                {isDone ? (
                  <CircleCheckBig className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`mt-1 text-[10px] ${
                  isActive ? "font-semibold text-anthrazit" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Verbindungslinie */}
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 w-6 sm:w-10 ${
                  stepNum < currentStep ? "bg-quartier-green" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------------
// Schritt 1: Grunddaten
// -------------------------------------------------------------------

function StepGrunddaten({
  formData,
  update,
}: {
  formData: WizardFormData;
  update: <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Name <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="z.B. Bad Saeckingen — Altstadt"
          value={formData.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Stadt <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="z.B. Bad Saeckingen"
          value={formData.city}
          onChange={(e) => update("city", e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Bundesland
        </label>
        <Select
          value={formData.state}
          onValueChange={(v) => update("state", v ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bundesland waehlen..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BUNDESLAENDER).map(([code, name]) => (
              <SelectItem key={code} value={code}>
                {name} ({code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Beschreibung
        </label>
        <Textarea
          placeholder="Optionale Beschreibung des Quartiers..."
          value={formData.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Kontakt-E-Mail
        </label>
        <Input
          type="email"
          placeholder="admin@beispiel.de"
          value={formData.contactEmail}
          onChange={(e) => update("contactEmail", e.target.value)}
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Schritt 2: Standort
// -------------------------------------------------------------------

function StepStandort({
  formData,
  update,
  boundingBoxPreview,
}: {
  formData: WizardFormData;
  update: <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => void;
  boundingBoxPreview: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-anthrazit">
            Breitengrad <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.0001"
            placeholder="z.B. 47.5535"
            value={formData.centerLat}
            onChange={(e) => update("centerLat", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-anthrazit">
            Laengengrad <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.0001"
            placeholder="z.B. 7.9640"
            value={formData.centerLng}
            onChange={(e) => update("centerLng", e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Koordinaten aus Google Maps oder OpenStreetMap kopieren.
      </p>

      {/* Bounding Box Vorschau */}
      {formData.centerLat && formData.centerLng && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-xs font-medium text-green-800">
            Automatische Bounding Box (~500m um Zentrum):
          </p>
          <p className="mt-1 text-xs text-green-700 font-mono">
            {boundingBoxPreview}
          </p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Zoom-Level
        </label>
        <div className="flex items-center gap-3">
          <Input
            type="range"
            min={14}
            max={19}
            value={formData.zoomLevel}
            onChange={(e) => update("zoomLevel", parseInt(e.target.value))}
            className="h-2"
          />
          <span className="min-w-[2rem] text-center text-sm font-semibold text-anthrazit">
            {formData.zoomLevel}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          14 = Stadtteil-Uebersicht, 19 = Einzelne Haeuser
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Schritt 3: Konfiguration
// -------------------------------------------------------------------

function StepKonfiguration({
  formData,
  update,
}: {
  formData: WizardFormData;
  update: <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Invite-Praefix <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="z.B. REBBERG"
          value={formData.invitePrefix}
          onChange={(e) =>
            update("invitePrefix", e.target.value.toUpperCase().slice(0, 10))
          }
          maxLength={10}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Grossbuchstaben, max. 10 Zeichen. Wird fuer Einladungscodes verwendet (z.B. REBBERG-A1B2).
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Maximale Haushalte
        </label>
        <Input
          type="number"
          min={1}
          max={500}
          value={formData.maxHouseholds}
          onChange={(e) => update("maxHouseholds", parseInt(e.target.value) || 50)}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-anthrazit">Module</h4>

        <ModuleToggle
          label="Care-Modul"
          description="Nachbarschaftshilfe, Hilfeanfragen, Alltags-Erinnerungen"
          checked={formData.enableCareModule}
          onCheckedChange={(v) => update("enableCareModule", v)}
        />
        <ModuleToggle
          label="Marktplatz"
          description="Nachbarschaftliche Angebote und Gesuche"
          checked={formData.enableMarketplace}
          onCheckedChange={(v) => update("enableMarketplace", v)}
        />
        <ModuleToggle
          label="Veranstaltungen"
          description="Quartiers-Events und Termine"
          checked={formData.enableEvents}
          onCheckedChange={(v) => update("enableEvents", v)}
        />
        <ModuleToggle
          label="Umfragen"
          description="Quartiers-Abstimmungen und Meinungsbilder"
          checked={formData.enablePolls}
          onCheckedChange={(v) => update("enablePolls", v)}
        />
        <ModuleToggle
          label="Notfall-Banner"
          description="112/110 Banner bei Notfallkategorien anzeigen"
          checked={formData.emergencyBannerEnabled}
          onCheckedChange={(v) => update("emergencyBannerEnabled", v)}
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Schritt 4: Karte
// -------------------------------------------------------------------

function StepKarte({
  formData,
  update,
}: {
  formData: WizardFormData;
  update: <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-anthrazit">Karten-Typ</h4>

      <div className="space-y-3">
        {/* SVG Option */}
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
            formData.mapType === "svg"
              ? "border-quartier-green bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name="mapType"
            value="svg"
            checked={formData.mapType === "svg"}
            onChange={() => update("mapType", "svg")}
            className="mt-1 h-4 w-4 accent-[#4CAF87]"
          />
          <div>
            <p className="text-sm font-medium text-anthrazit">
              SVG-Karte (individuell)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sie koennen spaeter ein Luftbild hochladen und Haeuser manuell platzieren.
              Ideal fuer kleine, ueberschaubare Quartiere.
            </p>
          </div>
        </label>

        {/* Leaflet Option */}
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
            formData.mapType === "leaflet"
              ? "border-quartier-green bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name="mapType"
            value="leaflet"
            checked={formData.mapType === "leaflet"}
            onChange={() => update("mapType", "leaflet")}
            className="mt-1 h-4 w-4 accent-[#4CAF87]"
          />
          <div>
            <p className="text-sm font-medium text-anthrazit">
              Leaflet / OpenStreetMap (automatisch)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nutzt automatisch OpenStreetMap-Kacheln basierend auf den Koordinaten.
              Ideal fuer groessere Quartiere oder als schneller Start.
            </p>
          </div>
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Der Karten-Typ kann spaeter in den Quartiers-Einstellungen geaendert werden.
      </p>
    </div>
  );
}

// -------------------------------------------------------------------
// Schritt 5: Uebersicht
// -------------------------------------------------------------------

function StepUebersicht({
  formData,
  update,
}: {
  formData: WizardFormData;
  update: <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => void;
}) {
  const activeModules: string[] = [];
  if (formData.enableCareModule) activeModules.push("Care");
  if (formData.enableMarketplace) activeModules.push("Marktplatz");
  if (formData.enableEvents) activeModules.push("Events");
  if (formData.enablePolls) activeModules.push("Umfragen");
  if (formData.emergencyBannerEnabled) activeModules.push("Notfall-Banner");

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-anthrazit">
        Zusammenfassung
      </h4>

      {/* Grunddaten */}
      <SummarySection title="Grunddaten">
        <SummaryRow label="Name" value={formData.name} />
        <SummaryRow label="Stadt" value={formData.city} />
        <SummaryRow
          label="Bundesland"
          value={
            formData.state
              ? `${BUNDESLAENDER[formData.state] ?? formData.state} (${formData.state})`
              : "—"
          }
        />
        {formData.description && (
          <SummaryRow label="Beschreibung" value={formData.description} />
        )}
        {formData.contactEmail && (
          <SummaryRow label="Kontakt" value={formData.contactEmail} />
        )}
      </SummarySection>

      {/* Standort */}
      <SummarySection title="Standort">
        <SummaryRow
          label="Zentrum"
          value={`${formData.centerLat}, ${formData.centerLng}`}
        />
        <SummaryRow label="Zoom-Level" value={String(formData.zoomLevel)} />
      </SummarySection>

      {/* Konfiguration */}
      <SummarySection title="Konfiguration">
        <SummaryRow
          label="Invite-Praefix"
          value={formData.invitePrefix || "—"}
        />
        <SummaryRow
          label="Max. Haushalte"
          value={String(formData.maxHouseholds)}
        />
        <div className="flex flex-wrap gap-1 pt-1">
          {activeModules.map((m) => (
            <Badge key={m} variant="secondary" className="text-[10px]">
              {m}
            </Badge>
          ))}
        </div>
      </SummarySection>

      {/* Karte */}
      <SummarySection title="Karte">
        <SummaryRow
          label="Typ"
          value={
            formData.mapType === "svg"
              ? "SVG (individuell)"
              : "Leaflet / OpenStreetMap"
          }
        />
      </SummarySection>

      <Separator />

      {/* Status-Auswahl */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-anthrazit">
          Aktivierung
        </h4>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
            !formData.activateImmediately
              ? "border-quartier-green bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name="activation"
            checked={!formData.activateImmediately}
            onChange={() => update("activateImmediately", false)}
            className="mt-0.5 h-4 w-4 accent-[#4CAF87]"
          />
          <div>
            <p className="text-sm font-medium text-anthrazit">
              Als Entwurf speichern
            </p>
            <p className="text-xs text-muted-foreground">
              Das Quartier wird erstellt, ist aber noch nicht fuer Bewohner sichtbar.
            </p>
          </div>
        </label>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
            formData.activateImmediately
              ? "border-quartier-green bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name="activation"
            checked={formData.activateImmediately}
            onChange={() => update("activateImmediately", true)}
            className="mt-0.5 h-4 w-4 accent-[#4CAF87]"
          />
          <div>
            <p className="text-sm font-medium text-anthrazit">
              Sofort aktivieren
            </p>
            <p className="text-xs text-muted-foreground">
              Das Quartier ist sofort aktiv und Bewohner koennen beitreten.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Hilfskomponenten
// -------------------------------------------------------------------

function ModuleToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-anthrazit">
        {value}
      </span>
    </div>
  );
}

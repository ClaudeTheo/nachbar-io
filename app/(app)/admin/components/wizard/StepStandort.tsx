import { Input } from "@/components/ui/input";
import type { WizardStepProps } from "./types";

// -------------------------------------------------------------------
// Schritt 2: Standort (Koordinaten, Zoom-Level, Bounding-Box-Vorschau)
// -------------------------------------------------------------------

interface StepStandortProps extends WizardStepProps {
  boundingBoxPreview: string;
}

export function StepStandort({ formData, update, boundingBoxPreview }: StepStandortProps) {
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
            Längengrad <span className="text-red-500">*</span>
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
          14 = Stadtteil-Übersicht, 19 = Einzelne Häuser
        </p>
      </div>
    </div>
  );
}

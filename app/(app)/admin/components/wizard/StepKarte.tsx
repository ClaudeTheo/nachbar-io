import type { WizardStepProps } from "./types";

// -------------------------------------------------------------------
// Schritt 4: Karte (SVG vs. Leaflet Auswahl)
// -------------------------------------------------------------------

export function StepKarte({ formData, update }: WizardStepProps) {
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
              Sie können später ein Luftbild hochladen und Häuser manuell platzieren.
              Ideal für kleine, überschaubare Quartiere.
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
              Ideal für größere Quartiere oder als schneller Start.
            </p>
          </div>
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Der Karten-Typ kann später in den Quartiers-Einstellungen geändert werden.
      </p>
    </div>
  );
}

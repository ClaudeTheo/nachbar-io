import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { WizardStepProps } from "./types";
import { BUNDESLAENDER } from "./types";

// -------------------------------------------------------------------
// Schritt 5: Übersicht (Zusammenfassung + Aktivierungs-Auswahl)
// -------------------------------------------------------------------

// Hilfskomponenten für die Zusammenfassung
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

export function StepUebersicht({ formData, update }: WizardStepProps) {
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
          label="Invite-Präfix"
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
              Das Quartier wird erstellt, ist aber noch nicht für Bewohner sichtbar.
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
              Das Quartier ist sofort aktiv und Bewohner können beitreten.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

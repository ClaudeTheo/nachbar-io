import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { WizardStepProps } from "./types";

// -------------------------------------------------------------------
// Schritt 3: Konfiguration (Invite-Präfix, Haushalte, Module)
// -------------------------------------------------------------------

// Hilfskomponente für Modul-Toggle
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

export function StepKonfiguration({ formData, update }: WizardStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Invite-Präfix <span className="text-red-500">*</span>
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
          Großbuchstaben, max. 10 Zeichen. Wird für Einladungscodes verwendet (z.B. REBBERG-A1B2).
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

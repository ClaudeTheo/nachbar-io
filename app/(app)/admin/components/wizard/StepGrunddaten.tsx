import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WizardStepProps } from "./types";
import { BUNDESLAENDER } from "./types";

// -------------------------------------------------------------------
// Schritt 1: Grunddaten (Name, Stadt, Bundesland, Beschreibung, E-Mail)
// -------------------------------------------------------------------

export function StepGrunddaten({ formData, update }: WizardStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Name <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="z.B. Bad Säckingen — Altstadt"
          value={formData.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Stadt <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="z.B. Bad Säckingen"
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
            <SelectValue placeholder="Bundesland wählen..." />
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

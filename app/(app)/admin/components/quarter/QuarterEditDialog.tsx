"use client";

// Quartier-Bearbeitungsdialog: Basisdaten, Module, Registrierung

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { QuarterWithStats, QuarterSettings } from "@/lib/quarters/types";
import type { QuarterFormData } from "./types";

// -------------------------------------------------------------------
// Props
// -------------------------------------------------------------------

interface QuarterEditDialogProps {
  editQuarter: QuarterWithStats | null;
  editForm: QuarterFormData;
  editSettings: QuarterSettings;
  saving: boolean;
  onClose: () => void;
  onFormChange: (form: QuarterFormData) => void;
  onSettingsChange: (settings: QuarterSettings) => void;
  onSave: () => void;
}

// -------------------------------------------------------------------
// SettingsToggle — Einzelner Schalter mit Label
// -------------------------------------------------------------------

function SettingsToggle({ label, description, checked, onCheckedChange }: {
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

// -------------------------------------------------------------------
// QuarterEditDialog — Hauptkomponente
// -------------------------------------------------------------------

export function QuarterEditDialog({
  editQuarter,
  editForm,
  editSettings,
  saving,
  onClose,
  onFormChange,
  onSettingsChange,
  onSave,
}: QuarterEditDialogProps) {
  return (
    <Dialog open={!!editQuarter} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quartier bearbeiten</DialogTitle>
          <DialogDescription>
            Aendern Sie die Einstellungen fuer &quot;{editQuarter?.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basisdaten */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-anthrazit">Basisdaten</h4>
            <Input
              placeholder="Name"
              value={editForm.name}
              onChange={(e) => onFormChange({ ...editForm, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Stadt"
                value={editForm.city}
                onChange={(e) => onFormChange({ ...editForm, city: e.target.value })}
              />
              <Input
                placeholder="Bundesland"
                value={editForm.state}
                onChange={(e) => onFormChange({ ...editForm, state: e.target.value })}
              />
            </div>
            <Textarea
              placeholder="Beschreibung"
              value={editForm.description}
              onChange={(e) => onFormChange({ ...editForm, description: e.target.value })}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Kontakt-E-Mail"
                value={editForm.contact_email}
                onChange={(e) => onFormChange({ ...editForm, contact_email: e.target.value })}
                type="email"
              />
              <Input
                placeholder="Invite-Praefix"
                value={editForm.invite_prefix}
                onChange={(e) => onFormChange({ ...editForm, invite_prefix: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Latitude"
                value={editForm.center_lat}
                onChange={(e) => onFormChange({ ...editForm, center_lat: e.target.value })}
                type="number"
                step="0.0001"
              />
              <Input
                placeholder="Longitude"
                value={editForm.center_lng}
                onChange={(e) => onFormChange({ ...editForm, center_lng: e.target.value })}
                type="number"
                step="0.0001"
              />
              <Input
                placeholder="Max. Haushalte"
                value={editForm.max_households}
                onChange={(e) => onFormChange({ ...editForm, max_households: e.target.value })}
                type="number"
              />
            </div>
          </div>

          <Separator />

          {/* Modul-Einstellungen */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-anthrazit">Module</h4>
            <SettingsToggle
              label="Care-Modul"
              description="Nachbarschaftshilfe, Hilfeanfragen, Erinnerungen"
              checked={editSettings.enableCareModule ?? false}
              onCheckedChange={(v) => onSettingsChange({ ...editSettings, enableCareModule: v })}
            />
            <SettingsToggle
              label="Marktplatz"
              description="Nachbarschaftliche Angebote und Gesuche"
              checked={editSettings.enableMarketplace ?? true}
              onCheckedChange={(v) => onSettingsChange({ ...editSettings, enableMarketplace: v })}
            />
            <SettingsToggle
              label="Veranstaltungen"
              description="Quartiers-Events und Termine"
              checked={editSettings.enableEvents ?? true}
              onCheckedChange={(v) => onSettingsChange({ ...editSettings, enableEvents: v })}
            />
            <SettingsToggle
              label="Umfragen"
              description="Quartiers-Abstimmungen"
              checked={editSettings.enablePolls ?? true}
              onCheckedChange={(v) => onSettingsChange({ ...editSettings, enablePolls: v })}
            />
            <SettingsToggle
              label="Notfall-Banner"
              description="Hinweis-Banner bei dringenden Meldungen"
              checked={editSettings.emergencyBannerEnabled ?? true}
              onCheckedChange={(v) => onSettingsChange({ ...editSettings, emergencyBannerEnabled: v })}
            />
          </div>

          <Separator />

          {/* Registrierungseinstellungen */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-anthrazit">Registrierung</h4>
            <SettingsToggle
              label="Selbstregistrierung"
              description="Nutzer koennen sich ohne Einladung registrieren"
              checked={editSettings.allowSelfRegistration ?? false}
              onCheckedChange={(v) => onSettingsChange({ ...editSettings, allowSelfRegistration: v })}
            />
            <SettingsToggle
              label="Verifizierung erforderlich"
              description="Nutzer muessen durch Admin verifiziert werden"
              checked={editSettings.requireVerification ?? true}
              onCheckedChange={(v) => onSettingsChange({ ...editSettings, requireVerification: v })}
            />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Max. Mitglieder pro Haushalt</p>
              </div>
              <Select
                value={String(editSettings.maxMembersPerHousehold ?? 8)}
                onValueChange={(v) => v && onSettingsChange({ ...editSettings, maxMembersPerHousehold: parseInt(v) })}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 4, 6, 8, 10, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-quartier-green hover:bg-quartier-green-dark"
          >
            {saving ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

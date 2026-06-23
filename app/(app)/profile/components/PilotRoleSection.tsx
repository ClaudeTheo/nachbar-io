"use client";

// Pilot-Selbstauskunft-Abschnitt im Profil (W4b-2). Speichert ueber die eigene
// Route POST /api/profile/pilot-role (service_role), weil der Standard-Client-Pfad
// updateProfile() von Mig 198 fuer settings.pilot_role still geblockt wird.
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SelfSelectablePilotRole } from "@/lib/services/profile.service";
import { PilotRoleSelector } from "./PilotRoleSelector";

export function PilotRoleSection({
  initialRole,
}: {
  initialRole: SelfSelectablePilotRole | null;
}) {
  const [savedRole, setSavedRole] = useState<SelfSelectablePilotRole | null>(initialRole);
  const [selected, setSelected] = useState<SelfSelectablePilotRole | null>(initialRole);
  const [saving, setSaving] = useState(false);

  const changed = selected !== null && selected !== savedRole;

  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile/pilot-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pilotRole: selected }),
      });
      if (res.ok) {
        setSavedRole(selected);
        toast.success("Ihre Rolle wurde gespeichert.");
      } else {
        toast.error("Rolle konnte nicht gespeichert werden.");
      }
    } catch {
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-anthrazit">Ihre Rolle im Quartier</p>
        <p className="text-xs text-muted-foreground">
          Das hilft uns, die App passender zu machen. Sie können das jederzeit ändern.
        </p>
      </div>
      <PilotRoleSelector value={selected} onChange={setSelected} disabled={saving} />
      <Button
        type="button"
        onClick={save}
        disabled={!changed || saving}
        className="w-full bg-quartier-green hover:bg-quartier-green-dark"
      >
        {saving ? "Speichern..." : "Rolle speichern"}
      </Button>
    </div>
  );
}

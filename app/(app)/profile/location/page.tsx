"use client";

import { useEffect, useState } from "react";
import { MapPin, Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export default function LocationSettingsPage() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const supabase = createClient();

      const { data } = await supabase
        .from("users")
        .select("share_location_on_alert")
        .eq("id", user.id)
        .single();

      if (data) setEnabled(data.share_location_on_alert ?? true);
      setLoading(false);
    }
    load();
  }, [user]);

  async function toggle() {
    if (!user) return;
    const supabase = createClient();

    const newValue = !enabled;
    await supabase.from("users").update({ share_location_on_alert: newValue }).eq("id", user.id);
    setEnabled(newValue);
    toast.success(newValue ? "Standortfreigabe aktiviert" : "Standortfreigabe deaktiviert");
    localStorage.setItem("nachbar-gps-consented", newValue ? "true" : "false");
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Laden...</div>;

  return (
    <div>
      <PageHeader title="Standortfreigabe" backHref="/profile" className="mb-6" />

      <Card>
        <CardContent className="p-4">
          <button onClick={toggle} className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-quartier-green" />
              <div className="text-left">
                <p className="font-medium">Standort bei Hilferufen teilen</p>
                <p className="text-sm text-muted-foreground">
                  {enabled ? "Aktiviert \u2014 Angehörige und Helfer sehen Ihren Standort" : "Deaktiviert \u2014 kein Standort wird geteilt"}
                </p>
              </div>
            </div>
            <div className={`h-6 w-11 rounded-full transition-colors ${enabled ? "bg-quartier-green" : "bg-gray-300"}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${enabled ? "translate-x-5 ml-0.5" : "translate-x-0.5"}`} />
            </div>
          </button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>So funktioniert es:</strong> Wenn Sie einen Hilferuf erstellen, wird Ihr
                aktueller Standort einmalig erfasst. Dieser wird automatisch gelöscht, sobald
                der Hilferuf als erledigt markiert wird.
              </p>
              <p>
                <strong>Wer sieht was:</strong> Ihre Angehörigen (Plus) sehen Ihren genauen
                Standort. Organisationen sehen nur einen ungefähren Bereich (~50m), bis sie
                als Helfer bestätigt sind.
              </p>
              <p>
                Diese Funktion ersetzt nicht den Notruf 112/110. Sie dient ausschließlich der
                nachbarschaftlichen Koordination.
              </p>
              <p>
                Sie können die Standortfreigabe auch bei jedem einzelnen Hilferuf per Checkbox
                an- oder abschalten.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Clock, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";

/**
 * Banner für Nutzer mit ausstehender Adress-Verifizierung.
 * Wird in der App-Layout eingebunden und zeigt sich nur wenn relevant.
 *
 * trust_level === 'new' UND verification_method === 'address_manual'
 * → Nutzer hat sich per Adresse registriert und wartet auf Admin-Freigabe
 */
export function PendingVerificationBanner() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"pending" | "rejected" | null>(null);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { user } = await getCachedUser(supabase);
      if (!user) return;

      // User-Profil prüfen
      const { data: profile } = await supabase
        .from("users")
        .select("trust_level")
        .eq("id", user.id)
        .single();

      // Nur anzeigen wenn trust_level noch 'new'
      if (!profile || profile.trust_level !== "new") return;

      // Verifizierungsanfrage prüfen
      const { data: request } = await supabase
        .from("verification_requests")
        .select("status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (request?.status === "pending") {
        setStatus("pending");
        setShow(true);
      } else if (request?.status === "rejected") {
        setStatus("rejected");
        setShow(true);
      }
    }
    check();
  }, []);

  if (!show || !status) return null;

  if (status === "rejected") {
    return (
      <div className="mx-4 mb-3 rounded-lg border border-emergency-red/20 bg-red-50 p-3">
        <div className="flex items-start gap-2.5">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emergency-red" />
          <div>
            <p className="text-sm font-medium text-emergency-red">
              Verifizierung nicht bestätigt
            </p>
            <p className="mt-0.5 text-xs text-red-600/70">
              Ihre Adress-Verifizierung wurde abgelehnt. Bitte wenden Sie sich an einen Nachbarn mit Einladungscode oder den Quartiers-Admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-3 rounded-lg border border-alert-amber/20 bg-amber-50 p-3">
      <div className="flex items-start gap-2.5">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-alert-amber" />
        <div>
          <p className="text-sm font-medium text-alert-amber">
            Verifizierung ausstehend
          </p>
          <p className="mt-0.5 text-xs text-amber-600/70">
            Ihre Adresse wird von einem Admin geprüft. Sie können die App bereits erkunden, aber einige Funktionen (z.B. Soforthilfe senden, Einladungen) sind erst nach Freigabe verfügbar.
          </p>
        </div>
      </div>
    </div>
  );
}

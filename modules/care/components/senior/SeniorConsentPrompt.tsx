"use client";

// Senior-Einwilligungs-Prompt (W5 / A2:4). Zeigt offene Begleitungs-Anfragen
// (consent_status='pending_senior_confirm') und bestätigt sie über
// POST /api/family-setup/senior/consent (service_role hinter Cookie-Auth).
// Senior-Mode: >= 80px Button, Siezen, ruhig, keine Zahlen-Badges.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PendingSeniorConsent } from "@/lib/family-setup/senior-consent.service";

export function SeniorConsentPrompt({ consents }: { consents: PendingSeniorConsent[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(consents);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (pending.length === 0) return null;

  async function confirm(linkId: string) {
    if (busyId) return;
    setBusyId(linkId);
    try {
      const res = await fetch("/api/family-setup/senior/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caregiverLinkId: linkId }),
      });
      if (res.ok) {
        setPending((cur) => cur.filter((c) => c.linkId !== linkId));
        toast.success("Vielen Dank. Ihre Einwilligung ist gespeichert.");
        router.refresh();
      } else {
        toast.error("Das hat nicht geklappt. Bitte versuchen Sie es später erneut.");
      }
    } catch {
      toast.error("Verbindungsfehler. Bitte versuchen Sie es später erneut.");
    }
    setBusyId(null);
  }

  return (
    <div className="mb-6 space-y-4" data-testid="senior-consent-prompt">
      {pending.map((c) => (
        <div
          key={c.linkId}
          className="rounded-2xl border-2 border-quartier-green bg-quartier-green/5 p-5"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-quartier-green" aria-hidden="true" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-anthrazit">
                {c.caregiverName} möchte Sie begleiten
              </p>
              <p className="text-base leading-snug text-anthrazit/80">
                {c.caregiverName} hat Sie in der QuartierApp eingerichtet. Wenn Sie
                einverstanden sind, darf {c.caregiverName} Sie im Alltag unterstützen.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => confirm(c.linkId)}
            disabled={busyId === c.linkId}
            className="mt-4 w-full bg-quartier-green text-white hover:bg-quartier-green-dark"
            style={{ minHeight: "80px" }}
          >
            {busyId === c.linkId ? "Wird gespeichert..." : "Ja, ich bin einverstanden"}
          </Button>
        </div>
      ))}
    </div>
  );
}

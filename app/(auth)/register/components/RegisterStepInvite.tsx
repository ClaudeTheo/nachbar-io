// Invite-Code Eingabe-Schritt
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeCode, formatCode } from "@/lib/invite-codes";
import type { StepProps } from "./types";

export function RegisterStepInvite({ state, setState, setStep }: StepProps) {
  // Invite-Code pruefen
  async function handleInviteCode(e: React.FormEvent) {
    e.preventDefault();
    setState({ loading: true, error: null });

    try {
      // Serverseitiger Check (umgeht RLS fuer unauthentifizierte Nutzer)
      const res = await fetch("/api/register/check-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: normalizeCode(state.inviteCode) }),
      });
      const result = await res.json();

      if (!result.valid) {
        setState({ error: "Ungültiger Einladungscode. Bitte prüfen Sie den Code auf Ihrem Brief.", loading: false });
        return;
      }

      const updates: Record<string, unknown> = {
        householdId: result.householdId,
        loading: false,
      };
      // referrerId kann aus URL (?ref=) oder aus API-Antwort kommen
      if (result.referrerId && !state.referrerId) {
        updates.referrerId = result.referrerId;
      }
      updates.verificationMethod = (state.referrerId || result.referrerId) ? "neighbor_invite" : "invite_code";
      setState(updates as Partial<typeof state>);
      setStep("identity");
    } catch (err) {
      console.error("Netzwerkfehler bei Invite-Code:", err);
      setState({ error: "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.", loading: false });
    }
  }

  return (
    <form onSubmit={handleInviteCode} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Den Einladungscode haben Sie per Brief oder von einem Nachbarn erhalten.
      </p>
      <div>
        <label htmlFor="invite" className="mb-1 block text-sm font-medium">
          Einladungscode
        </label>
        <Input
          id="invite"
          type="text"
          value={formatCode(state.inviteCode)}
          onChange={(e) => setState({ inviteCode: normalizeCode(e.target.value) })}
          placeholder="z.B. ABCD-EF23 oder PILOT-ABCD-EF23"
          required
          maxLength={20}
          className="text-center text-lg font-mono tracking-widest"
          autoComplete="off"
          autoFocus
        />
      </div>
      {state.error && <p className="text-sm text-emergency-red">{state.error}</p>}
      <Button type="submit" disabled={state.loading} className="w-full bg-quartier-green hover:bg-quartier-green-dark">
        {state.loading ? "Wird geprüft..." : "Code prüfen"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setState({ error: null });
          setStep("entry");
        }}
        className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Zurück
      </button>
    </form>
  );
}

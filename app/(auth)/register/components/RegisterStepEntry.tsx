// Einstiegs-Schritt: Zwei Pfade (Einladungscode oder Quartier finden)
import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import type { StepProps } from "./types";

export function RegisterStepEntry({ state, setState, setStep }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Wie möchten Sie beitreten?
      </p>

      {/* Pfad 1: Einladungscode */}
      <button
        onClick={() => {
          setState({ error: null });
          setStep("invite_code");
        }}
        className="w-full rounded-lg border-2 border-border p-4 text-left transition-colors hover:border-quartier-green/50"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-quartier-green/10">
            <Mail className="h-5 w-5 text-quartier-green" />
          </div>
          <div>
            <p className="font-semibold text-anthrazit">Ich habe einen Einladungscode</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Per Brief, Aushang oder von einem Nachbarn erhalten
            </p>
          </div>
        </div>
      </button>

      {/* Pfad 2: Quartier finden */}
      <button
        onClick={() => {
          setState({ error: null });
          setStep("address");
        }}
        className="w-full rounded-lg border-2 border-border p-4 text-left transition-colors hover:border-quartier-green/50"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <MapPin className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-anthrazit">Ich möchte mein Quartier finden</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Über Adresse oder Standort dem nächsten Quartier beitreten
            </p>
          </div>
        </div>
      </button>

      {state.error && <p className="text-sm text-emergency-red">{state.error}</p>}

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Bereits registriert?{" "}
          <Link href="/login" className="text-quartier-green hover:underline">
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}

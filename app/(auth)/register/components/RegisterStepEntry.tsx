// Einstiegs-Schritt: Zwei Pfade (Einladungscode oder Quartier finden)
"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Info, Mail, MapPin, ShieldCheck } from "lucide-react";
import type { StepProps } from "./types";

export function RegisterStepEntry({ state, setState, setStep }: StepProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Wie möchten Sie beitreten?
      </p>

      <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
        <div className="flex items-start gap-2">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-anthrazit">
              Ein soziales Pilotprojekt für gute Nachbarschaft
            </p>
            <p className="text-muted-foreground">
              Die QuartierApp soll Menschen im Quartier näher zusammenbringen:
              Familien, Nachbarn und Helfer, die im Alltag füreinander da sein
              möchten.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-quartier-green/25 bg-quartier-green/5 p-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-quartier-green" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-anthrazit">
              Geschlossener Test in Bad Säckingen
            </p>
            <p className="text-muted-foreground">
              Am einfachsten starten Sie mit Einladungscode. Wir fragen nur das
              Nötige ab, damit Ihr Haushalt dem richtigen Quartier zugeordnet
              wird.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowInfo((current) => !current)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-anthrazit transition-colors hover:border-quartier-green/50"
        aria-expanded={showInfo}
      >
        <Info className="h-4 w-4 text-quartier-green" />
        Was Sie wissen sollten
      </button>

      {showInfo && (
        <div className="space-y-3 rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground">
          <section>
            <h3 className="font-semibold text-anthrazit">Warum gibt es die QuartierApp?</h3>
            <p className="mt-1">
              Viele kleine Hilfen entstehen erst, wenn Nachbarn voneinander
              wissen. Der Pilot soll zeigen, wie digitale Technik menschliche
              Nähe im Quartier unterstützen kann.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-anthrazit">Was passiert im Pilot?</h3>
            <p className="mt-1">
              Wir testen mit wenigen Menschen, ob Registrierung, Freigabe und
              erste Quartiersfunktionen verständlich sind. Es ist noch kein
              öffentlicher Produktstart.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-anthrazit">Welche Daten fragen wir ab?</h3>
            <p className="mt-1">
              Nur was für Vertrauen und Quartier-Zuordnung nötig ist:
              Einladung oder Adresse, Name, Geburtsdatum und später Ihre
              Entscheidung zur KI-Hilfe.
            </p>
          </section>
        </div>
      )}

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
            <p className="font-semibold text-anthrazit">
              Ich habe einen Einladungscode
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Empfohlen für den Pilot: per Brief, Aushang oder von einem
              Nachbarn erhalten
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
            <p className="font-semibold text-anthrazit">
              Ich möchte mein Quartier finden
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nur für das Pilotgebiet rund um Purkersdorfer Str., Sanarystr.
              und Oberer Rebberg
            </p>
          </div>
        </div>
      </button>

      {state.error && (
        <p className="text-sm text-emergency-red">{state.error}</p>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Bereits registriert?{" "}
          <Link
            href="/login"
            className="text-quartier-green underline hover:no-underline"
          >
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}

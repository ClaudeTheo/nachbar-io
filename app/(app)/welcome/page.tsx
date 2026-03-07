"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MapPin, Bell, HandHelping, ShoppingBag, Users } from "lucide-react";

const TOUR_STEPS = [
  {
    icon: MapPin,
    title: "Ihre Nachbarschaft",
    description:
      "Sehen Sie auf der Karte, wer in Ihrer Straße wohnt. Alle Daten bleiben im Quartier — DSGVO-konform.",
    color: "bg-quartier-green",
  },
  {
    icon: Bell,
    title: "Meldungen & Alerts",
    description:
      "Melden Sie Wasserschäden, Stromausfälle oder bitten Sie um Einkaufshilfe. Ihre Nachbarn werden sofort benachrichtigt.",
    color: "bg-alert-amber",
  },
  {
    icon: HandHelping,
    title: "Hilfe-Börse",
    description:
      "Bieten Sie Hilfe an oder finden Sie Unterstützung — vom Gartenservice bis zum Fahrdienst.",
    color: "bg-blue-500",
  },
  {
    icon: ShoppingBag,
    title: "Marktplatz & Fundbüro",
    description:
      "Verkaufen, verschenken oder verleihen Sie Dinge an Nachbarn. Verlorenes und Gefundenes hier melden.",
    color: "bg-purple-500",
  },
  {
    icon: Users,
    title: "Einfacher Modus",
    description:
      "Für Senioren: Große Schrift, große Buttons, maximal 4 Klicks für jede Aktion. Umschaltbar im Profil.",
    color: "bg-quartier-green",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const current = TOUR_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      {/* Fortschritt */}
      <div className="mb-8 flex gap-1.5">
        {TOUR_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-8 rounded-full transition-colors ${
              i <= step ? "bg-quartier-green" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Icon */}
      <div
        className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl ${current.color} text-white`}
      >
        <Icon className="h-10 w-10" />
      </div>

      {/* Text */}
      <h1 className="mb-3 text-center text-2xl font-bold text-anthrazit">
        {step === 0 ? "Willkommen bei Nachbar.io!" : current.title}
      </h1>
      <p className="mb-8 max-w-sm text-center text-muted-foreground">
        {current.description}
      </p>

      {/* Navigation */}
      <div className="flex w-full max-w-sm gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1"
          >
            Zurück
          </Button>
        )}
        <Button
          onClick={() => {
            if (isLast) {
              router.push("/dashboard");
            } else {
              setStep(step + 1);
            }
          }}
          className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
        >
          {isLast ? "Los geht's!" : "Weiter"}
        </Button>
      </div>

      {/* Überspringen */}
      {!isLast && (
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-sm text-muted-foreground hover:underline"
        >
          Tour überspringen
        </button>
      )}
    </div>
  );
}

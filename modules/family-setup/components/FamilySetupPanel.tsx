"use client";

import { FormEvent, useState } from "react";
import { Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SetupQrCard } from "./SetupQrCard";

type SetupMode = "child" | "senior";

interface SetupResult {
  setupUrl: string;
  shortCode: string;
  expiresAt?: string;
}

export function FamilySetupPanel() {
  const [mode, setMode] = useState<SetupMode>("child");
  const [childName, setChildName] = useState("");
  const [childBirthYear, setChildBirthYear] = useState("");
  const [seniorName, setSeniorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setResult(null);

    const endpoint =
      mode === "child" ? "/api/family-setup/child" : "/api/family-setup/senior";
    const payload =
      mode === "child"
        ? {
            childDisplayName: childName,
            childBirthYear: Number(childBirthYear),
            relationshipType: "parent",
          }
        : {
            seniorDisplayName: seniorName,
            relationshipType: "child",
            targetUiMode: "senior",
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Zugang konnte nicht vorbereitet werden.");
        return;
      }
      setResult({
        setupUrl: json.setupUrl,
        shortCode: json.shortCode,
        expiresAt: json.expiresAt,
      });
    } catch {
      setError("Zugang konnte nicht vorbereitet werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-quartier-green" />
          <div>
            <h2 className="font-medium text-anthrazit">Familie & Betreuung</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kinder- und Senior-Zugänge sicher per QR-Code vorbereiten.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "child" ? "default" : "outline"}
            onClick={() => {
              setMode("child");
              setResult(null);
            }}
          >
            <UserPlus className="h-4 w-4" />
            Kind
          </Button>
          <Button
            type="button"
            variant={mode === "senior" ? "default" : "outline"}
            onClick={() => {
              setMode("senior");
              setResult(null);
            }}
          >
            <Shield className="h-4 w-4" />
            Senior
          </Button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          {mode === "child" ? (
            <>
              <label className="block text-sm font-medium text-anthrazit" htmlFor="family-child-name">
                Name des Kindes
              </label>
              <Input
                id="family-child-name"
                value={childName}
                onChange={(event) => setChildName(event.target.value)}
                required
              />
              <label className="block text-sm font-medium text-anthrazit" htmlFor="family-child-birth-year">
                Geburtsjahr des Kindes
              </label>
              <Input
                id="family-child-birth-year"
                inputMode="numeric"
                value={childBirthYear}
                onChange={(event) => setChildBirthYear(event.target.value)}
                required
              />
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-anthrazit" htmlFor="family-senior-name">
                Name des Seniors
              </label>
              <Input
                id="family-senior-name"
                value={seniorName}
                onChange={(event) => setSeniorName(event.target.value)}
                required
              />
            </>
          )}

          {error && <p className="text-sm text-emergency-red">{error}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {mode === "child" ? "Kinderzugang erstellen" : "Senior-Zugang erstellen"}
          </Button>
        </form>

        {result && (
          <SetupQrCard
            kind={mode}
            setupUrl={result.setupUrl}
            shortCode={result.shortCode}
            expiresAt={result.expiresAt}
          />
        )}
      </CardContent>
    </Card>
  );
}

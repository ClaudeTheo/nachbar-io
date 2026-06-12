"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface SetupClaimFormProps {
  token: string;
}

interface Preview {
  flowType: "child_direct" | "child_friend" | "senior_setup";
  targetUiMode: "youth" | "senior" | "comfort";
  expiresAt: string;
}

export function SetupClaimForm({ token }: SetupClaimFormProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Zugang wurde aktiviert, aber die automatische Anmeldung schlug fehl
  const [claimedNeedsLogin, setClaimedNeedsLogin] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPreview() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/family-setup/${token}`);
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "Setup-Code ist ungültig.");
        }
        if (active) setPreview(json);
      } catch (err) {
        if (active) setError((err as Error).message);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadPreview();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/family-setup/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Zugang konnte nicht aktiviert werden.");
      }

      // Direkt anmelden (Befund A2:2): Der Claim erstellt das Konto nur
      // serverseitig ohne Session — ohne Login wuerde die Middleware den
      // frisch aktivierten Nutzer auf die Landing-Page zurueckwerfen.
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setClaimedNeedsLogin(true);
        return;
      }

      router.push(json.redirectTo ?? "/after-login");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Laden...</div>;
  }

  if (claimedNeedsLogin) {
    return (
      <Card>
        <CardContent className="space-y-4 p-4">
          <h1 className="text-lg font-semibold text-anthrazit">
            Ihr Zugang ist bereit
          </h1>
          <p className="text-sm text-muted-foreground">
            Die automatische Anmeldung hat nicht geklappt. Bitte melden Sie
            sich einmal mit Ihrer E-Mail-Adresse und Ihrem Passwort an.
          </p>
          <Button asChild className="w-full" style={{ minHeight: "56px" }}>
            <Link href="/login">Zur Anmeldung</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-emergency-red">
            {error ?? "Setup-Code ist ungültig oder abgelaufen."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isChild = preview.flowType === "child_direct" || preview.flowType === "child_friend";

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h1 className="text-lg font-semibold text-anthrazit">
            {isChild ? "Jugendzugang einrichten" : "Senior-Zugang einrichten"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isChild
              ? "Dieser Zugang wurde von einem Elternteil vorbereitet."
              : "Dieser Zugang verknüpft Sie mit Ihrem Angehörigen. Sensible Daten bleiben geschützt."}
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-anthrazit" htmlFor="setup-display-name">
            Anzeigename
          </label>
          <Input
            id="setup-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />

          <label className="block text-sm font-medium text-anthrazit" htmlFor="setup-email">
            E-Mail-Adresse
          </label>
          <Input
            id="setup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="block text-sm font-medium text-anthrazit" htmlFor="setup-password">
            Passwort
          </label>
          <Input
            id="setup-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="text-sm text-emergency-red">{error}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            Zugang aktivieren
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

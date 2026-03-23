"use client";

// Passkey-Verwaltungsseite — Biometrische Anmeldung (Face ID, Touch ID, Windows Hello)
// Nutzt WebAuthn / SimpleWebAuthn für passwortlose Registrierung und Löschung

import { useEffect, useState, useCallback } from "react";
import { Fingerprint, Plus, Trash2, Smartphone } from "lucide-react";
// simplewebauthn/browser wird im handleRegister dynamisch geladen
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface PasskeyCredential {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}

// Datum im Format DD.MM.YYYY formatieren
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function PasskeyPage() {
  const { user: authUser } = useAuth();
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registrierte Geraete laden
  const loadCredentials = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/passkey/credentials");
      if (!res.ok) {
        throw new Error(`Fehler beim Laden der Geraete (${res.status})`);
      }
      const data: PasskeyCredential[] = await res.json();
      setCredentials(data);
    } catch (err) {
      console.error("[Passkey] Laden fehlgeschlagen:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Die registrierten Geraete konnten nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authUser) return;
    loadCredentials();
  }, [authUser, loadCredentials]);

  // Neues Geraet registrieren
  async function handleAddPasskey() {
    setAdding(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // Geraetename vom Nutzer abfragen
      const deviceName = window.prompt(
        'Geraetename (z.B. "Mein iPhone")',
        "Mein Geraet"
      );
      if (!deviceName) {
        // Nutzer hat abgebrochen
        setAdding(false);
        return;
      }

      // Schritt 1: Registrierungs-Optionen vom Server holen
      const beginRes = await fetch("/api/auth/passkey/register-begin", {
        method: "POST",
      });
      if (!beginRes.ok) {
        throw new Error(
          `Registrierung konnte nicht gestartet werden (${beginRes.status})`
        );
      }
      const options = await beginRes.json();

      // Schritt 2: WebAuthn-Registrierung im Browser durchfuehren
      const { startRegistration } = await import("@simplewebauthn/browser");
      const result = await startRegistration({ optionsJSON: options });

      // Schritt 3: Ergebnis an den Server senden
      const completeRes = await fetch("/api/auth/passkey/register-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: result, deviceName }),
      });
      if (!completeRes.ok) {
        throw new Error(
          `Registrierung konnte nicht abgeschlossen werden (${completeRes.status})`
        );
      }

      setSuccessMessage(`"${deviceName}" wurde erfolgreich registriert.`);
      await loadCredentials();
    } catch (err) {
      console.error("[Passkey] Registrierung fehlgeschlagen:", err);
      // WebAuthn-spezifische Fehlermeldungen eingedeutscht
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setErrorMessage(
            "Die Registrierung wurde abgebrochen oder Ihr Geraet hat die Anfrage abgelehnt."
          );
        } else if (err.name === "InvalidStateError") {
          setErrorMessage(
            "Dieses Geraet ist bereits registriert."
          );
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage("Ein unbekannter Fehler ist aufgetreten.");
      }
    } finally {
      setAdding(false);
    }
  }

  // Geraet loeschen
  async function handleDeletePasskey(id: string, deviceName: string) {
    const confirmed = window.confirm(
      `Moechten Sie "${deviceName}" wirklich entfernen? Sie koennen sich danach nicht mehr mit diesem Geraet anmelden.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/auth/passkey/credentials/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Geraet konnte nicht entfernt werden (${res.status})`);
      }
      setSuccessMessage(`"${deviceName}" wurde entfernt.`);
      await loadCredentials();
    } catch (err) {
      console.error("[Passkey] Loeschen fehlgeschlagen:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Das Geraet konnte nicht entfernt werden."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // Senior-Modus: groessere Touch-Targets
  const isSenior =
    authUser &&
    "ui_mode" in authUser &&
    (authUser as { ui_mode?: string }).ui_mode === "senior";

  const buttonMinHeight = isSenior ? "min-h-[80px]" : "min-h-[44px]";

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Biometrische Anmeldung"
          subtitle="Face ID, Touch ID oder Windows Hello"
          backHref="/profile"
        />
        <div className="py-12 text-center text-muted-foreground">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Biometrische Anmeldung"
        subtitle="Face ID, Touch ID oder Windows Hello"
        backHref="/profile"
      />

      {/* DSGVO-Infobox */}
      <Card className="border-quartier-green/30 bg-quartier-green/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-quartier-green" />
            <p className="text-sm text-anthrazit leading-relaxed">
              Ihre biometrischen Daten (Fingerabdruck/Gesicht) bleiben
              ausschliesslich auf Ihrem Geraet. Wir speichern nur einen
              kryptographischen Schluessel zur Anmeldung. Sie koennen
              registrierte Geraete jederzeit hier entfernen.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Statusmeldungen */}
      {successMessage && (
        <p className="rounded-lg bg-quartier-green/10 px-4 py-3 text-sm font-medium text-quartier-green">
          {successMessage}
        </p>
      )}
      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-emergency-red">
          {errorMessage}
        </p>
      )}

      {/* Registrierte Geraete */}
      <Card>
        <CardContent className="p-0">
          {credentials.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Smartphone className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Noch kein Geraet registriert
              </p>
            </div>
          ) : (
            <ul>
              {credentials.map((cred, index) => (
                <li
                  key={cred.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    index < credentials.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-quartier-green/10">
                      <Fingerprint className="h-4 w-4 text-quartier-green" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-anthrazit">
                        {cred.device_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registriert: {formatDate(cred.created_at)}
                        {cred.last_used_at && (
                          <> &middot; Zuletzt: {formatDate(cred.last_used_at)}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === cred.id}
                    onClick={() =>
                      handleDeletePasskey(cred.id, cred.device_name)
                    }
                    className={`shrink-0 text-muted-foreground hover:text-emergency-red ${buttonMinHeight}`}
                    aria-label={`${cred.device_name} entfernen`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Neues Geraet hinzufuegen */}
      <Button
        onClick={handleAddPasskey}
        disabled={adding}
        className={`w-full gap-2 bg-quartier-green hover:bg-quartier-green/90 ${buttonMinHeight}`}
      >
        {adding ? (
          "Bitte warten..."
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Neues Geraet hinzufuegen
          </>
        )}
      </Button>

      {/* Hinweis */}
      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-anthrazit">Hinweise zur sicheren Nutzung:</p>
        <ul className="mt-2 space-y-1">
          <li>- Registrieren Sie nur eigene Geraete</li>
          <li>- Entfernen Sie verlorene oder gestohlene Geraete sofort</li>
          <li>- Die Anmeldung per Passkey ersetzt Ihren Magic Link</li>
        </ul>
      </div>
    </div>
  );
}

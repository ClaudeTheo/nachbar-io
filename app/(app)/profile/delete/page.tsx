"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { revokeAppleToken } from "@/lib/auth/apple";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isConfirmed = confirmText === "KONTO LÖSCHEN";

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch("/api/user/export");
      if (!response.ok) {
        toast.error("Export fehlgeschlagen");
        setExporting(false);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nachbar-io-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Daten exportiert!");
    } catch {
      toast.error("Netzwerkfehler beim Export");
    }
    setExporting(false);
  }

  async function handleDelete() {
    if (!isConfirmed) return;
    setDeleting(true);

    try {
      // Apple Token widerrufen (Guideline 5.1.1(v))
      await revokeAppleToken();

      const response = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Löschung fehlgeschlagen");
        setDeleting(false);
        return;
      }

      toast.success("Ihr Konto wurde gelöscht.");
      // Zur Startseite weiterleiten (Session ist ungueltig)
      setTimeout(() => router.push("/"), 1500);
    } catch {
      toast.error("Netzwerkfehler");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/profile" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Konto & Daten</h1>
      </div>

      {/* Datenexport */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-info-blue" />
            <div>
              <h2 className="font-semibold text-anthrazit">Meine Daten exportieren</h2>
              <p className="text-xs text-muted-foreground">
                DSGVO Art. 20 — Laden Sie alle Ihre personenbezogenen Daten als JSON-Datei herunter.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Wird exportiert..." : "Daten herunterladen"}
          </Button>
        </CardContent>
      </Card>

      {/* Konto loeschen */}
      <Card className="border-emergency-red/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-emergency-red" />
            </div>
            <div>
              <h2 className="font-semibold text-emergency-red">Konto löschen</h2>
              <p className="text-xs text-muted-foreground">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>

          {!showConfirm ? (
            <>
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 space-y-1.5">
                <p className="font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Was wird gelöscht:
                </p>
                <ul className="ml-5 list-disc space-y-0.5">
                  <li>Ihr Profil und alle persönlichen Daten</li>
                  <li>Ihre Nachbarschaftshilfe-Anfragen und -Angebote</li>
                  <li>Ihre Marktplatz-Inserate</li>
                  <li>Ihre Nachrichten und Benachrichtigungen</li>
                  <li>Ihre Reputation und Badges</li>
                  <li>Ihre Haushaltsmitgliedschaft</li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                Wir empfehlen, vorher Ihre Daten zu exportieren (siehe oben).
              </p>

              <Button
                variant="outline"
                className="w-full border-emergency-red/30 text-emergency-red hover:bg-red-50"
                onClick={() => setShowConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Konto löschen...
              </Button>
            </>
          ) : (
            <div className="space-y-3 rounded-lg border border-emergency-red/20 bg-red-50/50 p-4">
              <p className="text-sm font-medium text-emergency-red">
                Sind Sie sicher? Geben Sie zur Bestätigung ein:
              </p>
              <p className="text-center font-mono text-sm font-bold text-anthrazit">
                KONTO LÖSCHEN
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Bestätigungstext eingeben"
                className="text-center font-mono"
                autoComplete="off"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText("");
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  className="flex-1 bg-emergency-red hover:bg-red-700"
                  disabled={!isConfirmed || deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting ? "Wird gelöscht..." : "Endgültig löschen"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <p className="text-center text-xs text-muted-foreground">
        Bei Fragen zur Datenlöschung wenden Sie sich an den Quartiers-Admin.
      </p>
    </div>
  );
}

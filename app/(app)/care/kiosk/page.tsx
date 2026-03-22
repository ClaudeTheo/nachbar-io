// app/(app)/care/kiosk/page.tsx
// Nachbar.io — Kiosk-Verwaltung fuer Angehoerige (Fotos + Erinnerungen)
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Bell, Monitor, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KioskPhotoUpload } from "@/components/care/KioskPhotoUpload";
import { KioskReminderForm } from "@/components/care/KioskReminderForm";

type Tab = "photos" | "reminders";

interface CaregiverLink {
  id: string;
  resident_id: string;
  resident?: { display_name: string; avatar_url: string | null };
}

export default function KioskManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("photos");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [residentName, setResidentName] = useState<string>("");

  // Caregiver-Link laden und household_id ermitteln
  const resolveHousehold = useCallback(async () => {
    setError(null);
    try {
      // Schritt 1: Caregiver-Links laden
      const linksRes = await fetch("/api/caregiver/links");
      if (!linksRes.ok) {
        throw new Error("Caregiver-Links konnten nicht geladen werden");
      }
      const linksData = await linksRes.json();
      const caregiverLinks: CaregiverLink[] = linksData.as_caregiver ?? [];

      if (caregiverLinks.length === 0) {
        setError("NO_LINK");
        return;
      }

      // Ersten aktiven Link verwenden
      const link = caregiverLinks[0];
      setResidentName(link.resident?.display_name ?? "Bewohner");

      // Schritt 2: household_id fuer den Bewohner ermitteln
      const hhRes = await fetch(
        `/api/care/household?resident_id=${link.resident_id}`
      );
      if (!hhRes.ok) {
        const hhData = await hhRes.json();
        throw new Error(
          hhData.error || "Haushalt konnte nicht ermittelt werden"
        );
      }
      const hhData = await hhRes.json();
      setHouseholdId(hhData.household_id);
    } catch (err) {
      if (error !== "NO_LINK") {
        setError(
          err instanceof Error ? err.message : "Unbekannter Fehler"
        );
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- error wird nur gelesen, nicht als Trigger
  }, []);

  useEffect(() => {
    resolveHousehold();
  }, [resolveHousehold]);

  // Lade-Zustand
  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-quartier-green" />
        </div>
      </div>
    );
  }

  // Kein Caregiver-Link vorhanden
  if (error === "NO_LINK") {
    return (
      <div className="px-4 py-6 space-y-6">
        <Link
          href="/care"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Pflege-Dashboard
        </Link>

        <div className="rounded-xl border-2 border-dashed border-muted p-8 text-center">
          <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium text-anthrazit">
            Kein Kiosk-Zugriff
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Sie sind noch keinem Bewohner als Angehöriger zugeordnet. Bitten Sie
            Ihren Angehörigen, eine Einladung zu senden.
          </p>
          <Link
            href="/care/caregiver"
            className="inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white hover:bg-quartier-green-dark"
          >
            Zur Angehörigen-Verwaltung
          </Link>
        </div>
      </div>
    );
  }

  // Allgemeiner Fehler
  if (error || !householdId) {
    return (
      <div className="px-4 py-6 space-y-6">
        <Link
          href="/care"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Pflege-Dashboard
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Haushalt konnte nicht ermittelt werden"}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <PageHeader
        title={<><Monitor className="h-6 w-6 text-quartier-green" /> Kiosk verwalten</>}
        subtitle={`Fotos und Erinnerungen für das Terminal von ${residentName}`}
        backHref="/care"
        backLabel="Zurück zum Pflege-Dashboard"
      />

      {/* Tab-Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("photos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "photos"
              ? "border-quartier-green text-quartier-green"
              : "border-transparent text-muted-foreground hover:text-anthrazit"
          }`}
        >
          <Camera className="h-4 w-4" />
          Fotos
        </button>
        <button
          onClick={() => setActiveTab("reminders")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "reminders"
              ? "border-quartier-green text-quartier-green"
              : "border-transparent text-muted-foreground hover:text-anthrazit"
          }`}
        >
          <Bell className="h-4 w-4" />
          Erinnerungen
        </button>
      </div>

      {/* Tab-Inhalt */}
      {activeTab === "photos" && (
        <KioskPhotoUpload householdId={householdId} />
      )}
      {activeTab === "reminders" && (
        <KioskReminderForm householdId={householdId} />
      )}
    </div>
  );
}

"use client";

// Neues Medikament hinzufuegen — Formular-Seite

import { Pill } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useRouter } from "next/navigation";
import { MedicationForm } from "@/modules/care/components/medication/MedicationForm";

export default function NewMedicationPage() {
  const router = useRouter();

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <PageHeader
        title={
          <>
            <Pill className="h-6 w-6 text-quartier-green" /> Erinnerung
            hinzufügen
          </>
        }
        subtitle="Erstellen Sie eine neue Erinnerung für Ihren Alltag"
        backHref="/care/medications"
      />

      {/* Formular */}
      <MedicationForm
        onSuccess={() => router.push("/care/medications")}
        onCancel={() => router.back()}
      />
    </div>
  );
}

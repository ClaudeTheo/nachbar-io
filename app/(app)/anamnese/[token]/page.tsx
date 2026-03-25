// Nachbar.io — Digitaler Anamnese-Bogen (Patienten-Seite)
// Token-basierter Zugriff, kein Login erforderlich
// Senior-Modus: 80px Touch-Targets, 4.5:1 Kontrast

import PatientAnamneseForm from "@/components/anamnese/PatientAnamneseForm";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AnamneseFormPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PatientAnamneseForm token={token} />
    </div>
  );
}

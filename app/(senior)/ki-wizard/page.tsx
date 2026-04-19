// app/(senior)/ki-wizard/page.tsx
// Welle C C6 — KI-Onboarding-Wizard fuer die Senior-App.
//
// Bewusst NICHT unter /onboarding/, weil modules/onboarding/ schon den
// klassischen Slide-basierten Erst-Tour-Flow belegt (Welcome, Map, Push).
// "ki-wizard" macht die KI-Natur explizit und vermeidet Verwechslung.

"use client";

import { WizardChat } from "@/modules/voice/components/onboarding/WizardChat";

export default function KiWizardPage() {
  return (
    <div className="-mx-6 -my-8 flex h-[100dvh] flex-col">
      <header className="border-b border-[#2D3142]/10 bg-white px-6 py-4">
        <h1 className="text-2xl font-semibold text-[#2D3142]">
          Lernen wir uns kennen
        </h1>
        <p className="mt-1 text-base text-[#2D3142]/70">
          Erzaehlen Sie mir etwas ueber sich, damit ich Ihnen besser helfen
          kann.
        </p>
      </header>
      <div className="flex-1 overflow-hidden">
        <WizardChat />
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import type { SubscriptionStatus } from "@/lib/hilfe/types";

interface PaywallBannerProps {
  status: SubscriptionStatus;
  trialReceiptUsed: boolean;
}

export default function PaywallBanner({
  status,
  trialReceiptUsed,
}: PaywallBannerProps) {
  const router = useRouter();

  // Kein Banner noetig fuer aktive Abos
  if (status === "active") return null;
  if (status === "trial" && !trialReceiptUsed) return null;

  const isTrialExpired = status === "trial" && trialReceiptUsed;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {isTrialExpired
          ? "Ihre kostenlose Quittung wurde erstellt"
          : "Abrechnungs-Modul erforderlich"}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {isTrialExpired
          ? "Um weitere Einsaetze abzurechnen, aktivieren Sie das Abrechnungs-Modul fuer 19,90 EUR/Monat."
          : "Um Einsaetze zu dokumentieren, Quittungen zu erstellen und mit der Pflegekasse abzurechnen, benoetigen Sie das Abrechnungs-Modul."}
      </p>
      <div className="space-y-2 text-sm text-gray-500 mb-4">
        <p>
          Enthalten: Einsatz-Dokumentation, Digitale Unterschrift, PDF-Quittung,
          Sammelabrechnung, Budget-Tracker
        </p>
        <p className="font-medium text-gray-700">
          19,90 EUR/Monat · Jederzeit kuendbar · SEPA oder Karte
        </p>
      </div>
      <button
        onClick={() => router.push("/hilfe/abo")}
        className="w-full rounded-xl bg-[#4CAF87] px-6 py-4 text-white font-semibold text-base
                   min-h-[52px] active:scale-[0.98] transition-transform"
      >
        Abrechnungs-Modul aktivieren
      </button>
    </div>
  );
}

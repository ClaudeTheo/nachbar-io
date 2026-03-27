"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    number: 1,
    title: "Pflege-Profil anlegen",
    description:
      "Tragen Sie Ihren Pflegegrad, Ihre Pflegekasse und Versichertennummer ein. Diese Daten werden verschlüsselt gespeichert.",
  },
  {
    number: 2,
    title: "Hilfe-Gesuch erstellen",
    description:
      "Wählen Sie eine Kategorie (z.B. Einkaufen, Begleitung) und beschreiben Sie, wobei Sie Hilfe benötigen.",
  },
  {
    number: 3,
    title: "Helfer auswählen",
    description:
      "Freiwillige Helfer aus Ihrer Nachbarschaft melden sich auf Ihr Gesuch. Wählen Sie den passenden Helfer aus.",
  },
  {
    number: 4,
    title: "Helfer verbinden",
    description:
      "Nach dem ersten Einsatz fragt die App, ob Sie den Helfer als festen Helfer verbinden möchten. Oder laden Sie einen bekannten Helfer per Code ein.",
  },
  {
    number: 5,
    title: "Einsatz bestaetigen",
    description:
      "Nach jedem Einsatz dokumentiert der Helfer Datum, Dauer und Tätigkeit. Sie unterschreiben digital auf dem Bildschirm.",
  },
  {
    number: 6,
    title: "Quittung erhalten",
    description:
      "Eine PDF-Quittung wird automatisch erstellt. Sie können diese herunterladen oder per E-Mail erhalten.",
  },
  {
    number: 7,
    title: "Bei der Pflegekasse einreichen",
    description:
      "Am Monatsende erhalten Sie eine Sammelabrechnung mit allen Einsätzen. Senden Sie diese per Post oder E-Mail an Ihre Pflegekasse.",
  },
];

export default function AnleitungSeniorPage() {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 print:hidden">
        <Link
          href="/hilfe"
          className="p-2 -ml-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Anleitung</h1>
          <p className="text-sm text-gray-500">
            So finden Sie Hilfe und rechnen ab
          </p>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block p-8">
        <h1 className="text-2xl font-bold">
          Nachbar.io — Anleitung für Pflegebedürftige
        </h1>
        <p className="text-lg text-gray-600 mt-1">
          So finden Sie Hilfe und rechnen ab
        </p>
        <hr className="mt-4" />
      </div>

      {/* Intro */}
      <div className="p-4">
        <div className="rounded-2xl bg-[#f0faf4] p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Ihr Entlastungsbetrag: 131 EUR pro Monat
          </h2>
          <p className="text-base text-gray-600 leading-relaxed">
            Ab Pflegegrad 1 stehen Ihnen 131 EUR monatlich für
            Nachbarschaftshilfe zu (§45b SGB XI). Dieses Geld zahlt Ihre
            Pflegekasse — Sie müssen nichts bezahlen. Die App hilft Ihnen,
            einen Helfer zu finden und die Abrechnung zu erledigen.
          </p>
        </div>

        {/* Schritte */}
        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-gray-200 p-5"
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-full bg-[#4CAF87] text-white
                                flex items-center justify-center text-xl font-bold"
                >
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Allgemeine Informationen zur Nutzung des Entlastungsbetrags. Keine
            Rechtsberatung. Bei Fragen wenden Sie sich an Ihre Pflegekasse.
            Stand: März 2026.
          </p>
        </div>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="w-full mt-4 rounded-xl border border-gray-300 px-6 py-4 text-gray-600 font-medium
                     min-h-[52px] active:scale-[0.98] transition-transform print:hidden"
        >
          Anleitung drucken / als PDF speichern
        </button>
      </div>
    </div>
  );
}

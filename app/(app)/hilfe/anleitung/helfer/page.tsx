'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getAllStates } from '@/lib/hilfe/federal-states';

const steps = [
  {
    number: 1,
    title: 'Was ist der Entlastungsbetrag?',
    description: 'Pflegebedürftige ab Pflegegrad 1 erhalten 131 EUR/Monat von ihrer Pflegekasse (§45b SGB XI). Dieses Geld ist für Alltagsunterstützung gedacht — und Sie können damit Geld verdienen.',
  },
  {
    number: 2,
    title: 'Wer kann Helfer werden?',
    description: 'Mindestens 16 Jahre alt, nicht verwandt bis zum 2. Grad, nicht im selben Haushalt. Je nach Bundesland gelten weitere Regeln.',
  },
  {
    number: 3,
    title: 'Registrierung als Helfer',
    description: 'Wählen Sie Ihr Bundesland, geben Sie Geburtsdatum und Stundensatz ein. Bestätigen Sie die Voraussetzungen per Checkbox.',
  },
  {
    number: 4,
    title: 'Erste Quittung kostenlos',
    description: 'Führen Sie einen kompletten Einsatz durch — inklusive Dokumentation, Unterschrift und PDF-Quittung. Alles kostenlos, damit Sie den vollen Wert der App erleben.',
  },
  {
    number: 5,
    title: 'Abrechnungs-Modul buchen',
    description: 'Für 19,90 EUR/Monat erhalten Sie Zugang zu: Einsatz-Dokumentation, digitale Unterschrift, PDF-Quittungen, Sammelabrechnung, Budget-Tracker. SEPA oder Karte, jederzeit kündbar.',
  },
  {
    number: 6,
    title: 'Mit Senior verbinden',
    description: 'Über ein Hilfe-Gesuch oder per Einladungs-Code des Seniors. Die Verbindung erfordert die Bestätigung beider Seiten (DSGVO).',
  },
  {
    number: 7,
    title: 'Einsatz dokumentieren',
    description: 'Datum, Uhrzeit, Dauer und Tätigkeit eintragen. Beide Seiten unterschreiben digital auf dem Bildschirm.',
  },
  {
    number: 8,
    title: 'PDF-Quittung erstellen',
    description: 'Die App erstellt automatisch eine pflegekassenkonforme Quittung. Sie können diese herunterladen oder per E-Mail versenden.',
  },
  {
    number: 9,
    title: 'Sammelabrechnung am Monatsende',
    description: 'Am Monatsende erstellen Sie eine Sammelabrechnung mit allen Einsätzen eines Monats. Ein PDF für die Pflegekasse.',
  },
  {
    number: 10,
    title: 'Steuern',
    description: 'Einnahmen aus Nachbarschaftshilfe sind bis 3.000 EUR/Jahr steuerfrei (§3 Nr. 36 EStG). Darüber hinaus müssen Sie die Einnahmen in Ihrer Steuererklärung angeben.',
  },
];

export default function AnleitungHelferPage() {
  const allStates = getAllStates();
  const verifiedStates = allStates.filter((s) => s.research_status === 'checked_official_sources');
  const pendingStates = allStates.filter((s) => s.research_status === 'pending_research');

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 print:hidden">
        <Link href="/hilfe" className="p-2 -ml-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Helfer-Anleitung</h1>
          <p className="text-sm text-gray-500">So verdienen Sie Geld mit Nachbarschaftshilfe</p>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block p-8">
        <h1 className="text-2xl font-bold">Nachbar.io — Anleitung für Helfer</h1>
        <p className="text-lg text-gray-600 mt-1">So verdienen Sie Geld mit Nachbarschaftshilfe</p>
        <hr className="mt-4" />
      </div>

      <div className="p-4">
        {/* Verdienstrechnung */}
        <div className="rounded-2xl bg-[#f0faf4] p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Ihre Verdienstmöglichkeit
          </h2>
          <p className="text-base text-gray-600 leading-relaxed mb-3">
            Bei 15 EUR/Stunde und 2 Einsätzen pro Woche (je 2h) verdienen Sie ca. <strong>240 EUR/Monat</strong> —
            abzüglich 19,90 EUR Servicegebühr = <strong>220 EUR netto</strong>.
          </p>
          <p className="text-sm text-gray-500">
            Steuerfrei bis 3.000 EUR/Jahr (§3 Nr. 36 EStG)
          </p>
        </div>

        {/* Schritte */}
        <div className="space-y-4 mb-6">
          {steps.map((step) => (
            <div key={step.number} className="rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#2D3142] text-white
                                flex items-center justify-center text-lg font-bold">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bundesland-Links — geprüft */}
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Regeln in Ihrem Bundesland</h2>
        <div className="space-y-2 mb-4">
          {verifiedStates.map((state) => (
            <Link
              key={state.state_code}
              href={`/hilfe/anleitung/bundesland/${state.state_code}`}
              className="block rounded-xl border border-gray-200 p-4 hover:border-[#4CAF87] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{state.state_name}</span>
                <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {state.training_required
                  ? `${state.training_hours} UE Schulung erforderlich`
                  : 'Kein Kurs nötig'}
                {state.max_concurrent_clients ? ` · Max. ${state.max_concurrent_clients} Klienten` : ''}
              </p>
            </Link>
          ))}
        </div>

        {/* Bundesland-Links — noch nicht geprüft */}
        {pendingStates.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Weitere Bundesländer (Daten werden recherchiert)</h3>
            <div className="grid grid-cols-2 gap-2">
              {pendingStates.map((state) => (
                <Link
                  key={state.state_code}
                  href={`/hilfe/anleitung/bundesland/${state.state_code}`}
                  className="rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-500 hover:border-gray-300 transition-colors"
                >
                  {state.state_name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-xl bg-gray-50 p-4 mb-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Allgemeine Informationen, keine Rechtsberatung. Die Regeln können sich ändern.
            Prüfen Sie die aktuellen Vorgaben bei Ihrer zuständigen Behörde. Stand: März 2026.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full rounded-xl border border-gray-300 px-6 py-4 text-gray-600 font-medium
                     min-h-[52px] print:hidden"
        >
          Anleitung drucken / als PDF speichern
        </button>
      </div>
    </div>
  );
}

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getAllStates, getStateRules } from '@/lib/hilfe/federal-states';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return getAllStates().map((s) => ({ code: s.state_code }));
}

export default async function BundeslandPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const state = getStateRules(code);
  if (!state) notFound();

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link href="/hilfe/anleitung/helfer" className="p-2 -ml-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{state.state_name}</h1>
      </div>

      <div className="p-4 space-y-4">
        {!state.is_available && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-700 mb-2">Nicht verfuegbar</h2>
            <p className="text-sm text-red-600">
              In {state.state_name} ist die Abrechnung von Nachbarschaftshilfe ueber den
              Entlastungsbetrag derzeit nicht moeglich.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Regeln fuer {state.state_name}</h2>

          <div className="grid gap-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Schulung erforderlich</span>
              <span className="font-medium">
                {state.training_required ? `Ja (${state.training_hours}h)` : 'Nein'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Mindestalter</span>
              <span className="font-medium">{state.min_age} Jahre</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Max. Klienten gleichzeitig</span>
              <span className="font-medium">
                {state.max_concurrent_clients ?? 'Kein Limit'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Verwandtschaftsausschluss</span>
              <span className="font-medium">Bis {state.relationship_exclusion_degree}. Grad</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Gleicher Haushalt ausgeschlossen</span>
              <span className="font-medium">{state.same_household_excluded ? 'Ja' : 'Nein'}</span>
            </div>
          </div>
        </div>

        {state.notes && (
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm text-blue-700">{state.notes}</p>
          </div>
        )}

        {state.registration_authority && (
          <div className="rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Zustaendige Stelle</h3>
            <p className="text-sm text-gray-600">{state.registration_authority}</p>
          </div>
        )}

        {state.official_form_url && (
          <a
            href={state.official_form_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-[#4CAF87] p-4 text-center text-[#4CAF87] font-medium"
          >
            Offizielles Formular herunterladen
          </a>
        )}

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-400">
            Allgemeine Informationen, keine Rechtsberatung. Stand: Maerz 2026.
          </p>
        </div>
      </div>
    </div>
  );
}

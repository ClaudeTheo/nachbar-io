import { ChevronLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getAllStates, getStateRules } from '@/lib/hilfe/federal-states';
import { notFound } from 'next/navigation';
import { InfoHint } from '../InfoHint';

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

  const isPending = state.research_status === 'pending_research';

  // Erlaubte Taetigkeiten sammeln
  const activities = [
    { label: 'Haushaltshilfe', value: state.allowed_household, hint: 'Zum Beispiel Kochen, Aufräumen oder Wäsche machen.' },
    { label: 'Putzen/Reinigung', value: state.allowed_cleaning, hint: 'Böden wischen, Staub wischen oder Bad reinigen.' },
    { label: 'Einkaufen', value: state.allowed_shopping, hint: 'Lebensmittel oder Dinge des täglichen Bedarfs besorgen.' },
    { label: 'Arztbegleitung', value: state.allowed_escort, hint: 'Die Person zum Arzt, zur Apotheke oder zu Behörden begleiten.' },
    { label: 'Freizeitbegleitung', value: state.allowed_leisure, hint: 'Gemeinsame Spaziergänge, Vorlesen oder Gesellschaft leisten.' },
    { label: 'Schneeräumen', value: state.allowed_snow_removal, hint: 'Den Gehweg oder die Einfahrt von Schnee befreien.' },
    { label: 'Rasenmähen', value: state.allowed_lawn_mowing, hint: 'Rasen mähen oder leichte Gartenarbeit.' },
  ];
  const hasActivities = activities.some((a) => a.value !== null);

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link href="/hilfe/anleitung/helfer" className="p-2 -ml-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{state.state_name}</h1>
          {state.last_checked && (
            <p className="text-xs text-gray-400">Geprueft: {state.last_checked}</p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!state.is_available && !isPending && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-700 mb-2">Nicht verfuegbar</h2>
            <p className="text-sm text-red-600">
              In {state.state_name} ist die Abrechnung von Nachbarschaftshilfe ueber den
              Entlastungsbetrag derzeit nicht moeglich.
            </p>
          </div>
        )}

        {isPending && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6">
            <h2 className="text-lg font-semibold text-amber-700 mb-2">Daten werden recherchiert</h2>
            <p className="text-sm text-amber-600">
              Die Regeln fuer {state.state_name} werden derzeit geprueft. Die angezeigten
              Basiswerte (Mindestalter, Verwandtschaftsausschluss) gelten bundesweit.
            </p>
          </div>
        )}

        {/* Grundregeln */}
        <div className="rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Regeln fuer {state.state_name}</h2>

          <div className="grid gap-3">
            <div className="flex justify-between items-start py-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                Schulung erforderlich
                <InfoHint text="Manche Bundesländer verlangen einen kurzen Kurs, bevor Sie als Helfer starten dürfen. Eine UE (Unterrichtseinheit) dauert 45 Minuten." />
              </span>
              <span className="font-medium">
                {state.training_required ? `Ja (${state.training_hours} UE a 45 Min.)` : 'Nein'}
              </span>
            </div>
            {state.formal_pre_registration !== null && (
              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                <span className="text-gray-600 flex items-center">
                  Vorab-Registrierung
                  <InfoHint text="Müssen Sie sich bei einer Behörde anmelden, bevor Sie als Helfer anfangen dürfen? Wenn ja, geht das meistens online oder telefonisch." />
                </span>
                <span className="font-medium">
                  {state.formal_pre_registration ? 'Ja' : 'Nein'}
                </span>
              </div>
            )}
            <div className="flex justify-between items-start py-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                Mindestalter
                <InfoHint text="Ab diesem Alter dürfen Sie als Nachbarschaftshelfer tätig werden und mit der Pflegekasse abrechnen." />
              </span>
              <span className="font-medium">{state.min_age} Jahre</span>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                Max. Klienten gleichzeitig
                <InfoHint text="So viele Personen dürfen Sie höchstens gleichzeitig betreuen. Mehr sind nicht erlaubt, damit die Qualität der Hilfe stimmt." />
              </span>
              <span className="font-medium">
                {state.max_concurrent_clients ?? 'Kein Limit'}
              </span>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                Verwandtschaftsausschluss
                <InfoHint text="Sie dürfen keine nahen Verwandten betreuen und dafür Geld bekommen. 2. Grad bedeutet: Eltern, Kinder, Geschwister, Großeltern und Enkel sind ausgeschlossen." />
              </span>
              <span className="font-medium">Bis {state.relationship_exclusion_degree}. Grad</span>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                Gleicher Haushalt ausgeschlossen
                <InfoHint text="Wohnen Sie mit der Person zusammen, dürfen Sie die Hilfe nicht über die Pflegekasse abrechnen." />
              </span>
              <span className="font-medium">{state.same_household_excluded ? 'Ja' : 'Nein'}</span>
            </div>
            {state.direct_payment_possible !== null && (
              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                <span className="text-gray-600 flex items-center">
                  Direktzahlung an Helfer
                  <InfoHint text="Kann die Pflegekasse das Geld direkt an Sie als Helfer überweisen? Wenn ja, brauchen Sie eine Abtretungserklärung (ein kurzes Formular)." />
                </span>
                <span className="font-medium">
                  {state.direct_payment_possible ? 'Ja' : 'Nein'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stundensatz-Hinweis */}
        {(state.hourly_rate_min_cents || state.hourly_rate_max_cents || state.hourly_rate_note) && (
          <div className="rounded-2xl border border-gray-200 p-6 space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center">
              Stundensatz
              <InfoHint text="So viel können Sie pro Stunde für Ihre Hilfe verlangen. Der Betrag wird aus dem Entlastungsbetrag der pflegebedürftigen Person bezahlt (bis zu 131 EUR pro Monat)." />
            </h3>
            {state.hourly_rate_min_cents && state.hourly_rate_max_cents && (
              <p className="text-2xl font-bold text-[#4CAF87]">
                {(state.hourly_rate_min_cents / 100).toFixed(2)} – {(state.hourly_rate_max_cents / 100).toFixed(2)} EUR/Stunde
              </p>
            )}
            {state.hourly_rate_note && (
              <p className="text-sm text-gray-500">{state.hourly_rate_note}</p>
            )}
          </div>
        )}

        {/* Erlaubte Taetigkeiten */}
        {hasActivities && (
          <div className="rounded-2xl border border-gray-200 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              Erlaubte Taetigkeiten
              <InfoHint text="Nur diese Tätigkeiten können Sie über die Pflegekasse abrechnen. Andere Arbeiten (z.B. Handwerkerarbeiten oder Gebäudereparaturen) zählen nicht dazu." />
            </h3>
            <div className="grid gap-2">
              {activities.map((a) => (
                a.value !== null && (
                  <div key={a.label} className="flex items-center gap-3 py-1">
                    <span className={`text-lg ${a.value ? 'text-[#4CAF87]' : 'text-red-400'}`}>
                      {a.value ? '\u2713' : '\u2717'}
                    </span>
                    <span className={`text-sm ${a.value ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                      {a.label}
                    </span>
                    <InfoHint text={a.hint} />
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Anerkennung */}
        {state.recognition_type && (
          <div className="rounded-2xl border border-gray-200 p-6 space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center">
              Anerkennungsverfahren
              <InfoHint text="So werden Sie offiziell als Nachbarschaftshelfer anerkannt. Erst mit dieser Anerkennung können Sie über die Pflegekasse abrechnen." />
            </h3>
            <p className="text-sm text-gray-600">{state.recognition_type}</p>
          </div>
        )}

        {/* Versicherung + Steuer */}
        {(state.insurance_note || state.tax_note) && (
          <div className="rounded-2xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Wichtige Hinweise</h3>
            {state.insurance_note && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                  Versicherung
                  <InfoHint text="Wenn beim Helfen etwas kaputt geht oder jemand sich verletzt, schützt Sie eine Versicherung vor Kosten. Prüfen Sie, ob Ihre private Haftpflicht das abdeckt." />
                </p>
                <p className="text-sm text-gray-600">{state.insurance_note}</p>
              </div>
            )}
            {state.tax_note && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                  Steuern
                  <InfoHint text="Bis zu einem bestimmten Betrag pro Jahr müssen Sie auf Ihre Einnahmen als Helfer keine Steuern zahlen. Tragen Sie die Einnahmen trotzdem in Ihre Steuererklärung ein." />
                </p>
                <p className="text-sm text-gray-600">{state.tax_note}</p>
              </div>
            )}
          </div>
        )}

        {state.notes && (
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm text-blue-700">{state.notes}</p>
          </div>
        )}

        {state.registration_authority && (
          <div className="rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
              Zustaendige Stelle
              <InfoHint text="An diese Behörde wenden Sie sich, wenn Sie Fragen haben oder sich registrieren möchten. Die können Ihnen auch bei der Abrechnung helfen." />
            </h3>
            <p className="text-sm text-gray-600">{state.registration_authority}</p>
          </div>
        )}

        {/* Offizielle Links */}
        {(state.primary_official_url || state.secondary_official_url || state.official_form_url) && (
          <div className="space-y-2">
            {state.primary_official_url && (
              <a
                href={state.primary_official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[#4CAF87] p-4 text-[#4CAF87] font-medium text-sm"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                Offizielle Landesseite
              </a>
            )}
            {state.secondary_official_url && (
              <a
                href={state.secondary_official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-gray-200 p-4 text-gray-600 font-medium text-sm"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                Weitere offizielle Quelle
              </a>
            )}
            {state.official_form_url && (
              <a
                href={state.official_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-gray-200 p-4 text-gray-600 font-medium text-sm"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                Offizielles Formular herunterladen
              </a>
            )}
          </div>
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

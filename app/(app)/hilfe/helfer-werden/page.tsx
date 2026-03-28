// Nachbar Hilfe — Helfer werden Seite
// Registrierung als Nachbarschaftshelfer nach §45a SGB XI

import { HelperRegistrationForm } from '@/modules/hilfe/components/HelperRegistrationForm';

export const metadata = {
  title: 'Helfer werden | Nachbar Hilfe',
  description: 'Registrieren Sie sich als Nachbarschaftshelfer und helfen Sie Ihren Nachbarn.',
};

export default function HelferWerdenPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Helfer werden</h1>
      <p className="mb-8 text-gray-600">
        Registrieren Sie sich als Nachbarschaftshelfer und unterstuetzen Sie
        pflegebeduerftige Personen in Ihrem Quartier. Die Leistungen koennen
        ueber den Entlastungsbetrag nach §45a SGB XI abgerechnet werden.
      </p>
      <HelperRegistrationForm />
    </main>
  );
}

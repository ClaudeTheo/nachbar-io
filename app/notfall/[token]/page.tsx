// Oeffentliche Notfallmappe-Ansicht — kein Login erforderlich
// Erreichbar via QR-Code auf dem Kuehlschrank-Blatt
// Zeigt NUR Level 1 (lebenswichtige Daten) fuer Datenschutz
import { getAdminSupabase } from "@/lib/supabase/admin";
import { decrypt } from "@/modules/care/services/crypto";
import { Phone, AlertTriangle, Clock, Heart } from "lucide-react";
import type { Level1Data } from "@/modules/care/components/emergency/types";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function NotfallPublicPage({ params }: PageProps) {
  const { token } = await params;

  // Admin-Client (Service-Role) fuer Zugriff ohne Auth
  const supabase = getAdminSupabase();

  const { data: profile, error } = await supabase
    .from("emergency_profiles")
    .select("level1_encrypted, pdf_token_expires_at, updated_at")
    .eq("pdf_token", token)
    .maybeSingle();

  // Token nicht gefunden
  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h1 className="text-xl font-bold text-[#2D3142]">
            Link nicht gefunden
          </h1>
          <p className="mt-2 text-gray-500">
            Dieser Notfallmappe-Link ist ungueltig oder wurde geloescht.
          </p>
        </div>
      </div>
    );
  }

  // Token abgelaufen
  const expiresAt = profile.pdf_token_expires_at
    ? new Date(profile.pdf_token_expires_at)
    : null;
  if (expiresAt && expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <Clock className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h1 className="text-xl font-bold text-[#2D3142]">Link abgelaufen</h1>
          <p className="mt-2 text-gray-500">
            Dieser QR-Code ist nicht mehr gueltig. Bitte den Bewohner bitten,
            einen neuen QR-Code zu generieren.
          </p>
        </div>
      </div>
    );
  }

  // Level 1 entschluesseln
  let level1: Level1Data;
  try {
    level1 = JSON.parse(decrypt(profile.level1_encrypted));
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold text-[#2D3142]">Fehler</h1>
          <p className="mt-2 text-gray-500">
            Die Notfalldaten konnten nicht gelesen werden.
          </p>
        </div>
      </div>
    );
  }

  const validUntil = expiresAt
    ? expiresAt.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unbekannt";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Roter Notfall-Banner */}
      <div className="bg-[#EF4444] px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Phone className="h-6 w-6 text-white" />
          <span className="text-xl font-bold text-white">
            Bei Notfaellen: 112 anrufen
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4CAF87]">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#2D3142]">Notfalldaten</h1>
            <p className="text-sm text-gray-500">
              Lebenswichtige Informationen
            </p>
          </div>
        </div>

        {/* Daten — grosse Schrift fuer Rettungskraefte */}
        <div className="space-y-4">
          <DataCard label="Name" value={level1.fullName} large />
          <DataCard
            label="Geburtsdatum"
            value={formatDate(level1.dateOfBirth)}
            large
          />
          {level1.bloodType && (
            <DataCard label="Blutgruppe" value={level1.bloodType} large />
          )}

          {level1.allergies && (
            <DataCard
              label="Allergien / Unvertraeglichkeiten"
              value={level1.allergies}
              warning
            />
          )}

          {level1.medications && (
            <DataCard label="Aktuelle Medikamente" value={level1.medications} />
          )}

          {level1.conditions && (
            <DataCard
              label="Erkrankungen / Diagnosen"
              value={level1.conditions}
            />
          )}

          {level1.implants && (
            <DataCard label="Implantate / Prothesen" value={level1.implants} />
          )}

          {level1.patientenverfuegung && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
              <span className="text-lg font-semibold text-amber-800">
                Patientenverfuegung vorhanden
              </span>
            </div>
          )}

          {/* Notfallkontakte */}
          {(level1.emergencyContact1.name || level1.emergencyContact2.name) && (
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-semibold text-[#2D3142]">
                Notfallkontakte
              </h2>
              <div className="space-y-3">
                {level1.emergencyContact1.name && (
                  <ContactCard contact={level1.emergencyContact1} />
                )}
                {level1.emergencyContact2.name && (
                  <ContactCard contact={level1.emergencyContact2} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-sm text-gray-400">
          <p>Erstellt mit nachbar.io</p>
          <p>Gueltig bis {validUntil}</p>
        </div>
      </div>
    </div>
  );
}

// --- Hilfskomponenten ---

function DataCard({
  label,
  value,
  large,
  warning,
}: {
  label: string;
  value: string;
  large?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${
        warning
          ? "border-2 border-red-200 bg-red-50"
          : "border border-gray-200 bg-white"
      }`}
    >
      <span className="block text-sm font-medium text-gray-500">{label}</span>
      <span
        className={`mt-1 block whitespace-pre-line font-semibold ${
          large ? "text-xl" : "text-lg"
        } ${warning ? "text-red-700" : "text-[#2D3142]"}`}
      >
        {value}
      </span>
    </div>
  );
}

function ContactCard({
  contact,
}: {
  contact: { name: string; phone: string; relation: string };
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="block text-lg font-semibold text-[#2D3142]">
            {contact.name}
          </span>
          {contact.relation && (
            <span className="text-sm text-gray-500">{contact.relation}</span>
          )}
        </div>
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-2 rounded-xl bg-[#4CAF87] px-5 py-3 text-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ minHeight: "48px" }}
          >
            <Phone className="h-5 w-5" />
            Anrufen
          </a>
        )}
      </div>
      {contact.phone && (
        <span className="mt-1 block text-base text-gray-600">
          {contact.phone}
        </span>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

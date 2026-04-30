// components/senior/ProfilView.tsx
// Task J-3b: Stateless View for /profil (Senior-UI).
//
// Rules from Phase-1 Design-Doc 2026-04-10 (same as kreis-start):
//   - Touch-Targets >=80px
//   - High contrast (Anthrazit on White), WCAG AA
//   - No badges, no feeds
//   - Siezen-Ansprache, no emojis
//   - Inline styles for min-height (testable via jsdom)

"use client";

import Link from "next/link";
import { PushToggle } from "./PushToggle";
import { AiHelpSettingsToggle } from "@/modules/ai/components/AiHelpSettingsToggle";

interface ProfilViewProps {
  displayName: string;
  avatarUrl: string | null;
  emergencyContacts: Array<{
    name: string;
    relationship: string;
    phone: string;
  }>;
}

export function ProfilView({
  displayName,
  avatarUrl,
  emergencyContacts,
}: ProfilViewProps) {
  return (
    <section className="min-h-screen bg-white px-4 py-6" aria-label="Profil">
      {/* Header */}
      <Link
        href="/kreis-start"
        className="inline-flex items-center text-lg font-semibold text-anthrazit"
        style={{ minHeight: "80px" }}
      >
        &larr; Zur&uuml;ck
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-anthrazit">Mein Profil</h1>

      {/* Name + Avatar */}
      <div className="mt-6 flex items-center gap-4">
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- Avatare kommen aus Nutzer-/Supabase-URLs; next/image ist ohne Remote-Patterns nicht verlaesslich.
          <img
            src={avatarUrl}
            alt={displayName}
            className="rounded-full object-cover"
            style={{ width: "48px", height: "48px" }}
          />
        )}
        <p
          data-testid="profil-name"
          className="text-3xl font-bold text-anthrazit"
        >
          {displayName}
        </p>
      </div>

      {/* Notfallkontakte */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-anthrazit">
          Meine Notfallkontakte
        </h2>

        {emergencyContacts.length === 0 ? (
          <div
            data-testid="profil-no-contacts"
            className="mt-4 rounded-2xl border-2 border-dashed border-anthrazit/40 bg-white p-6 text-center"
            style={{ minHeight: "80px" }}
          >
            <p className="text-base text-anthrazit/80">
              Keine Kontakte hinterlegt &mdash; bitten Sie Ihre
              Angeh&ouml;rigen, Kontakte f&uuml;r Sie einzutragen.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {emergencyContacts.map((contact, index) => (
              <li
                key={index}
                data-testid="profil-contact"
                className="rounded-2xl border border-anthrazit/20 bg-white p-4"
              >
                <p className="text-lg font-bold text-anthrazit">
                  {contact.name}
                </p>
                {contact.relationship && (
                  <p className="text-base text-gray-500">
                    {contact.relationship}
                  </p>
                )}
                <a
                  href={`tel:${contact.phone}`}
                  className="mt-2 inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-base font-semibold text-white"
                  style={{ minHeight: "56px" }}
                >
                  {contact.phone}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Benachrichtigungen */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-anthrazit">Benachrichtigungen</h2>
        <div className="mt-4">
          <PushToggle />
        </div>
      </div>

      {/* DSGVO: KI-Memory-Uebersicht (Welle C C7) */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-anthrazit">KI-Assistent</h2>
        <div className="mt-4">
          <AiHelpSettingsToggle />
        </div>
        <Link
          href="/profil/gedaechtnis"
          className="mt-4 flex w-full items-center justify-between rounded-2xl border-2 border-anthrazit/10 bg-white p-4"
          style={{ minHeight: "80px", touchAction: "manipulation" }}
        >
          <span>
            <span className="block text-lg font-bold text-anthrazit">
              Mein Gedaechtnis
            </span>
            <span className="mt-1 block text-base text-anthrazit/70">
              Sehen und loeschen, was die KI ueber Sie weiss
            </span>
          </span>
          <span aria-hidden="true" className="text-2xl text-anthrazit/40">
            &rarr;
          </span>
        </Link>
      </div>

      {/* App-Info */}
      <p className="mt-12 text-center text-sm text-gray-400">
        QuartierApp Bad S&auml;ckingen
      </p>
    </section>
  );
}

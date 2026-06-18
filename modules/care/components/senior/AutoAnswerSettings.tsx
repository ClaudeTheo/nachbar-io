"use client";

// Senior-Opt-in fuer die automatische Anruf-Annahme (Welle AA-3).
// Pro Angehoerigen-Verbindung ein grosser Schalter. Senior-tauglich:
// >=80px Touch-Targets, klare Sprache (Siezen), kein „Ueberwachungs"-Wording.
// Schreibt ueber POST /api/senior/auto-answer-consent (service_role + Audit).

import { useState } from "react";
import type { SeniorCallContact } from "@/modules/care/services/senior-auto-answer.service";

interface AutoAnswerSettingsProps {
  contacts: SeniorCallContact[];
}

export function AutoAnswerSettings({ contacts }: AutoAnswerSettingsProps) {
  if (contacts.length === 0) {
    return (
      <p className="text-lg text-anthrazit/70" data-testid="auto-answer-empty">
        Sie haben noch keine Personen in Ihrem Kreis. Sobald jemand mit Ihnen
        verbunden ist, können Sie das hier einstellen.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-base text-anthrazit/70">
        Nur Menschen aus Ihrem Kreis. Sie sehen vorher immer eine Ankündigung
        und können den Anruf jederzeit ablehnen oder dies hier wieder
        abschalten.
      </p>
      {contacts.map((contact) => (
        <ContactToggle key={contact.linkId} contact={contact} />
      ))}
    </div>
  );
}

function ContactToggle({ contact }: { contact: SeniorCallContact }) {
  const [consented, setConsented] = useState(contact.autoAnswerConsented);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !consented;
    setConsented(next); // optimistisch
    setPending(true);
    setError(false);
    try {
      const res = await fetch("/api/senior/auto-answer-consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caregiverLinkId: contact.linkId,
          consent: next,
        }),
      });
      if (!res.ok) throw new Error("request_failed");
    } catch {
      setConsented(!next); // zurueckdrehen
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-anthrazit/10 bg-white p-4"
      data-testid={`auto-answer-card-${contact.linkId}`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={consented}
        data-testid={`auto-answer-toggle-${contact.linkId}`}
        className={`flex min-h-[80px] w-full items-center justify-between gap-4 rounded-xl px-5 text-left transition-colors ${
          consented
            ? "bg-[#4CAF87] text-white"
            : "bg-anthrazit/5 text-anthrazit"
        } ${pending ? "opacity-60" : ""}`}
      >
        <span className="text-xl font-semibold">
          Anrufe von {contact.caregiverName} automatisch annehmen
        </span>
        <span className="shrink-0 text-lg font-bold">
          {consented ? "An" : "Aus"}
        </span>
      </button>

      {!contact.autoAnswerAllowed && consented && (
        <p
          className="mt-2 text-sm text-anthrazit/60"
          data-testid={`auto-answer-hint-${contact.linkId}`}
        >
          {contact.caregiverName} hat das automatische Anrufen noch nicht
          freigegeben. Ihre Zustimmung ist gespeichert und gilt, sobald die
          Person es einschaltet.
        </p>
      )}

      {error && (
        <p
          className="mt-2 text-sm text-[#EF4444]"
          data-testid={`auto-answer-error-${contact.linkId}`}
        >
          Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal.
        </p>
      )}
    </div>
  );
}

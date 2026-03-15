// components/care/ConsultationConsent.tsx
// DSGVO-Einwilligungsdialog vor Online-Sprechstunde
'use client';

import { useState } from 'react';
import type { ConsultationProviderType } from '@/lib/care/types';

interface Props {
  providerType: ConsultationProviderType;
  onConsented: () => void;
}

export function ConsultationConsent({ providerType, onConsented }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleConsent() {
    setSaving(true);
    try {
      const res = await fetch('/api/care/consultations/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_type: providerType }),
      });
      if (res.ok) onConsented();
    } catch {
      // Fehler ignorieren, Button bleibt aktiv
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-anthrazit text-center">
        Datenschutz-Hinweis
      </h2>

      <div className="space-y-3 text-lg text-anthrazit/80">
        <p>Ihre Daten werden verschluesselt uebertragen und nicht aufgezeichnet.</p>
        <p>Die Teilnahme ist freiwillig. Sie koennen jederzeit auflegen.</p>
        <p>Im Raum soll sich nur die Person befinden, die an der Sprechstunde teilnimmt.</p>
        {providerType === 'medical' && (
          <p className="font-medium text-anthrazit">
            Bei dieser aerztlichen Sprechstunde werden Gesundheitsdaten verarbeitet (Art. 9 DSGVO).
          </p>
        )}
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-1 h-6 w-6 rounded"
        />
        <span className="text-xl text-anthrazit">
          Ich habe verstanden und stimme zu
        </span>
      </label>

      <button
        onClick={handleConsent}
        disabled={!agreed || saving}
        aria-label="Einwilligung erteilen und zur Sprechstunde fortfahren"
        className="w-full h-[80px] rounded-2xl bg-quartier-green text-white text-2xl font-bold disabled:opacity-40 active:scale-95"
        style={{ touchAction: 'manipulation' }}
      >
        {saving ? 'Wird gespeichert...' : 'Weiter zur Sprechstunde'}
      </button>
    </div>
  );
}

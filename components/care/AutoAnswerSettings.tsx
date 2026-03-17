'use client';

// AutoAnswerSettings — Konfiguration fuer automatische Kiosk-Anrufannahme
// Angehoerige (Plus) koennen festlegen ob/wann ihr Anruf am Kiosk
// automatisch angenommen wird

import { useState } from 'react';

interface AutoAnswerSettingsProps {
  linkId: string;
  initialEnabled: boolean;
  initialStart: string; // HH:MM
  initialEnd: string;   // HH:MM
  onSave: (enabled: boolean, start: string, end: string) => void;
}

export default function AutoAnswerSettings({
  linkId,
  initialEnabled,
  initialStart,
  initialEnd,
  onSave,
}: AutoAnswerSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/caregiver/auto-answer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          autoAnswerAllowed: enabled,
          autoAnswerStart: start,
          autoAnswerEnd: end,
        }),
      });
      onSave(enabled, start, end);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <label htmlFor={`auto-answer-${linkId}`} className="text-sm font-medium">
          Automatisch annehmen am Kiosk
        </label>
        <button
          id={`auto-answer-${linkId}`}
          role="switch"
          aria-checked={enabled}
          aria-label="Automatisch annehmen"
          onClick={() => setEnabled(!enabled)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            enabled ? 'bg-[#4CAF87]' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex gap-4">
          <div>
            <label htmlFor={`start-${linkId}`} className="block text-xs text-gray-500">
              Von
            </label>
            <input
              id={`start-${linkId}`}
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              aria-label="Von"
              className="rounded border px-2 py-1"
            />
          </div>
          <div>
            <label htmlFor={`end-${linkId}`} className="block text-xs text-gray-500">
              Bis
            </label>
            <input
              id={`end-${linkId}`}
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              aria-label="Bis"
              className="rounded border px-2 py-1"
            />
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-[#2D3142] px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? 'Wird gespeichert...' : 'Speichern'}
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Video } from 'lucide-react';
import { useTerminal } from '@/lib/terminal/TerminalContext';
import KioskContactCard from '@/components/terminal/video/KioskContactCard';

interface CaregiverContact {
  id: string;
  caregiver_id: string;
  caregiver_name: string;
  caregiver_avatar: string | null;
  auto_answer_allowed: boolean;
  auto_answer_start: string;
  auto_answer_end: string;
  is_online: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeTimeWindowLabel(value: unknown): string {
  if (!isNonEmptyString(value)) return '';
  const trimmed = value.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : '';
}

function normalizeContacts(value: unknown): CaregiverContact[] {
  return Array.isArray(value)
    ? value.flatMap((contact) => {
        if (
          !isRecord(contact) ||
          !isNonEmptyString(contact.id) ||
          !isNonEmptyString(contact.caregiver_id) ||
          !isNonEmptyString(contact.caregiver_name) ||
          !(typeof contact.caregiver_avatar === 'string' || contact.caregiver_avatar === null)
        ) {
          return [];
        }

        return [
          {
            id: contact.id.trim(),
            caregiver_id: contact.caregiver_id.trim(),
            caregiver_name: contact.caregiver_name.trim(),
            caregiver_avatar: contact.caregiver_avatar,
            auto_answer_allowed:
              typeof contact.auto_answer_allowed === 'boolean'
                ? contact.auto_answer_allowed
                : false,
            auto_answer_start: isNonEmptyString(contact.auto_answer_start)
              ? normalizeTimeWindowLabel(contact.auto_answer_start)
              : '',
            auto_answer_end: isNonEmptyString(contact.auto_answer_end)
              ? normalizeTimeWindowLabel(contact.auto_answer_end)
              : '',
            is_online:
              typeof contact.is_online === 'boolean' ? contact.is_online : false,
          },
        ];
      })
    : [];
}

export default function VideochatScreen() {
  const { setActiveScreen } = useTerminal();
  const [contacts, setContacts] = useState<CaregiverContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContacts() {
      try {
        const res = await fetch('/api/device/contacts');
        if (res.ok) {
          const json = await res.json();
          setContacts(normalizeContacts(json.contacts));
        }
      } catch {
        // Fehler still ignorieren, leere Liste anzeigen
      } finally {
        setLoading(false);
      }
    }
    loadContacts();
  }, []);

  function handleCall(caregiverId: string) {
    // Videoanruf starten — wird in Task 9 verdrahtet
    console.log('Anruf an:', caregiverId);
  }

  function formatAutoAnswerInfo(contact: CaregiverContact): string | null {
    if (!contact.auto_answer_allowed) return null;
    if (!contact.auto_answer_start || !contact.auto_answer_end) return null;
    return `Wird automatisch angenommen ${contact.auto_answer_start}\u2013${contact.auto_answer_end}`;
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveScreen('home')}
          aria-label="Zurück zum Dashboard"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-3">
          <Video className="h-8 w-8 text-[#4CAF87]" />
          <h1 className="text-2xl font-bold text-white">Videoanruf</h1>
        </div>
      </div>

      {/* Kontaktliste */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {loading && (
          <p className="text-center text-white/60">Kontakte werden geladen...</p>
        )}

        {!loading && contacts.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <Video className="h-12 w-12 text-white/30" />
            <p className="text-center text-white/60">
              Noch keine Kontakte für Videoanrufe eingerichtet.
            </p>
          </div>
        )}

        {contacts.map((contact) => (
          <KioskContactCard
            key={contact.id}
            name={contact.caregiver_name}
            avatar={contact.caregiver_avatar}
            isOnline={contact.is_online}
            autoAnswerInfo={formatAutoAnswerInfo(contact)}
            onCall={() => handleCall(contact.caregiver_id)}
          />
        ))}
      </div>
    </div>
  );
}

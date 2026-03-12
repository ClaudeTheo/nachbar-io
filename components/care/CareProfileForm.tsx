'use client';

// Pflege-Profil Formular: Pflegestufe, Check-in-Zeiten, Notfallkontakte, Eskalation, medizinische Hinweise

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X, Save, Loader2 } from 'lucide-react';
import { useCareProfile } from '@/lib/care/hooks/useCareProfile';
import { DEFAULT_ESCALATION_CONFIG } from '@/lib/care/constants';
import type { CareLevel, EmergencyContact, EscalationConfig } from '@/lib/care/types';

// Lokale UI-Konstanten
const CARE_LEVEL_OPTIONS: Array<{ value: CareLevel; label: string }> = [
  { value: 'none', label: 'Keine Pflegestufe' },
  { value: '1', label: 'Pflegegrad 1' },
  { value: '2', label: 'Pflegegrad 2' },
  { value: '3', label: 'Pflegegrad 3' },
  { value: '4', label: 'Pflegegrad 4' },
  { value: '5', label: 'Pflegegrad 5' },
];

const CONTACT_ROLE_OPTIONS = [
  { value: 'relative', label: 'Angehoerige/r' },
  { value: 'care_service', label: 'Pflegedienst' },
  { value: 'neighbor', label: 'Nachbar/in' },
  { value: 'other', label: 'Sonstiges' },
] as const;

// Leerer Kontakt als Vorlage
function emptyContact(): EmergencyContact {
  return {
    name: '',
    phone_encrypted: '',
    role: 'relative',
    priority: 1,
    relationship: '',
  };
}

interface CareProfileFormProps {
  userId: string;
  onSuccess?: () => void;
}

export function CareProfileForm({ userId, onSuccess }: CareProfileFormProps) {
  const { profile, loading: profileLoading } = useCareProfile(userId);

  // Formular-State
  const [careLevel, setCareLevel] = useState<CareLevel>('none');
  const [checkinEnabled, setCheckinEnabled] = useState(true);
  const [checkinTimes, setCheckinTimes] = useState<string[]>(['08:00', '20:00']);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [escalation, setEscalation] = useState<EscalationConfig>({ ...DEFAULT_ESCALATION_CONFIG });
  const [medicalNotes, setMedicalNotes] = useState('');
  const [preferredHospital, setPreferredHospital] = useState('');

  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Formular mit vorhandenen Daten befuellen
  useEffect(() => {
    if (profile && !initialized) {
      setCareLevel(profile.care_level);
      setCheckinEnabled(profile.checkin_enabled);
      setCheckinTimes(profile.checkin_times.length > 0 ? profile.checkin_times : ['08:00', '20:00']);
      setContacts(profile.emergency_contacts.length > 0 ? profile.emergency_contacts : []);
      setEscalation(profile.escalation_config);
      setMedicalNotes(profile.medical_notes ?? '');
      setPreferredHospital(profile.preferred_hospital ?? '');
      setInitialized(true);
    } else if (!profile && !profileLoading && !initialized) {
      // Kein Profil vorhanden, Defaults belassen
      setInitialized(true);
    }
  }, [profile, profileLoading, initialized]);

  // Check-in-Zeiten verwalten
  function addCheckinTime() {
    setCheckinTimes([...checkinTimes, '12:00']);
  }
  function removeCheckinTime(index: number) {
    setCheckinTimes(checkinTimes.filter((_, i) => i !== index));
  }
  function updateCheckinTime(index: number, value: string) {
    const updated = [...checkinTimes];
    updated[index] = value;
    setCheckinTimes(updated);
  }

  // Notfallkontakte verwalten
  function addContact() {
    setContacts([...contacts, emptyContact()]);
  }
  function removeContact(index: number) {
    setContacts(contacts.filter((_, i) => i !== index));
  }
  function updateContact(index: number, field: keyof EmergencyContact, value: string | number) {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  }

  // Speichern
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/care/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          care_level: careLevel,
          checkin_enabled: checkinEnabled,
          checkin_times: checkinTimes,
          emergency_contacts: contacts.filter((c) => c.name.trim() !== ''),
          escalation_config: escalation,
          medical_notes: medicalNotes || null,
          preferred_hospital: preferredHospital || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Profil konnte nicht gespeichert werden');
        setSaving(false);
        return;
      }

      toast.success('Pflege-Profil gespeichert');
      if (onSuccess) onSuccess();
    } catch {
      toast.error('Verbindungsfehler');
    }
    setSaving(false);
  }

  if (profileLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Pflegestufe */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Pflegegrad</h2>
        <select
          value={careLevel}
          onChange={(e) => setCareLevel(e.target.value as CareLevel)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        >
          {CARE_LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </section>

      {/* Check-in Einstellungen */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Taeglicher Check-in</h2>

        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={checkinEnabled}
            onChange={(e) => setCheckinEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-quartier-green focus:ring-quartier-green"
          />
          <span className="text-sm text-anthrazit">Check-in-Erinnerungen aktivieren</span>
        </label>

        {checkinEnabled && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Zu diesen Uhrzeiten werden Sie an Ihren Check-in erinnert:</p>
            {checkinTimes.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => updateCheckinTime(index, e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
                />
                {checkinTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCheckinTime(index)}
                    className="rounded-lg p-2 text-muted-foreground hover:text-emergency-red hover:bg-emergency-red/10 transition-colors"
                    aria-label="Uhrzeit entfernen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addCheckinTime}
              className="flex items-center gap-1 text-sm text-quartier-green hover:underline"
            >
              <Plus className="h-4 w-4" />
              Uhrzeit hinzufuegen
            </button>
          </div>
        )}
      </section>

      {/* Notfallkontakte */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Notfallkontakte</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Diese Personen werden im Notfall kontaktiert, sortiert nach Prioritaet.
        </p>

        {contacts.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
            <p className="text-muted-foreground text-sm">Noch keine Notfallkontakte hinterlegt.</p>
          </div>
        )}

        <div className="space-y-4">
          {contacts.map((contact, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-anthrazit">Kontakt {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeContact(index)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-emergency-red hover:bg-emergency-red/10 transition-colors"
                  aria-label="Kontakt entfernen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Name *"
                  value={contact.name}
                  onChange={(e) => updateContact(index, 'name', e.target.value)}
                  className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
                  required
                />
                <input
                  type="tel"
                  placeholder="Telefonnummer *"
                  value={contact.phone_encrypted}
                  onChange={(e) => updateContact(index, 'phone_encrypted', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
                  required
                />
                <select
                  value={contact.role}
                  onChange={(e) => updateContact(index, 'role', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
                >
                  {CONTACT_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Beziehung (z.B. Tochter)"
                  value={contact.relationship}
                  onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Prioritaet:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={contact.priority}
                    onChange={(e) => updateContact(index, 'priority', parseInt(e.target.value) || 1)}
                    className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm text-center text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addContact}
          className="mt-3 flex items-center gap-1 text-sm text-quartier-green hover:underline"
        >
          <Plus className="h-4 w-4" />
          Kontakt hinzufuegen
        </button>
      </section>

      {/* Eskalation */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Eskalationsstufen</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Nach wie vielen Minuten ohne Reaktion wird die naechste Stufe benachrichtigt?
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-anthrazit w-40">Stufe 2 (Angehoerige):</label>
            <input
              type="number"
              min={1}
              max={120}
              value={escalation.escalate_to_level_2_after_minutes}
              onChange={(e) => setEscalation({ ...escalation, escalate_to_level_2_after_minutes: parseInt(e.target.value) || 5 })}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            />
            <span className="text-sm text-muted-foreground">Min.</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-anthrazit w-40">Stufe 3 (Pflegedienst):</label>
            <input
              type="number"
              min={1}
              max={120}
              value={escalation.escalate_to_level_3_after_minutes}
              onChange={(e) => setEscalation({ ...escalation, escalate_to_level_3_after_minutes: parseInt(e.target.value) || 15 })}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            />
            <span className="text-sm text-muted-foreground">Min.</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-anthrazit w-40">Stufe 4 (Leitstelle):</label>
            <input
              type="number"
              min={1}
              max={120}
              value={escalation.escalate_to_level_4_after_minutes}
              onChange={(e) => setEscalation({ ...escalation, escalate_to_level_4_after_minutes: parseInt(e.target.value) || 30 })}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            />
            <span className="text-sm text-muted-foreground">Min.</span>
          </div>
        </div>
      </section>

      {/* Medizinische Hinweise */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Medizinische Hinweise</h2>
        <textarea
          value={medicalNotes}
          onChange={(e) => setMedicalNotes(e.target.value)}
          placeholder="z.B. Allergien, Vorerkrankungen, besondere Hinweise fuer Helfer..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
          rows={3}
        />
        <input
          type="text"
          value={preferredHospital}
          onChange={(e) => setPreferredHospital(e.target.value)}
          placeholder="Bevorzugtes Krankenhaus (optional)"
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        />
      </section>

      {/* DSGVO-Hinweis */}
      <div className="rounded-xl bg-quartier-green/10 p-4 text-sm text-anthrazit">
        <p className="font-medium">Datenschutz</p>
        <p className="mt-1 text-muted-foreground">
          Ihre medizinischen Daten und Kontaktnummern werden verschluesselt gespeichert (AES-256).
          Nur Sie, Ihre zugewiesenen Helfer und Administratoren haben Zugriff.
        </p>
      </div>

      {/* Speichern */}
      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-quartier-green px-6 py-3 text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ minHeight: '48px' }}
      >
        {saving ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Wird gespeichert...
          </>
        ) : (
          <>
            <Save className="h-5 w-5" />
            Profil speichern
          </>
        )}
      </button>
    </form>
  );
}

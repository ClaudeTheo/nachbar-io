// app/(app)/care/consultations/page.tsx
// Patienten-Terminuebersicht mit Verhandlungsaktionen
'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { AppointmentCard } from '@/components/consultation/AppointmentCard';
import { CounterProposeModal } from '@/components/consultation/CounterProposeModal';
import { ConsultationSlotCard } from '@/components/care/ConsultationSlotCard';
import { createClient } from '@/lib/supabase/client';
import type { ConsultationSlot } from '@/lib/care/types';
import type { AppointmentAction } from '@/lib/consultation/appointment-status';
import { useAuth } from '@/hooks/use-auth';

type TabKey = 'open' | 'confirmed' | 'past';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'open', label: 'Offene Vorschläge' },
  { key: 'confirmed', label: 'Bestätigt' },
  { key: 'past', label: 'Vergangene' },
];

export default function ConsultationsPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<ConsultationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('open');
  const [counterSlotId, setCounterSlotId] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    // Alle Termine laden, bei denen der Nutzer Patient ist oder gebucht hat
    const { data } = await supabase
      .from('consultation_slots')
      .select('*')
      .or(`booked_by.eq.${user.id},patient_id.eq.${user.id}`)
      .order('scheduled_at', { ascending: false });

    if (data) setSlots(data as unknown as ConsultationSlot[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // Initiales Laden — setState in async Callback ist gewollt
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSlots();
  }, [loadSlots]);

  // Gefilterte Slots nach Tab
  const openSlots = slots.filter(s =>
    s.status === 'proposed' || s.status === 'counter_proposed'
  );
  const confirmedSlots = slots.filter(s =>
    s.status === 'confirmed' || s.status === 'active'
  );
  const pastSlots = slots.filter(s =>
    s.status === 'completed' || s.status === 'declined' || s.status === 'cancelled'
  );
  // Bestehende Community-Slots (scheduled/waiting/active ohne Verhandlung)
  const communitySlots = slots.filter(s =>
    (s.status === 'scheduled' || s.status === 'waiting') && !s.proposed_by
  );

  const displayedSlots = activeTab === 'open' ? openSlots
    : activeTab === 'confirmed' ? confirmedSlots
    : pastSlots;

  // Aktion ausfuehren (confirm, decline, cancel)
  async function handleAction(slotId: string, action: AppointmentAction) {
    const res = await fetch(`/api/care/consultations/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? 'Aktion fehlgeschlagen');
      return;
    }
    // Slots neu laden
    await loadSlots();
  }

  // Gegenvorschlag senden
  async function handleCounterPropose(slotId: string, scheduledAt: string) {
    const res = await fetch(`/api/care/consultations/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'counter_propose', scheduled_at: scheduledAt }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Gegenvorschlag fehlgeschlagen');
    }
    await loadSlots();
  }

  function handleJoin(slotId: string) {
    const slot = slots.find(s => s.id === slotId);
    if (slot?.join_url) {
      window.open(slot.join_url, '_blank');
    }
  }

  async function handleBook(slotId: string) {
    try {
      const res = await fetch(`/api/care/consultations/${slotId}/book`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Buchung fehlgeschlagen');
        return;
      }
      await loadSlots();
    } catch {
      alert('Buchung fehlgeschlagen');
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Meine Termine"
        backHref="/care"
      />

      {loading && <p className="text-anthrazit/50">Laden...</p>}

      {/* Tabs */}
      {!loading && (
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {TABS.map((tab) => {
            const count = tab.key === 'open' ? openSlots.length
              : tab.key === 'confirmed' ? confirmedSlots.length
              : pastSlots.length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-anthrazit shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs font-bold ${
                    activeTab === tab.key ? 'bg-quartier-green text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Verhandlungs-Termine (AppointmentCard) */}
      {displayedSlots.length > 0 && (
        <div className="space-y-3">
          {displayedSlots.map(slot => (
            <AppointmentCard
              key={slot.id}
              slot={slot}
              actorRole="patient"
              onAction={handleAction}
              onCounterPropose={(id) => setCounterSlotId(id)}
            />
          ))}
        </div>
      )}

      {/* Community-Slots (bestehende Quartierslotse-Termine) — nur in "Bestätigt" Tab */}
      {activeTab === 'confirmed' && communitySlots.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-anthrazit mb-3">Quartiers-Sprechstunden</h2>
          <div className="space-y-3">
            {communitySlots.map(slot => (
              <ConsultationSlotCard
                key={slot.id}
                slot={slot}
                onBook={() => handleBook(slot.id)}
                onJoin={() => handleJoin(slot.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Leerzustand */}
      {!loading && displayedSlots.length === 0 && (activeTab !== 'confirmed' || communitySlots.length === 0) && (
        <div className="rounded-2xl bg-anthrazit/5 p-8 text-center">
          <p className="text-xl text-anthrazit/60">
            {activeTab === 'open' ? 'Keine offenen Vorschläge' :
             activeTab === 'confirmed' ? 'Keine bestätigten Termine' :
             'Keine vergangenen Termine'}
          </p>
          {activeTab === 'open' && (
            <p className="text-anthrazit/40 mt-2">
              Terminvorschläge von Ärzten erscheinen hier
            </p>
          )}
        </div>
      )}

      {/* Gegenvorschlag-Modal */}
      <CounterProposeModal
        open={counterSlotId !== null}
        slotId={counterSlotId ?? ''}
        onClose={() => setCounterSlotId(null)}
        onSubmit={handleCounterPropose}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CARE_SOS_CATEGORIES } from '@/lib/care/constants';
import { EmergencyBanner } from '@/components/EmergencyBanner';
import type { CareSosCategory } from '@/lib/care/types';

interface SosCategoryPickerProps {
  source?: 'app' | 'device';
  onSosCreated?: (alertId: string) => void;
}

export function SosCategoryPicker({ source = 'app', onSosCreated }: SosCategoryPickerProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CareSosCategory | null>(null);
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function triggerSos(category: CareSosCategory) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/care/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, source }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'SOS konnte nicht gesendet werden');
        setLoading(false);
        return;
      }
      const alert = await res.json();
      if (onSosCreated) {
        onSosCreated(alert.id);
      } else {
        const statusPath = source === 'device' ? `/sos/status?id=${alert.id}` : `/care/sos/${alert.id}`;
        router.push(statusPath);
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    }
    setLoading(false);
  }

  function handleCategorySelect(category: CareSosCategory) {
    setSelectedCategory(category);
    const cat = CARE_SOS_CATEGORIES.find((c) => c.id === category);
    if (cat?.isEmergency) {
      setShowEmergencyBanner(true);
    } else {
      triggerSos(category);
    }
  }

  function handleEmergencyAcknowledge() {
    setShowEmergencyBanner(false);
    if (selectedCategory) {
      triggerSos(selectedCategory);
    }
  }

  return (
    <>
      {showEmergencyBanner && (
        <EmergencyBanner onAcknowledge={handleEmergencyAcknowledge} />
      )}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-anthrazit text-center mb-4">
          Was brauchen Sie?
        </h2>
        {error && (
          <div className="rounded-lg bg-emergency-red/10 p-3 text-sm text-emergency-red text-center">
            {error}
          </div>
        )}
        {CARE_SOS_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.id)}
            disabled={loading}
            className={`w-full rounded-xl border-2 p-5 text-left transition-colors
              ${cat.isEmergency ? 'border-emergency-red bg-red-50 hover:bg-red-100' : 'border-gray-200 bg-white hover:bg-gray-50'}
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            style={{ minHeight: '80px', touchAction: 'manipulation' }}
          >
            <span className="flex items-center gap-4">
              <span className="text-3xl" role="img" aria-hidden="true">{cat.icon}</span>
              <span>
                <span className={`block text-lg font-bold ${cat.isEmergency ? 'text-emergency-red' : 'text-anthrazit'}`}>
                  {cat.label}
                </span>
                <span className="block text-sm text-muted-foreground">{cat.description}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

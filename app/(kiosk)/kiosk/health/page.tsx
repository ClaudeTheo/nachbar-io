'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { HEALTH_TIPS, CATEGORY_EMOJIS, CATEGORY_LABELS, type HealthTip } from '../data/health-tips';

const CATEGORIES: Array<{ key: HealthTip['category'] | 'alle'; label: string }> = [
  { key: 'alle', label: 'Alle' },
  { key: 'bewegung', label: 'Bewegung' },
  { key: 'ernaehrung', label: 'Ernährung' },
  { key: 'schlaf', label: 'Schlaf' },
  { key: 'soziales', label: 'Soziales' },
  { key: 'vorsorge', label: 'Vorsorge' },
  { key: 'mental', label: 'Mental' },
];

/** Tipp des Tages: basierend auf dem Tag im Jahr */
function getTipOfTheDay(): HealthTip {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return HEALTH_TIPS[dayOfYear % HEALTH_TIPS.length];
}

export default function KioskHealthPage() {
  const [filter, setFilter] = useState<HealthTip['category'] | 'alle'>('alle');
  const tipOfDay = useMemo(() => getTipOfTheDay(), []);

  const filteredTips = useMemo(() => {
    if (filter === 'alle') return HEALTH_TIPS;
    return HEALTH_TIPS.filter((t) => t.category === filter);
  }, [filter]);

  return (
    <div style={{ padding: '20px 28px', paddingBottom: '120px' }}>
      {/* Zurück-Button */}
      <Link href="/kiosk" className="kiosk-back" style={{ marginBottom: '20px' }}>
        ← Zurück
      </Link>

      <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '20px 0 24px' }}>
        💊 Gesundheitstipps
      </h1>

      {/* Tipp des Tages */}
      <div
        className="kiosk-card"
        style={{
          borderLeft: '4px solid #4caf87',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '14px', color: '#4caf87', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ⭐ Tipp des Tages
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px' }}>{CATEGORY_EMOJIS[tipOfDay.category]}</span>
          <span style={{ fontSize: '22px', fontWeight: 700 }}>{tipOfDay.title}</span>
        </div>
        <p style={{ fontSize: '18px', lineHeight: 1.6, color: '#4b5563', margin: 0 }}>
          {tipOfDay.body}
        </p>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '12px' }}>
          Quelle: {tipOfDay.source}
        </div>
      </div>

      {/* Kategorie-Filter */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '20px',
          WebkitOverflowScrolling: 'touch',
        }}
        className="kiosk-scroll"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className="kiosk-chip"
            onClick={() => setFilter(cat.key)}
            style={{
              background: filter === cat.key
                ? 'rgba(76, 175, 135, 0.25)'
                : undefined,
              borderColor: filter === cat.key
                ? 'rgba(76, 175, 135, 0.5)'
                : undefined,
              color: filter === cat.key
                ? '#4caf87'
                : undefined,
              minHeight: '48px',
            }}
          >
            {cat.key !== 'alle' && CATEGORY_EMOJIS[cat.key as HealthTip['category']]}{' '}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tipp-Liste */}
      <div
        className="kiosk-scroll"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: 'calc(100vh - 400px)',
          overflowY: 'auto',
        }}
      >
        {filteredTips.map((tip) => (
          <div key={tip.id} className="kiosk-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>{CATEGORY_EMOJIS[tip.category]}</span>
              <span style={{ fontSize: '20px', fontWeight: 700 }}>{tip.title}</span>
            </div>
            <p style={{ fontSize: '17px', lineHeight: 1.6, color: '#4b5563', margin: '0 0 10px' }}>
              {tip.body}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '13px',
                  background: 'white',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  color: '#6b7280',
                }}
              >
                {CATEGORY_LABELS[tip.category]}
              </span>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                Quelle: {tip.source}
              </span>
              {tip.season && (
                <span
                  style={{
                    fontSize: '13px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    color: '#f59e0b',
                  }}
                >
                  {tip.season === 'fruehling' && '🌸 Frühling'}
                  {tip.season === 'sommer' && '☀️ Sommer'}
                  {tip.season === 'herbst' && '🍂 Herbst'}
                  {tip.season === 'winter' && '❄️ Winter'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

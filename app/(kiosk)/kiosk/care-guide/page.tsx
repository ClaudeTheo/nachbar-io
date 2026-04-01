'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PFLEGEGRADE, PFLEGE_KONTAKTE, PFLEGE_FAQ } from '../data/care-guide';

type Tab = 'pflegegrade' | 'kontakte' | 'faq';

export default function KioskCareGuidePage() {
  const [activeTab, setActiveTab] = useState<Tab>('pflegegrade');
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  const toggleFaq = (id: number) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ padding: '20px 28px', paddingBottom: '120px' }}>
      {/* Zurück-Button */}
      <Link href="/kiosk" className="kiosk-back" style={{ marginBottom: '20px' }}>
        ← Zurück
      </Link>

      <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '20px 0 24px' }}>
        🏥 Pflege-Ratgeber
      </h1>

      {/* Tab-Leiste */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          className="kiosk-chip"
          onClick={() => setActiveTab('pflegegrade')}
          style={{
            background: activeTab === 'pflegegrade' ? 'rgba(96, 165, 250, 0.25)' : undefined,
            borderColor: activeTab === 'pflegegrade' ? 'rgba(96, 165, 250, 0.5)' : undefined,
            color: activeTab === 'pflegegrade' ? '#60a5fa' : undefined,
            minHeight: '56px',
            fontSize: '18px',
          }}
        >
          📋 Pflegegrade
        </button>
        <button
          className="kiosk-chip"
          onClick={() => setActiveTab('kontakte')}
          style={{
            background: activeTab === 'kontakte' ? 'rgba(96, 165, 250, 0.25)' : undefined,
            borderColor: activeTab === 'kontakte' ? 'rgba(96, 165, 250, 0.5)' : undefined,
            color: activeTab === 'kontakte' ? '#60a5fa' : undefined,
            minHeight: '56px',
            fontSize: '18px',
          }}
        >
          📞 Wichtige Kontakte
        </button>
        <button
          className="kiosk-chip"
          onClick={() => setActiveTab('faq')}
          style={{
            background: activeTab === 'faq' ? 'rgba(96, 165, 250, 0.25)' : undefined,
            borderColor: activeTab === 'faq' ? 'rgba(96, 165, 250, 0.5)' : undefined,
            color: activeTab === 'faq' ? '#60a5fa' : undefined,
            minHeight: '56px',
            fontSize: '18px',
          }}
        >
          ❓ Häufige Fragen
        </button>
      </div>

      {/* Tab-Inhalt */}
      <div
        className="kiosk-scroll"
        style={{
          maxHeight: 'calc(100vh - 320px)',
          overflowY: 'auto',
        }}
      >
        {/* === Pflegegrade === */}
        {activeTab === 'pflegegrade' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {PFLEGEGRADE.map((pg) => (
              <div key={pg.grad} className="kiosk-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(96, 165, 250, 0.2)',
                      border: '2px solid rgba(96, 165, 250, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#60a5fa',
                      flexShrink: 0,
                    }}
                  >
                    {pg.grad}
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>Pflegegrad {pg.grad}</div>
                    <div style={{ fontSize: '16px', color: '#6b7280' }}>{pg.title}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      background: 'rgba(76, 175, 135, 0.12)',
                      border: '1px solid rgba(76, 175, 135, 0.25)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      flex: 1,
                      minWidth: '140px',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#4caf87', fontWeight: 600, marginBottom: '4px' }}>
                      Pflegegeld
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>{pg.pflegegeld}</div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(139, 92, 246, 0.12)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      flex: 1,
                      minWidth: '140px',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#a78bfa', fontWeight: 600, marginBottom: '4px' }}>
                      Sachleistung
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>{pg.sachleistung}</div>
                  </div>
                </div>

                <p style={{ fontSize: '16px', lineHeight: 1.6, color: '#4b5563', margin: 0 }}>
                  {pg.beschreibung}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* === Kontakte === */}
        {activeTab === 'kontakte' && (
          <div className="kiosk-card" style={{ padding: 0 }}>
            {PFLEGE_KONTAKTE.map((kontakt, i) => (
              <div key={i} className="kiosk-info-item" style={{ flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '19px', fontWeight: 700 }}>{kontakt.name}</div>
                <div style={{ fontSize: '16px', color: '#6b7280' }}>
                  {kontakt.beschreibung}
                </div>
                <a
                  href={`tel:${kontakt.telefon.replace(/[\s/]/g, '')}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(76, 175, 135, 0.15)',
                    border: '1px solid rgba(76, 175, 135, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    color: '#4caf87',
                    fontSize: '18px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    marginTop: '4px',
                    minHeight: '48px',
                  }}
                >
                  📞 {kontakt.telefon}
                </a>
              </div>
            ))}
          </div>
        )}

        {/* === FAQ === */}
        {activeTab === 'faq' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {PFLEGE_FAQ.map((faq) => (
              <div
                key={faq.id}
                className="kiosk-card"
                onClick={() => toggleFaq(faq.id)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ fontSize: '19px', fontWeight: 700, flex: 1 }}>
                    {faq.frage}
                  </div>
                  <span
                    style={{
                      fontSize: '24px',
                      color: '#6b7280',
                      transition: 'transform 0.2s ease',
                      transform: openFaqId === faq.id ? 'rotate(180deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ▼
                  </span>
                </div>
                {openFaqId === faq.id && (
                  <p
                    style={{
                      fontSize: '17px',
                      lineHeight: 1.7,
                      color: '#4b5563',
                      margin: '14px 0 0',
                      paddingTop: '14px',
                      borderTop: '1px solid #e8ede3',
                    }}
                  >
                    {faq.antwort}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

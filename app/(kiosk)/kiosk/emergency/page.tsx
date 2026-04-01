'use client';

import Link from 'next/link';

export default function KioskEmergencyPage() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(127, 29, 29, 0.95)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        padding: '28px',
        gap: '24px',
      }}
    >
      {/* Notfall-Banner */}
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.3)',
          border: '2px solid #ef4444',
          borderRadius: '16px',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '22px',
          fontWeight: 700,
          color: '#fecaca',
        }}
      >
        Im Notfall IMMER zuerst 112 anrufen!
      </div>

      {/* 112 Notruf-Button */}
      <a
        href="tel:112"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px',
          width: '100%',
          background: '#ffffff',
          color: '#000000',
          fontSize: '32px',
          fontWeight: 800,
          borderRadius: '20px',
          textDecoration: 'none',
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '0.5px',
        }}
      >
        112 — Notruf
      </a>

      {/* Adresse für Rettungsdienst */}
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px 24px',
          textAlign: 'center',
          fontSize: '20px',
          color: '#fecaca',
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>
          Standort für den Rettungsdienst:
        </div>
        <div style={{ fontWeight: 600 }}>
          Purkersdorfer Straße / Sanarystraße
        </div>
        <div>
          79713 Bad Säckingen
        </div>
      </div>

      {/* Angehörige anrufen */}
      <button
        onClick={() => {
          // Platzhalter — später mit echten Kontakten
        }}
        style={{
          minHeight: '80px',
          width: '100%',
          background: 'transparent',
          border: '2px solid #6b7280',
          borderRadius: '16px',
          color: '#ffffff',
          fontSize: '22px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Angehörige anrufen
      </button>

      {/* Abbrechen */}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
        <Link
          href="/kiosk"
          className="kiosk-back"
          style={{
            color: '#ffffff',
            borderColor: '#6b7280',
            minHeight: '80px',
            fontSize: '20px',
            padding: '16px 32px',
          }}
        >
          ← Abbrechen
        </Link>
      </div>
    </div>
  );
}

// components/care/CareConsentGate.tsx
// Gate-Komponente: Prüft Art. 9 Einwilligung vor Care-Modul-Zugriff
'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import type { CareConsentFeature } from '@/lib/care/types';

interface ConsentState {
  consents: Record<CareConsentFeature, { granted: boolean; granted_at: string | null; consent_version: string }>;
  hasFeatureConsent: (feature: CareConsentFeature) => boolean;
}

const CareConsentContext = createContext<ConsentState | null>(null);

export function useCareConsent() {
  const ctx = useContext(CareConsentContext);
  if (!ctx) throw new Error('useCareConsent muss innerhalb von CareConsentGate verwendet werden');
  return ctx;
}

export function CareConsentGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [consentState, setConsentState] = useState<ConsentState | null>(null);

  useEffect(() => {
    async function checkConsents() {
      try {
        const res = await fetch('/api/care/consent');
        if (!res.ok) {
          router.push('/care/consent');
          return;
        }
        const data = await res.json();
        if (!data.has_any_consent) {
          router.push('/care/consent');
          return;
        }
        setConsentState({
          consents: data.consents,
          hasFeatureConsent: (feature: CareConsentFeature) =>
            data.consents[feature]?.granted === true,
        });
      } catch {
        router.push('/care/consent');
      } finally {
        setLoading(false);
      }
    }
    checkConsents();
  }, [router]);

  if (loading || !consentState) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <CareConsentContext.Provider value={consentState}>
      {children}
    </CareConsentContext.Provider>
  );
}

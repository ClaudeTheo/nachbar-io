// app/(app)/care/consent/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Info } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { ConsentFeatureCard } from '@/components/care/ConsentFeatureCard';
import { RevokeDialog } from '@/components/care/RevokeDialog';
import { CARE_CONSENT_FEATURES, CARE_CONSENT_LABELS, CARE_CONSENT_DESCRIPTIONS } from '@/lib/care/constants';
import type { CareConsentFeature } from '@/lib/care/types';
import { CONSENT_DEPENDENCIES } from '@/lib/care/types';

interface ConsentState {
  granted: boolean;
  granted_at: string | null;
  consent_version: string;
}

export default function CareConsentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consents, setConsents] = useState<Record<CareConsentFeature, ConsentState> | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [pendingFeatures, setPendingFeatures] = useState<Record<string, boolean>>({});
  const [revokeFeature, setRevokeFeature] = useState<CareConsentFeature | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/care/consent');
        if (res.ok) {
          const data = await res.json();
          setConsents(data.consents);
          setIsFirstTime(!data.has_any_consent);
          if (!data.has_any_consent) {
            const initial: Record<string, boolean> = {};
            for (const f of CARE_CONSENT_FEATURES) {
              initial[f] = false;
            }
            setPendingFeatures(initial);
          }
        }
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, []);

  function handleFirstTimeToggle(feature: CareConsentFeature, value: boolean) {
    setPendingFeatures((prev) => {
      const next = { ...prev, [feature]: value };
      if (feature === 'sos' && !value) {
        next.emergency_contacts = false;
      }
      return next;
    });
  }

  async function handleSubmitConsents() {
    setSaving(true);
    try {
      const res = await fetch('/api/care/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: pendingFeatures }),
      });
      if (res.ok) {
        router.push('/care');
      }
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleManageToggle(feature: CareConsentFeature, value: boolean) {
    if (!value) {
      setRevokeFeature(feature);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/care/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: { [feature]: true } }),
      });
      if (res.ok) {
        const data = await res.json();
        setConsents(data.consents);
      }
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleRevoke(deleteData: boolean) {
    if (!revokeFeature) return;
    setSaving(true);
    try {
      await fetch('/api/care/consent/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: revokeFeature, delete_data: deleteData }),
      });
      const res = await fetch('/api/care/consent');
      if (res.ok) {
        const data = await res.json();
        setConsents(data.consents);
      }
    } catch { /* silent */ }
    setRevokeFeature(null);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const hasAnySelected = Object.values(pendingFeatures).some(Boolean);

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <PageHeader
        title={<><Shield className="h-6 w-6 text-quartier-green" /> Datenschutz-Einwilligungen</>}
        subtitle="Care-Modul — Gesundheitsdaten"
        backHref={isFirstTime ? '/' : '/care'}
      />

      <div className="rounded-2xl bg-quartier-green/10 border border-quartier-green/20 p-4 flex gap-3">
        <Info className="h-5 w-5 text-quartier-green flex-shrink-0 mt-0.5" />
        <div className="text-sm text-anthrazit/80">
          <p>
            Ihre Gesundheitsdaten (Art. 9 DSGVO) werden nur mit Ihrer ausdrücklichen
            Einwilligung verarbeitet. Sie können jede Einwilligung jederzeit widerrufen.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {CARE_CONSENT_FEATURES.map((feature) => {
          const granted = isFirstTime
            ? (pendingFeatures[feature] ?? false)
            : (consents?.[feature]?.granted ?? false);

          const dependency = CONSENT_DEPENDENCIES[feature];
          const dependencyMet = dependency
            ? isFirstTime
              ? (pendingFeatures[dependency] ?? false)
              : (consents?.[dependency]?.granted ?? false)
            : true;

          return (
            <ConsentFeatureCard
              key={feature}
              feature={feature}
              label={CARE_CONSENT_LABELS[feature]}
              description={CARE_CONSENT_DESCRIPTIONS[feature]}
              granted={granted}
              disabled={!dependencyMet || saving}
              onChange={isFirstTime ? handleFirstTimeToggle : handleManageToggle}
            />
          );
        })}
      </div>

      {isFirstTime && (
        <button
          onClick={handleSubmitConsents}
          disabled={!hasAnySelected || saving}
          className="w-full h-[80px] rounded-2xl bg-quartier-green text-white text-2xl font-bold disabled:opacity-40 active:scale-95"
          style={{ touchAction: 'manipulation' }}
        >
          {saving ? 'Wird gespeichert...' : 'Einwilligung erteilen'}
        </button>
      )}

      <div className="text-center">
        <Link href="/datenschutz" className="text-sm text-muted-foreground underline">
          Datenschutzerklärung lesen
        </Link>
      </div>

      {revokeFeature && (
        <RevokeDialog
          featureLabel={CARE_CONSENT_LABELS[revokeFeature]}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeFeature(null)}
        />
      )}
    </div>
  );
}

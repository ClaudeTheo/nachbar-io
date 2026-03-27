// components/FeatureGate.tsx
// Nachbar.io — DB-getriebene Feature-Gate UI-Komponente
// Zeigt children nur wenn das Feature-Flag in der DB aktiv ist.
'use client';

import type { ReactNode } from 'react';
import { useFeatureFlag } from '@/lib/feature-flags';
import type { UserContext } from '@/lib/feature-flags';
import { useUserRole } from '@/lib/quarters/hooks';
import { useSubscription } from '@/lib/care/hooks/useSubscription';

interface FeatureGateProps {
  /** Flag-Key, z.B. "BOARD_ENABLED" */
  feature: string;
  /** Wird gerendert wenn das Flag aktiv ist */
  children: ReactNode;
  /** Wird gerendert wenn das Flag inaktiv ist (Standard: null) */
  fallback?: ReactNode;
  /** Optionaler Quartier-ID Override (sonst nicht geprüft) */
  quarterId?: string;
}

/**
 * Rendert children nur wenn das DB-Feature-Flag für den aktuellen User aktiv ist.
 * Nutzt useUserRole und useSubscription um den UserContext zu ermitteln.
 */
export function FeatureGate({ feature, children, fallback = null, quarterId }: FeatureGateProps) {
  const { role } = useUserRole();
  const { subscription } = useSubscription();

  const userContext: UserContext = {
    role,
    plan: subscription?.plan ?? 'free',
    quarter_id: quarterId,
  };

  const isActive = useFeatureFlag(feature, userContext);

  if (isActive) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

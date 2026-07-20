// components/FeatureGate.tsx
// Nachbar.io — DB-getriebene Feature-Gate UI-Komponente
// Zeigt children nur wenn das Feature-Flag in der DB aktiv ist.
'use client';

import type { ReactNode } from 'react';
import { useFeatureFlag } from '@/lib/feature-flags';
import type { UserContext } from '@/lib/feature-flags';
import { useQuarter } from '@/lib/quarters';
import { useUserRole } from '@/lib/quarters/hooks';
import { useSubscription } from '@/lib/care/hooks/useSubscription';

interface FeatureGateProps {
  /** Flag-Key, z.B. "BOARD_ENABLED" */
  feature: string;
  /** Wird gerendert wenn das Flag aktiv ist */
  children: ReactNode;
  /** Wird gerendert wenn das Flag inaktiv ist (Standard: null) */
  fallback?: ReactNode;
}

/**
 * Rendert children nur wenn das DB-Feature-Flag für den aktuellen User aktiv ist.
 * Nutzt den bereits geladenen Quartier-, Rollen- und Abo-Kontext für die UI.
 */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { role } = useUserRole();
  const { currentQuarter } = useQuarter();
  const { subscription } = useSubscription();

  const userContext: UserContext = {
    role,
    plan: subscription?.plan ?? 'free',
    quarter_id: currentQuarter?.id,
  };

  const isActive = useFeatureFlag(feature, userContext);

  if (isActive) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

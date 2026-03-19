// components/youth/YouthGuard.tsx
// Jugend-Modul: Zugangs-Schutz nach Stufe
'use client';

import { ReactNode } from 'react';
import { useYouthProfile } from '@/lib/youth/hooks';
import type { AccessLevel } from '@/lib/youth/profile';

const LEVEL_HIERARCHY: Record<AccessLevel, number> = {
  basis: 0,
  erweitert: 1,
  freigeschaltet: 2,
};

interface YouthGuardProps {
  minLevel: AccessLevel;
  children: ReactNode;
  fallback?: ReactNode;
}

export function YouthGuard({ minLevel, children, fallback = null }: YouthGuardProps) {
  const { profile, loading } = useYouthProfile();

  if (loading) return null;
  if (!profile) return null;

  const hasAccess = LEVEL_HIERARCHY[profile.access_level] >= LEVEL_HIERARCHY[minLevel];

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

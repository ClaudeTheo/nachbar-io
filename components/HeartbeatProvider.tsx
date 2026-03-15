// components/HeartbeatProvider.tsx
'use client';

import { useHeartbeat } from '@/lib/care/hooks/useHeartbeat';

export function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useHeartbeat();
  return <>{children}</>;
}

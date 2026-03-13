// lib/care/hooks/useSubscription.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CareSubscription, CareSubscriptionPlan } from '../types';

/**
 * Laedt und verwaltet das Abo des aktuellen Users.
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<CareSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/care/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
  useEffect(() => { load(); }, [load]);

  /** Plan aendern */
  const changePlan = useCallback(async (plan: CareSubscriptionPlan) => {
    try {
      const res = await fetch('/api/care/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        return true;
      }
    } catch { /* silent */ }
    return false;
  }, []);

  /** Abo kuendigen */
  const cancelSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/care/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        return true;
      }
    } catch { /* silent */ }
    return false;
  }, []);

  /** Abo reaktivieren */
  const reactivate = useCallback(async () => {
    try {
      const res = await fetch('/api/care/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        return true;
      }
    } catch { /* silent */ }
    return false;
  }, []);

  return { subscription, loading, refetch: load, changePlan, cancelSubscription, reactivate };
}

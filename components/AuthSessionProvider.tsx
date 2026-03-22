'use client';

// components/AuthSessionProvider.tsx
// Stellt sicher, dass die Supabase-Session nach Kaltstart wiederhergestellt wird.
// Lauscht auf Auth-Events und synchronisiert Cookie ↔ localStorage.

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { invalidateUserCache } from '@/lib/supabase/cached-auth';

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isInitialMount = useRef(true);

  useEffect(() => {
    const supabase = createClient();

    // Session beim Start proaktiv wiederherstellen
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Kein gueltige Session — Redirect nur wenn auf geschuetzter Route
        const path = window.location.pathname;
        const publicPaths = ['/', '/login', '/register', '/auth/callback', '/impressum', '/datenschutz', '/agb'];
        if (!publicPaths.some(p => path === p || path.startsWith('/auth/'))) {
          router.replace('/login');
        }
      }
    });

    // Auf Auth-Aenderungen lauschen (Token Refresh, Sign Out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        invalidateUserCache();
        router.replace('/login');
      }

      if (event === 'TOKEN_REFRESHED') {
        // Token wurde erneuert — Router aktualisieren damit
        // Server-Seite die neuen Cookies bekommt
        invalidateUserCache();
        router.refresh();
      }

      if (event === 'SIGNED_IN') {
        invalidateUserCache();
        // Beim initialen Mount feuert SIGNED_IN wenn eine bestehende
        // Session erkannt wird — router.refresh() wuerde eine Endlosschleife
        // ausloesen (refresh → neuer Mount → SIGNED_IN → refresh → ...)
        if (!isInitialMount.current) {
          router.refresh();
        }
        isInitialMount.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}

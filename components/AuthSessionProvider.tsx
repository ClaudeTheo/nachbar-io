'use client';

// components/AuthSessionProvider.tsx
// Stellt sicher, dass die Supabase-Session nach Kaltstart wiederhergestellt wird.
// Lauscht auf Auth-Events und synchronisiert Cookie ↔ localStorage.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        // Session erfolgreich erneuert — Router aktualisieren damit
        // Server-Seite die neuen Cookies bekommt
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}

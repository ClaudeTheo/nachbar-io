'use client'

// Zentraler AuthProvider — stellt den aktuellen Supabase-User per Context bereit.
// Nutzt onAuthStateChange fuer reaktive Updates (Login, Logout, Token-Refresh).
// Initiales Laden per getSession() (lokal, kein API-Call — Middleware validiert bereits mit getUser()).
// refreshUser() nutzt getUser() fuer explizite Server-Validierung (z.B. nach Profil-Update).

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  /** Aktueller User oder null wenn nicht eingeloggt */
  user: User | null
  /** True waehrend der initiale Auth-Check laeuft */
  loading: boolean
  /** User manuell neu laden (z.B. nach Profil-Update) */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
})

// Throttle: getUser() maximal alle 30 Sekunden aufrufen (schuetzt vor HMR-Spam)
const REFRESH_THROTTLE_MS = 30_000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const lastRefreshRef = useRef(0)

  const refreshUser = useCallback(async () => {
    const now = Date.now()
    if (now - lastRefreshRef.current < REFRESH_THROTTLE_MS) return
    lastRefreshRef.current = now

    const supabase = createClient()
    const { data: { user: freshUser } } = await supabase.auth.getUser()
    setUser(freshUser)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Initialer Auth-Check per getSession() — liest aus lokalem Cookie, kein API-Call.
    // Middleware validiert bereits mit getUser() auf jedem Server-Request.
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Reaktiv auf Auth-Aenderungen lauschen
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Hook fuer Zugriff auf den Auth-Context */
export const useAuth = () => useContext(AuthContext)

'use client'

// Zentraler AuthProvider — stellt den aktuellen Supabase-User per Context bereit.
// Nutzt onAuthStateChange fuer reaktive Updates (Login, Logout, Token-Refresh).
// Initiales Laden per getUser() (Server-validiert, sicherer als getSession()).

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: freshUser } } = await supabase.auth.getUser()
    setUser(freshUser)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Initialer Auth-Check
    refreshUser()

    // Reaktiv auf Auth-Aenderungen lauschen
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Hook fuer Zugriff auf den Auth-Context */
export const useAuth = () => useContext(AuthContext)

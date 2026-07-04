import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Database } from '../types/database'

type ProfileRole = Database['public']['Tables']['profiles']['Row']['role']

interface AuthContextValue {
  user: User | null
  session: Session | null
  role: ProfileRole | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<ProfileRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function applySession(newSession: Session | null) {
      setSession(newSession)
      if (!newSession) {
        setRole(null)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', newSession.user.id)
        .maybeSingle()
      setRole(profile?.role ?? null)
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session).finally(() => setLoading(false))
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession).finally(() => setLoading(false))
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return context
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Database } from '../types/database'

type ProfileRole = Database['public']['Tables']['profiles']['Row']['role']

interface AuthContextValue {
  user: User | null
  session: Session | null
  role: ProfileRole | null
  avatarUrl: string | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<ProfileRole | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function applySession(newSession: Session | null) {
      setSession(newSession)
      if (!newSession) {
        setRole(null)
        setAvatarUrl(null)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, avatar_url')
        .eq('id', newSession.user.id)
        .maybeSingle()
      setRole(profile?.role ?? null)
      setAvatarUrl(profile?.avatar_url ?? null)
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session).finally(() => setLoading(false))
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession).finally(() => setLoading(false))
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  // Re-lee role/avatar_url de profiles sin esperar a un cambio de sesión — la usa
  // Perfil.tsx después de subir una foto nueva, para que el avatar del header se
  // actualice al instante en vez de quedar desfasado hasta el próximo login.
  async function refreshProfile() {
    if (!session) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
    setRole(profile?.role ?? null)
    setAvatarUrl(profile?.avatar_url ?? null)
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, role, avatarUrl, loading, refreshProfile }}>
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

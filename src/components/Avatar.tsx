import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function getInitials(email: string | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0]
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export function Avatar({ size = 'sm', active = false }: { size?: 'sm' | 'lg'; active?: boolean }) {
  const { user, avatarUrl } = useAuth()
  const dimensions = size === 'lg' ? 'w-16 h-16 text-[18px]' : 'w-8 h-8 text-[11px]'

  return (
    <Link
      to="/perfil"
      aria-label="Ir a tu perfil"
      className={`shrink-0 ${dimensions} rounded-full bg-panel-2 border overflow-hidden flex items-center justify-center font-mono text-signal transition-all duration-200 hover:border-signal/60 hover:shadow-glow ${
        active ? 'border-signal ring-2 ring-signal/40' : 'border-hairline'
      }`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        getInitials(user?.email)
      )}
    </Link>
  )
}

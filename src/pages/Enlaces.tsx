import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Smartphone } from 'lucide-react'

// Mismo archivo que ya sirve el botón de descarga de Landing.tsx — ver
// CLAUDE.md "PWA-to-APK". Único punto de verdad, no lo dupliques.
const APK_DOWNLOAD_URL = '/downloads/lineatrade.apk'
const INSTAGRAM_URL = 'https://www.instagram.com/linea.trade?igsh=MWc0d3RoMGFsdmI5Zw=='

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="0.55" fill="currentColor" stroke="none" />
    </svg>
  )
}

type TileProps = {
  icon: ReactNode
  label: string
  sublabel?: string
  emphasized?: boolean
  children: ReactNode
}

function LinkTile({ icon, label, sublabel, emphasized, children }: TileProps) {
  const base =
    'group flex w-full items-center gap-4 rounded-sm border px-5 py-4 text-left transition-all duration-200'
  const tone = emphasized
    ? 'border-signal/60 bg-signal/10 hover:bg-signal/15 hover:shadow-glow'
    : 'border-hairline bg-panel/70 hover:border-signal/50 hover:bg-panel-2/70'

  return (
    <div className={`${base} ${tone}`}>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${
          emphasized ? 'bg-signal text-ink' : 'bg-panel-2 text-signal'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-body text-[15px] font-medium text-text-primary">{label}</span>
        {sublabel && <span className="block font-mono text-[12px] text-text-faint">{sublabel}</span>}
      </span>
      {children}
    </div>
  )
}

export default function Enlaces() {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-signal/40 bg-panel shadow-glow">
            <svg width="30" height="30" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M2 14 L7 8 L11 12 L18 4"
                fill="none"
                stroke="#C99C54"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mt-5 font-display text-[22px] tracking-tight text-text-primary">
            lineatrade
          </h1>
          <p className="mt-1 font-mono text-[13px] text-steel">@linea.trade</p>
          <p className="mt-4 font-body text-[14px] leading-relaxed text-text-muted">
            Tu diario de trading. Métricas reales, no promesas — sin señales, sin predicciones.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <a href={APK_DOWNLOAD_URL} download>
            <LinkTile icon={<Smartphone size={18} />} label="Descargar APK (Android)" emphasized>
              <span aria-hidden="true" className="font-mono text-[13px] text-signal">
                ↓
              </span>
            </LinkTile>
          </a>

          <Link to="/">
            <LinkTile icon={<Globe size={18} />} label="Web oficial" sublabel="lineartrade.vercel.app">
              <span aria-hidden="true" className="font-mono text-[13px] text-text-faint">
                →
              </span>
            </LinkTile>
          </Link>

          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            <LinkTile icon={<InstagramIcon className="h-[18px] w-[18px]" />} label="Instagram" sublabel="@linea.trade">
              <span aria-hidden="true" className="font-mono text-[13px] text-text-faint">
                ↗
              </span>
            </LinkTile>
          </a>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <p className="font-mono text-[11px] text-text-faint">
            © {new Date().getFullYear()} LineaTrade
          </p>
          <Link
            to="/privacidad"
            className="font-mono text-[11px] text-text-faint transition-colors hover:text-text-muted"
          >
            Privacidad
          </Link>
        </div>
      </div>
    </div>
  )
}

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
  const tone = emphasized
    ? 'border-2 border-ink bg-signal text-on-signal shadow-pop'
    : 'border border-hairline bg-panel hover:border-text-faint'

  return (
    <div className={`group flex min-h-14 w-full items-center gap-4 rounded-xl px-5 py-4 text-left transition-colors ${tone}`}>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${
          emphasized ? 'bg-ink text-spark' : 'bg-panel-2 text-steel'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-body text-[15px] font-bold">{label}</span>
        {sublabel && <span className="num block text-[12px] text-text-faint">{sublabel}</span>}
      </span>
      {children}
    </div>
  )
}

export default function Enlaces() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-ink px-6 py-16 text-text-primary">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-ink bg-signal shadow-[5px_5px_0_var(--color-pop)]">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-signal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 17l5-6 4 3 6-8 3 3" />
            </svg>
          </span>
          <h1 className="mt-6 font-display text-[26px] text-text-primary">
            LineaTrade
          </h1>
          <p className="mt-1 num text-[13px] text-steel">@linea.trade</p>
          <p className="mt-4 font-body text-[14px] leading-relaxed text-text-muted">
            Tu diario de trading. Métricas reales, no promesas — sin señales, sin predicciones.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <a href={APK_DOWNLOAD_URL} download>
            <LinkTile icon={<Smartphone size={18} />} label="Descargar APK (Android)" emphasized>
              <span aria-hidden="true" className="font-mono text-[13px] text-on-signal">
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
          <p className="num text-[11px] text-text-faint">
            © {new Date().getFullYear()} LineaTrade
          </p>
          <Link
            to="/privacidad"
            className="num text-[11px] text-text-faint transition-colors hover:text-text-muted"
          >
            Privacidad
          </Link>
        </div>
      </div>
    </div>
  )
}

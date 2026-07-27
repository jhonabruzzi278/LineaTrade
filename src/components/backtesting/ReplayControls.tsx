import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'

const SPEED_OPTIONS_MS = [1500, 800, 400, 150]

type Props = {
  currentIndex: number
  total: number
  isPlaying: boolean
  onTogglePlay: () => void
  onStepForward: () => void
  onStepBack: () => void
  onReset: () => void
  speedMs: number
  onSpeedChange: (ms: number) => void
}

export function ReplayControls({
  currentIndex,
  total,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBack,
  onReset,
  speedMs,
  onSpeedChange,
}: Props) {
  const progressPercent = total > 1 ? (currentIndex / (total - 1)) * 100 : 0

  return (
    <div className="border-t border-hairline bg-panel px-4 py-3">
      <div className="h-1 bg-panel-2 rounded-full mb-3 overflow-hidden">
        <div className="h-full bg-signal transition-all duration-200" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Dos filas en mobile (controles+contador arriba, velocidad abajo) — una sola
          fila desde `sm:` (640px), donde sí entran los 9 controles + contador sin
          desbordar. A 375px, los 4 botones de velocidad solos ya no entraban en la
          misma fila que los controles de reproducción — confirmado midiendo
          getBoundingClientRect() de cada botón: el último quedaba fuera del viewport
          (right: 404px contra un viewport de 375px), inalcanzable.
          max-w-2xl mx-auto: en desktop ancho, sin esto los controles quedaban
          separados por cientos de píxeles vacíos en el medio — la barra de progreso
          de arriba sigue siendo full-bleed (como un scrubber de video), pero los
          botones se agrupan igual que en un player real. */}
      <div className="max-w-2xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onReset}
              title="Reiniciar"
              aria-label="Reiniciar replay"
              className="p-2 rounded-sm text-text-faint hover:text-text-primary hover:bg-panel-2 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={onStepBack}
              title="Retroceder una vela"
              aria-label="Retroceder una vela"
              className="p-2 rounded-sm text-text-faint hover:text-text-primary hover:bg-panel-2 transition-colors"
            >
              <SkipBack size={16} />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
              aria-label={isPlaying ? 'Pausar replay' : 'Reproducir replay'}
              className="p-2.5 rounded-sm bg-signal text-ink hover:bg-signal-dim transition-colors"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              onClick={onStepForward}
              title="Avanzar una vela"
              aria-label="Avanzar una vela"
              className="p-2 rounded-sm text-text-faint hover:text-text-primary hover:bg-panel-2 transition-colors"
            >
              <SkipForward size={16} />
            </button>
          </div>

          <p className="font-mono text-[11px] text-text-faint tabular-nums shrink-0">
            {Math.min(currentIndex + 1, total)} / {total}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1 flex-wrap" role="group" aria-label="Velocidad de reproducción">
          {SPEED_OPTIONS_MS.map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => onSpeedChange(ms)}
              aria-pressed={speedMs === ms}
              className={`font-mono text-[11px] px-2 py-1 rounded-sm border transition-colors ${
                speedMs === ms
                  ? 'border-signal text-signal'
                  : 'border-hairline text-text-faint hover:text-text-muted'
              }`}
            >
              {(1000 / ms).toFixed(1)}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

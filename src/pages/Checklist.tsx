import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { ProgressBar } from '../components/ui/progress-bar'
import { FIELD_CLASS } from '../components/ui/field'

const STORAGE_KEY = 'lineatrade.pretrade-checklist.v1'
type ChecklistPoint = { id: string; title: string }
type ChecklistStage = { id: string; label: string; points: ChecklistPoint[] }

const STAGES: ChecklistStage[] = [
  { id: 'preparacion', label: 'Preparación', points: [
    { id: 'condition', title: 'Estoy en condiciones de seguir mi plan sin prisa ni distracciones.' },
    { id: 'limits', title: 'Confirmé mis límites personales de pérdida y actividad.' },
  ] },
  { id: 'mensual', label: 'Mensual', points: [
    { id: 'monthly-context', title: 'Registré el contexto amplio que estoy observando.' },
    { id: 'monthly-alt', title: 'Anoté qué dato cambiaría o invalidaría mi lectura.' },
  ] },
  { id: 'semanal', label: 'Semanal', points: [
    { id: 'weekly-levels', title: 'Marqué referencias semanales con una zona horaria definida.' },
    { id: 'weekly-plan', title: 'Preparé escenarios alternativos para la semana.' },
  ] },
  { id: 'diario', label: 'Diario', points: [
    { id: 'calendar', title: 'Revisé el calendario económico y las noticias relevantes.' },
    { id: 'session', title: 'Confirmé la sesión, el horario y el contrato que voy a observar.' },
  ] },
  { id: '4h', label: '4 horas', points: [
    { id: 'four-hour-structure', title: 'Describí la estructura en este marco temporal.' },
    { id: 'four-hour-levels', title: 'Marqué zonas relevantes y su condición de invalidación.' },
  ] },
  { id: '1h', label: '1 hora', points: [
    { id: 'one-hour-setup', title: 'Las condiciones de mi setup son observables en este marco.' },
    { id: 'one-hour-risk', title: 'Calculé tamaño y pérdida potencial según mi plan.' },
  ] },
  { id: 'decision', label: 'Decisión', points: [
    { id: 'decision-plan', title: 'Escribí el escenario, el gatillo y qué invalidaría la idea.' },
    { id: 'decision-no-trade', title: 'Definí también qué condición me haría no operar.' },
  ] },
  { id: 'registro', label: 'Registro', points: [
    { id: 'record-plan', title: 'Dejé el plan y el riesgo anotados antes de ejecutar.' },
    { id: 'record-review', title: 'Al terminar, revisaré cumplimiento separado del resultado.' },
  ] },
]

type SavedDay = { checked: string[]; stage: number; note: string }
type SavedDays = Record<string, SavedDay>

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function readSavedDays(): SavedDays {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).flatMap(([day, entry]) => {
      if (Array.isArray(entry)) return [[day, { checked: entry.filter((id): id is string => typeof id === 'string'), stage: 0, note: '' }]]
      if (!entry || typeof entry !== 'object') return []
      const data = entry as Partial<SavedDay>
      return [[day, {
        checked: Array.isArray(data.checked) ? data.checked.filter((id): id is string => typeof id === 'string') : [],
        stage: typeof data.stage === 'number' && Number.isFinite(data.stage) ? Math.max(0, Math.min(STAGES.length - 1, data.stage)) : 0,
        note: typeof data.note === 'string' ? data.note : '',
      }]]
    }))
  } catch {
    return {}
  }
}

function readableDate(day: string) {
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00`))
}

const allPoints = STAGES.flatMap((stage) => stage.points)

export default function Checklist() {
  const today = localDateKey(new Date())
  const [saved, setSaved] = useState<SavedDays>(readSavedDays)
  const entry = saved[today] ?? { checked: [], stage: 0, note: '' }
  const checked = useMemo(() => new Set(entry.checked), [entry.checked])
  const activeStage = Math.min(entry.stage, STAGES.length - 1)
  const stage = STAGES[activeStage]
  const count = checked.size
  const progress = Math.round((count / allPoints.length) * 100)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)) } catch { /* El checklist sigue disponible mientras la página esté abierta. */ }
  }, [saved])

  function updateToday(update: Partial<SavedDay>) {
    setSaved((current) => ({ ...current, [today]: { ...(current[today] ?? { checked: [], stage: 0, note: '' }), ...update } }))
  }

  function toggle(id: string) {
    const next = new Set(entry.checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    updateToday({ checked: [...next] })
  }

  function resetToday() {
    setSaved((current) => {
      const next = { ...current }
      delete next[today]
      return next
    })
  }

  const history = Object.entries(saved)
    .filter(([day, value]) => day < today && value.checked.length > 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5)

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
      <PageHeader kicker="Journal · preparación" title="Checklist pre-trading" lead="Avanza por tu rutina de contexto y decisión. Las marcas se guardan en este dispositivo por fecha." />

      <div className="grid items-start gap-5 md:grid-cols-[190px_minmax(0,1fr)]">
        <nav aria-label="Pasos del checklist" className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:space-y-1 md:overflow-visible md:pb-0">
          {STAGES.map((item, index) => {
            const stageDone = item.points.every((point) => checked.has(point.id))
            const active = activeStage === index
            return <button key={item.id} type="button" aria-current={active ? 'step' : undefined} onClick={() => updateToday({ stage: index })} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-lg border px-3 text-left font-body text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal lg:w-full lg:border-transparent ${active ? 'border-signal bg-signal/10 text-text-primary lg:border-signal/30' : 'border-hairline bg-panel text-text-muted hover:bg-panel-2'}`}><span className={`num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${stageDone ? 'border-signal bg-signal text-on-signal' : 'border-hairline text-text-faint'}`}>{stageDone ? <Check className="h-3.5 w-3.5" /> : String(index + 1).padStart(2, '0')}</span><span>{item.label}</span></button>
          })}
        </nav>

        <Card as="section" aria-labelledby="stage-title" className="p-0">
          <div className="border-b border-hairline p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="label-mono">{new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())} · paso {activeStage + 1} de {STAGES.length}</p><h2 id="stage-title" className="mt-1 font-display text-[20px] text-text-primary">{stage.label}</h2></div>
              <button type="button" onClick={resetToday} disabled={count === 0 && !entry.note} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 font-body text-[12px] font-semibold text-text-faint hover:bg-panel-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />Reiniciar</button>
            </div>
            <div className="mt-5 flex items-center gap-3"><ProgressBar value={progress} label={`${count} de ${allPoints.length} criterios marcados`} tone="spark" className="flex-1" /><span className="num min-w-12 text-right text-[12px] text-text-muted">{count}/{allPoints.length}</span></div>
          </div>

          <div className="space-y-2 p-4 sm:p-6">
            {stage.points.map((point) => (
              <label key={point.id} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-hairline px-3 py-3 font-body text-[13px] leading-5 text-text-primary transition-colors hover:bg-panel-2">
                <input type="checkbox" checked={checked.has(point.id)} onChange={() => toggle(point.id)} className="mt-0.5 h-5 w-5 shrink-0 accent-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-panel" />
                <span className={checked.has(point.id) ? 'text-text-faint line-through decoration-hairline' : ''}>{point.title}</span>
              </label>
            ))}
            {stage.id === 'registro' && <div className="pt-3"><label htmlFor="checklist-note" className="mb-1.5 block font-body text-[12px] font-semibold text-text-faint">Nota de la sesión <span className="font-normal">(opcional)</span></label><textarea id="checklist-note" value={entry.note} onChange={(event) => updateToday({ note: event.target.value })} placeholder="Contexto o recordatorio para revisar después…" rows={3} className={`${FIELD_CLASS} h-auto py-3`} /></div>}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-hairline p-4 sm:px-6">
            <button type="button" disabled={activeStage === 0} onClick={() => updateToday({ stage: activeStage - 1 })} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-body text-[13px] font-semibold text-text-muted hover:bg-panel-2 disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Anterior</button>
            {count === allPoints.length ? <p role="status" className="hidden font-body text-[12px] text-text-muted sm:block">Rutina registrada para hoy.</p> : <span aria-live="polite" className="font-mono text-[10px] text-text-faint">{count} puntos marcados</span>}
            <button type="button" disabled={activeStage === STAGES.length - 1} onClick={() => updateToday({ stage: activeStage + 1 })} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-signal px-4 font-body text-[13px] font-semibold text-on-signal hover:bg-signal-dim disabled:opacity-40">Siguiente<ArrowRight className="h-4 w-4" /></button>
          </footer>
        </Card>

        <aside className="space-y-4 md:col-span-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          <Card><p className="label-mono">Una guía, no una señal</p><p className="mt-3 font-body text-[13px] leading-6 text-text-muted">El checklist ayuda a registrar tu proceso. No predice el mercado ni indica si una operación tendrá éxito.</p></Card>
          <Card>
            <p className="label-mono">Sesiones anteriores</p>
            {history.length ? <ul className="mt-3 divide-y divide-hairline">{history.map(([day, value]) => <li key={day} className="flex min-h-11 items-center justify-between gap-3 font-body text-[12px] text-text-muted"><time dateTime={day}>{readableDate(day)}</time><span className="num">{value.checked.length}/{allPoints.length}</span></li>)}</ul> : <p className="mt-3 font-body text-[12px] leading-5 text-text-faint">Aquí aparecerán las marcas de otros días guardadas en este dispositivo.</p>}
          </Card>
        </aside>
      </div>
    </main>
  )
}

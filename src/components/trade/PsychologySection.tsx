import { Switch } from '../Switch'
import { cn } from '@/lib/utils'

export interface PsychologyData {
  emotion: string
  confidenceLevel: number
  stressLevel: number
  fearLevel: number
  anxietyLevel: number
  followedPlan: boolean
  hadFomo: boolean
  movedStopLoss: boolean
  overtraded: boolean
  closedEarly: boolean
  movedTakeProfit: boolean
  enteredImpulsively: boolean
  hesitated: boolean
  overconfidence: boolean
  hadDistractions: boolean
}

interface PsychologySectionProps {
  data: PsychologyData
  onChange: (next: PsychologyData) => void
}

type PsychologyBooleanKey =
  | 'followedPlan'
  | 'hadFomo'
  | 'movedStopLoss'
  | 'overtraded'
  | 'closedEarly'
  | 'movedTakeProfit'
  | 'enteredImpulsively'
  | 'hesitated'
  | 'overconfidence'
  | 'hadDistractions'

const emotionOptions = ['Confianza', 'Ansiedad', 'Euforia', 'Miedo', 'Frustración', 'Calma', 'Impulsividad', 'Duda']

const checkboxFields: Array<{ key: PsychologyBooleanKey; label: string }> = [
  { key: 'followedPlan', label: 'Seguí mi plan' },
  { key: 'hadFomo', label: 'Tuve FOMO' },
  { key: 'movedStopLoss', label: 'Moví el stop loss' },
  { key: 'movedTakeProfit', label: 'Moví el take profit' },
  { key: 'overtraded', label: 'Sobre-operé (overtrading)' },
  { key: 'closedEarly', label: 'Cerré antes de tiempo' },
  { key: 'enteredImpulsively', label: 'Entré por impulso' },
  { key: 'hesitated', label: 'Dudé antes de entrar' },
  { key: 'overconfidence', label: 'Exceso de confianza' },
  { key: 'hadDistractions', label: 'Tuve distracciones' },
]

export function PsychologySection({ data, onChange }: PsychologySectionProps) {
  function set<K extends keyof PsychologyData>(key: K, value: PsychologyData[K]) {
    onChange({ ...data, [key]: value })
  }

  return (
    <div>
      <p id="psy-emotion" className="label-mono mb-3 lg:text-[11px]">
        ¿Qué emoción predominó?
      </p>
      <div role="radiogroup" aria-labelledby="psy-emotion" className="flex flex-wrap gap-2 lg:gap-2.5">
        {emotionOptions.map((emotion) => {
          const selected = data.emotion === emotion
          return (
            <button
              key={emotion}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => set('emotion', emotion)}
              className={cn(
                'inline-flex min-h-11 items-center rounded-full border px-3.5 font-body text-[14px] font-semibold transition-colors lg:px-4',
                selected ? 'border-2 border-signal bg-signal/15 px-[13px] text-text-primary lg:px-[15px]' : 'border-input text-text-muted hover:border-text-faint',
              )}
            >
              {emotion}
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:mt-8 lg:grid-cols-2 lg:gap-x-9 lg:gap-y-6">
        <SliderField id="psy-confidence" label="Nivel de confianza" value={data.confidenceLevel} onChange={(v) => set('confidenceLevel', v)} />
        <SliderField id="psy-stress" label="Nivel de estrés" value={data.stressLevel} onChange={(v) => set('stressLevel', v)} />
        <SliderField id="psy-fear" label="Nivel de miedo" value={data.fearLevel} onChange={(v) => set('fearLevel', v)} />
        <SliderField id="psy-anxiety" label="Nivel de ansiedad" value={data.anxietyLevel} onChange={(v) => set('anxietyLevel', v)} />
      </div>

      <p className="label-mono mb-0.5 mt-7 lg:mt-9 lg:text-[11px]">¿Qué pasó en este trade?</p>
      <div className="grid lg:grid-cols-2 lg:gap-x-9">
        {checkboxFields.map((field) => (
          <div key={field.key} className="flex min-h-[52px] items-center border-b border-hairline">
            <div className="w-full">
              <Switch checked={data[field.key]} onChange={(checked) => set(field.key, checked)} label={field.label} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SliderField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="font-body text-[14px] font-semibold text-text-muted">
          {label}
        </label>
        <span className="num text-[14px] text-steel" aria-hidden="true">
          {value}/10
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value} de 10`}
        className="h-11 w-full cursor-pointer accent-signal"
      />
    </div>
  )
}

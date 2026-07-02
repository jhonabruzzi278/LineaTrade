export interface PsychologyData {
  emotion: string
  confidenceLevel: number
  stressLevel: number
  followedPlan: boolean
  hadFomo: boolean
  movedStopLoss: boolean
  overtraded: boolean
}

interface PsychologySectionProps {
  data: PsychologyData
  onChange: (next: PsychologyData) => void
}

type PsychologyBooleanKey = 'followedPlan' | 'hadFomo' | 'movedStopLoss' | 'overtraded'

const emotionOptions = ['Confianza', 'Ansiedad', 'Euforia', 'Miedo', 'Frustración', 'Calma', 'Impulsividad', 'Duda']

const checkboxFields: Array<{ key: PsychologyBooleanKey; label: string }> = [
  { key: 'followedPlan', label: 'Seguí mi plan' },
  { key: 'hadFomo', label: 'Tuve FOMO' },
  { key: 'movedStopLoss', label: 'Moví el stop loss' },
  { key: 'overtraded', label: 'Sobre-operé (overtrading)' },
]

export function PsychologySection({ data, onChange }: PsychologySectionProps) {
  function set<K extends keyof PsychologyData>(key: K, value: PsychologyData[K]) {
    onChange({ ...data, [key]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="font-body text-[13px] text-text-muted block mb-3">¿Qué emoción predominó?</label>
        <div className="flex flex-wrap gap-2">
          {emotionOptions.map((emotion) => (
            <button
              key={emotion}
              type="button"
              onClick={() => set('emotion', emotion)}
              className={`px-3 py-2 rounded-sm border font-body text-[13px] transition-colors ${
                data.emotion === emotion
                  ? 'border-signal bg-signal/10 text-text-primary'
                  : 'border-hairline bg-panel text-text-muted hover:border-text-faint'
              }`}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      <SliderField label="Nivel de confianza" value={data.confidenceLevel} onChange={(v) => set('confidenceLevel', v)} />
      <SliderField label="Nivel de estrés" value={data.stressLevel} onChange={(v) => set('stressLevel', v)} />

      <div className="space-y-3">
        {checkboxFields.map((field) => (
          <label key={field.key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data[field.key]}
              onChange={(e) => set(field.key, e.target.checked)}
              className="w-4 h-4 accent-signal"
            />
            <span className="font-body text-[14px] text-text-primary">{field.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="font-body text-[13px] text-text-muted">{label}</label>
        <span className="font-mono text-[13px] text-signal">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-signal"
      />
    </div>
  )
}

export interface OnboardingOption {
  value: string
  label: string
  hint?: string
}

interface BaseStep {
  id: 'experience' | 'accountType' | 'broker' | 'instruments' | 'goals' | 'source'
  title: string
  subtitle?: string
  options: OnboardingOption[]
}

export interface SingleSelectStep extends BaseStep {
  type: 'single'
}

export interface MultiSelectStep extends BaseStep {
  type: 'multi'
}

export interface BrokerStep extends BaseStep {
  type: 'broker'
}

export type OnboardingStep = SingleSelectStep | MultiSelectStep | BrokerStep

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'experience',
    type: 'single',
    title: '¿Hace cuánto operas?',
    subtitle: 'Nos ayuda a calibrar cómo interpretamos tus estadísticas.',
    options: [
      { value: 'lt_1y', label: 'Menos de 1 año', hint: 'Recién empezando' },
      { value: '1_3y', label: '1 a 3 años', hint: 'Formando el hábito' },
      { value: '3_5y', label: '3 a 5 años', hint: 'Con proceso propio' },
      { value: 'gt_5y', label: 'Más de 5 años', hint: 'Disciplina asentada' },
    ],
  },
  {
    id: 'accountType',
    type: 'single',
    title: '¿Qué usas para operar?',
    subtitle: 'Selecciona una opción.',
    options: [
      { value: 'personal', label: 'Cuenta personal' },
      { value: 'prop_firm', label: 'Cuenta de fondeo (Prop Firm)' },
      { value: 'not_started', label: 'Aún no he empezado a operar' },
    ],
  },
  {
    id: 'broker',
    type: 'broker',
    title: '¿Cuál es tu bróker principal?',
    subtitle: 'Selecciona uno. Podrás agregar más adelante.',
    options: [
      { value: 'interactive_brokers', label: 'Interactive Brokers' },
      { value: 'oanda', label: 'OANDA' },
      { value: 'ig', label: 'IG' },
      { value: 'etoro', label: 'eToro' },
      { value: 'xtb', label: 'XTB' },
      { value: 'binance', label: 'Binance' },
      { value: 'bybit', label: 'Bybit' },
      { value: 'metatrader', label: 'MetaTrader / bróker propio' },
      { value: 'otro', label: 'Otro' },
    ],
  },
  {
    id: 'instruments',
    type: 'multi',
    title: '¿Qué operas actualmente?',
    subtitle: 'Selecciona todas las que apliquen.',
    options: [
      { value: 'stocks', label: 'Acciones' },
      { value: 'options', label: 'Opciones' },
      { value: 'forex', label: 'Forex' },
      { value: 'crypto', label: 'Cripto' },
      { value: 'futures', label: 'Futuros' },
      { value: 'cfd', label: 'CFD' },
      { value: 'other', label: 'Otro' },
    ],
  },
  {
    id: 'goals',
    type: 'multi',
    title: '¿Qué buscas hacer con Lineatrader?',
    subtitle: 'Selecciona todas las que apliquen.',
    options: [
      {
        value: 'journal',
        label: 'Registrar mis operaciones',
        hint: 'Documentar cada trade: técnica, contexto y psicología',
      },
      {
        value: 'analyze',
        label: 'Analizar mi comportamiento',
        hint: 'Ver estadísticas y patrones basados en tus propios datos',
      },
      {
        value: 'rules',
        label: 'Definir mis reglas y objetivos',
        hint: 'Fijar reglas de disciplina y metas medibles',
      },
      {
        value: 'ai',
        label: 'Recibir interpretación con IA',
        hint: 'Análisis que siempre cita la evidencia detrás',
      },
    ],
  },
  {
    id: 'source',
    type: 'single',
    title: '¿Cómo nos conociste?',
    options: [
      { value: 'google', label: 'Búsqueda en Google' },
      { value: 'ai_tools', label: 'Herramientas de IA (ChatGPT, etc.)' },
      { value: 'x', label: 'X (Twitter)' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'reddit', label: 'Reddit' },
      { value: 'community', label: 'Comunidad o mentoría' },
      { value: 'friend', label: 'Un amigo o colega' },
      { value: 'other', label: 'Otro' },
    ],
  },
]

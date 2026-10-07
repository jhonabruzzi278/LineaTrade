// Proveedores y modelos que el usuario puede elegir con su propia clave (BYOK).
//
// Solo hay dos proveedores porque son los únicos con implementación real en
// el registry de las Edge Functions (supabase/functions/_shared/providers/).
// Esta lista es manual: no hay forma de compartir un tipo entre el bundle de
// Vite y el runtime Deno. Si se agrega un proveedor allá, agregarlo acá.
//
// `vision` indica si el modelo puede leer capturas de trades (extract-trade-
// image). El mismo modelo se usa para texto y para visión, así que uno sin
// visión deja la lectura de capturas sin funcionar.

export type AiProviderId = 'groq' | 'openai'

export interface AiModelOption {
  value: string
  label: string
  vision: boolean
}

export interface AiProviderOption {
  id: AiProviderId
  label: string
  /** Iniciales para el ícono (no se usan logos de terceros). */
  badge: string
  keyUrl: string
  keyPlaceholder: string
  models: AiModelOption[]
}

export const AI_PROVIDERS: AiProviderOption[] = [
  {
    id: 'groq',
    label: 'Groq',
    badge: 'GQ',
    keyUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_…',
    models: [
      { value: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B', vision: true },
      { value: 'openai/gpt-oss-20b', label: 'GPT OSS 20B', vision: false },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    badge: 'OA',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-…',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o mini', vision: true },
      { value: 'gpt-4o', label: 'GPT-4o', vision: true },
    ],
  },
]

export const CUSTOM_MODEL_VALUE = '__custom__'

export function findProvider(id: string): AiProviderOption | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === id)
}

/** ¿Se sabe que este modelo lee imágenes? `null` si no está en la lista (nombre libre). */
export function modelHasVision(providerId: string, model: string): boolean | null {
  const found = findProvider(providerId)?.models.find((m) => m.value === model)
  return found ? found.vision : null
}

// Fase 3 (Motor de IA) — headers CORS mínimos para que el frontend (Vite en
// localhost:5180 en dev, el dominio real en producción) pueda invocar el Edge
// Function vía supabase.functions.invoke(). Patrón estándar de Supabase.
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

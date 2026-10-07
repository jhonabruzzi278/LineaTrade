import { supabase } from './supabase'
import type { TraderPlan } from './traderPlanEngine'
import { buildRuleDrafts, filterNewDrafts } from './traderPlanRules'

export interface SaveRuleDraftsResult {
  created: number
  /** Borradores que ya existían como regla del usuario y no se duplicaron. */
  skipped: number
}

// Inserta en trader_rules los borradores del plan, siempre con is_active = false:
// el usuario las revisa y las activa en /sistema. Usa la política RLS existente de
// trader_rules (dueño de la fila), sin tocar el esquema.
export async function saveRuleDrafts(userId: string, plan: TraderPlan): Promise<SaveRuleDraftsResult> {
  const drafts = buildRuleDrafts(plan)

  const { data: existing, error: readError } = await supabase.from('trader_rules').select('title').eq('user_id', userId).is('deleted_at', null)
  if (readError) throw readError

  const fresh = filterNewDrafts(
    drafts,
    (existing ?? []).map((row) => row.title),
  )
  if (fresh.length > 0) {
    const { error: insertError } = await supabase
      .from('trader_rules')
      .insert(fresh.map((draft) => ({ user_id: userId, title: draft.title, description: draft.description, is_active: false })))
    if (insertError) throw insertError
  }
  return { created: fresh.length, skipped: drafts.length - fresh.length }
}

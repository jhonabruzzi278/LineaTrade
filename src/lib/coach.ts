import { supabase } from './supabase'
import { getFunctionErrorMessage } from './errors'
import type { Database } from '../types/database'

export type CoachConversation = Database['public']['Tables']['ai_coach_conversations']['Row']
export type CoachMessage = Database['public']['Tables']['ai_coach_messages']['Row']

export async function listConversations(userId: string): Promise<CoachConversation[]> {
  const { data, error } = await supabase
    .from('ai_coach_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createConversation(userId: string): Promise<CoachConversation> {
  const { data, error } = await supabase.from('ai_coach_conversations').insert({ user_id: userId }).select().single()
  if (error) throw error
  return data
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('ai_coach_conversations').delete().eq('id', id)
  if (error) throw error
}

export async function listMessages(conversationId: string): Promise<CoachMessage[]> {
  const { data, error } = await supabase
    .from('ai_coach_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Inserta el mensaje del usuario directo vía RLS (ai_coach_messages_insert_user_role
// solo admite role='user' para el cliente) — no pasa por el Edge Function, que solo
// se llama después, para generar la respuesta (ver requestCoachReply).
export async function sendUserMessage(conversationId: string, userId: string, content: string): Promise<CoachMessage> {
  const { data, error } = await supabase
    .from('ai_coach_messages')
    .insert({ conversation_id: conversationId, user_id: userId, role: 'user', content })
    .select()
    .single()
  if (error) throw error
  return data
}

export type RequestCoachReplyResult = { ok: true; message: CoachMessage } | { ok: false; message: string }

export async function requestCoachReply(conversationId: string): Promise<RequestCoachReplyResult> {
  const { data, error } = await supabase.functions.invoke<{ message: CoachMessage }>('ai-coach-chat', {
    body: { conversation_id: conversationId },
  })
  if (error) {
    const message = await getFunctionErrorMessage(error)
    return { ok: false, message }
  }
  if (!data) return { ok: false, message: 'El Edge Function no devolvió datos.' }
  return { ok: true, message: data.message }
}

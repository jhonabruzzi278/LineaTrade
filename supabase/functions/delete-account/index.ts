// delete-account — self-service account deletion, required by Google Play's
// Account Deletion policy (a user must be able to request deletion of their
// account and associated data — from a public web page and from inside the
// app — without it being email-only). Before this function,
// `Privacidad.tsx`'s "Tus derechos" section only offered a manual email
// request; this is what makes that promise actually self-service. Consumed
// by `src/pages/EliminarCuenta.tsx`.
//
// Deletes ONLY the account tied to the caller's own JWT (`user.id`, resolved
// server-side via `userClient.auth.getUser()`) — the request body carries no
// target user id, so there is no way to ask this function to delete someone
// else's account.
//
// Schema note: `profiles.id` references `auth.users(id) on delete cascade`,
// and most user-data tables (`trades`, `strategies`, `trader_rules`,
// `objectives`, `user_ai_settings`, `ai_usage_daily`, `trader_plans`) cascade
// from `profiles(id)` in turn — deleting the `auth.users` row already removes
// those transitively. Tables one level further out (`trade_images`,
// `trade_threads`, `trade_orders`, `ai_analysis`) reference `trades(id) on
// delete cascade` instead of `profiles(id)` directly, so they fall away when
// their parent trade rows do, as part of the same cascade.
//
// Four tables reference `profiles(id)` WITHOUT cascade, because the rows
// aren't really "this user's data" — they're either a shared catalog the
// user happened to touch (`instruments.created_by`, `ai_prompts.created_by`)
// or a security/audit trail that must outlive the account it names
// (`audit_log.user_id`, `trade_history.changed_by`). Postgres would block the
// cascade delete of `profiles` with a foreign key violation the moment it hit
// one of those non-cascading references, so this function nulls those four
// columns out first (all four are nullable) instead of deleting the rows —
// the audit trail itself is kept, just no longer tied to the deleted account.
//
// Storage isn't backed by a SQL foreign key at all (Supabase Storage objects
// live in `storage.objects`, addressed by path, not tied to `auth.users` by
// any constraint) — `avatars/{userId}/avatar` and
// `trade-images/{userId}/{trade_id}/...` are removed explicitly before the
// auth user is deleted.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient } from '../_shared/supabaseClients.ts'
import type { Database } from '../_shared/database.types.ts'

type DeleteErrorCode = 'UNAUTHENTICATED' | 'DELETE_FAILED'

function errorResponse(status: number, code: DeleteErrorCode, error: string) {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Storage's `list()` only returns one level per call — folders come back as
// entries with `id: null` (they're synthetic prefixes, not real objects), so
// walking `trade-images/{userId}/{trade_id}/...` needs real recursion, not a
// single flat list. `avatars/{userId}/avatar` has no subfolder, so this just
// returns that one path directly for that bucket.
async function collectStoragePaths(
  client: SupabaseClient<Database>,
  bucket: string,
  prefix: string,
  depthRemaining = 5,
): Promise<string[]> {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error || !data) return []

  const paths: string[] = []
  for (const entry of data) {
    const fullPath = `${prefix}/${entry.name}`
    if (entry.id === null && depthRemaining > 0) {
      paths.push(...(await collectStoragePaths(client, bucket, fullPath, depthRemaining - 1)))
    } else {
      paths.push(fullPath)
    }
  }
  return paths
}

async function purgeBucket(client: SupabaseClient<Database>, bucket: string, userId: string): Promise<void> {
  const paths = await collectStoragePaths(client, bucket, userId)
  if (paths.length === 0) return
  await client.storage.from(bucket).remove(paths)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Falta el header Authorization.')
  }

  const userClient = createUserClient(authHeader)
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Sesión inválida o expirada.')
  }

  const serviceClient = createServiceClient()

  // Desasociar (no borrar) las filas que deben sobrevivir a la cuenta —
  // auditoría de seguridad y catálogo compartido — antes de que el cascade de
  // abajo intente eliminar `profiles` y choque con una FK sin "on delete
  // cascade".
  await Promise.all([
    serviceClient.from('audit_log').update({ user_id: null }).eq('user_id', user.id),
    serviceClient.from('trade_history').update({ changed_by: null }).eq('changed_by', user.id),
    serviceClient.from('instruments').update({ created_by: null }).eq('created_by', user.id),
    serviceClient.from('ai_prompts').update({ created_by: null }).eq('created_by', user.id),
  ])

  await Promise.all([
    purgeBucket(serviceClient, 'avatars', user.id),
    purgeBucket(serviceClient, 'trade-images', user.id),
  ])

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return errorResponse(500, 'DELETE_FAILED', `No se pudo eliminar la cuenta: ${deleteError.message}`)
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

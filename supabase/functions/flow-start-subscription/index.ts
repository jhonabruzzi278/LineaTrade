import { corsHeaders } from '../_shared/cors.ts'
import { flowRequest } from '../_shared/flow.ts'
import { createServiceClient, createUserClient } from '../_shared/supabaseClients.ts'

type FlowCustomer = { customerId: string }
type FlowRegistration = { url: string; token: string }

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido.' })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json(401, { error: 'Sesión requerida.' })
  const userClient = createUserClient(authHeader)
  const { data: { user } } = await userClient.auth.getUser()
  if (!user?.email) return json(401, { error: 'Sesión inválida.' })

  try {
    const service = createServiceClient()
    const { data: existing } = await service.from('billing_customers').select('provider_customer_id').eq('user_id', user.id).maybeSingle()
    let customerId = existing?.provider_customer_id

    if (!customerId) {
      const customer = await flowRequest<FlowCustomer>('customer/create', {
        name: String(user.user_metadata?.display_name ?? user.email.split('@')[0]),
        email: user.email,
        externalId: user.id,
      })
      customerId = customer.customerId
      const { error } = await service.from('billing_customers').upsert({ user_id: user.id, provider: 'flow', provider_customer_id: customerId })
      if (error) throw error
    }

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/flow-register-callback`
    const registration = await flowRequest<FlowRegistration>('customer/register', { customerId, url_return: callbackUrl })
    const planId = Deno.env.get('FLOW_PLAN_PRO_ID') ?? 'lineatrade'
    const { error } = await service.from('billing_checkout_sessions').insert({
      user_id: user.id,
      flow_customer_id: customerId,
      flow_plan_id: planId,
      registration_token: registration.token,
    })
    if (error) throw error
    return json(200, { redirectUrl: `${registration.url}?token=${encodeURIComponent(registration.token)}` })
  } catch (error) {
    console.error('flow-start-subscription', error)
    return json(502, { error: 'No pudimos iniciar la suscripción con Flow.' })
  }
})


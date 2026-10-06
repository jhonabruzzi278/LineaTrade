import { flowRequest } from '../_shared/flow.ts'
import { createServiceClient } from '../_shared/supabaseClients.ts'

type PaymentStatus = { flowOrder?: number; commerceOrder?: string; status?: number; [key: string]: unknown }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const token = (await req.formData()).get('token')?.toString()
  if (!token) return new Response('Missing token', { status: 400 })

  try {
    const service = createServiceClient()
    const payment = await flowRequest<PaymentStatus>('payment/getStatus', { token }, 'GET')
    const { error } = await service.from('billing_webhook_events').upsert({
      provider: 'flow',
      event_id: token,
      event_type: `payment.status.${payment.status ?? 'unknown'}`,
      payload: payment,
      processed_at: new Date().toISOString(),
    }, { onConflict: 'provider,event_id' })
    if (error) throw error
    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('flow-subscription-callback', error)
    return new Response('Unable to verify callback', { status: 502 })
  }
})

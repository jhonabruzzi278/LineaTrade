import { flowRequest } from '../_shared/flow.ts'
import { createServiceClient } from '../_shared/supabaseClients.ts'

type RegisterStatus = { status: string | number; customerId: string }
type FlowSubscription = { subscriptionId: string; planId: string; customerId: string }

function redirect(result: 'success' | 'error') {
  const appUrl = (Deno.env.get('APP_URL') ?? 'https://lineartrade.vercel.app').replace(/\/$/, '')
  return Response.redirect(`${appUrl}/planes?flow=${result}`, 303)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const token = (await req.formData()).get('token')?.toString()
  if (!token) return redirect('error')

  const service = createServiceClient()
  const { data: checkout } = await service.from('billing_checkout_sessions').select('*').eq('registration_token', token).maybeSingle()
  if (!checkout || checkout.expires_at < new Date().toISOString()) return redirect('error')
  if (checkout.status === 'subscribed') return redirect('success')

  try {
    const status = await flowRequest<RegisterStatus>('customer/getRegisterStatus', { token }, 'GET')
    if (String(status.status) !== '1' || status.customerId !== checkout.flow_customer_id) {
      await service.from('billing_checkout_sessions').update({ status: 'failed', error_code: 'card_registration_failed', updated_at: new Date().toISOString() }).eq('id', checkout.id)
      return redirect('error')
    }

    await service.from('billing_checkout_sessions').update({ status: 'registered', updated_at: new Date().toISOString() }).eq('id', checkout.id)
    const subscription = await flowRequest<FlowSubscription>('subscription/create', {
      planId: checkout.flow_plan_id,
      customerId: checkout.flow_customer_id,
    })
    const now = new Date().toISOString()
    const { error } = await service.from('subscriptions').upsert({
      user_id: checkout.user_id,
      provider: 'flow',
      provider_subscription_id: subscription.subscriptionId,
      provider_product_id: subscription.planId,
      plan_key: 'pro',
      status: 'trialing',
      trial_end: new Date(Date.now() + 31 * 86_400_000).toISOString(),
      updated_at: now,
    }, { onConflict: 'provider_subscription_id' })
    if (error) throw error
    await service.from('billing_checkout_sessions').update({ status: 'subscribed', updated_at: now }).eq('id', checkout.id)
    return redirect('success')
  } catch (error) {
    console.error('flow-register-callback', error)
    await service.from('billing_checkout_sessions').update({ status: 'failed', error_code: 'flow_error', updated_at: new Date().toISOString() }).eq('id', checkout.id)
    return redirect('error')
  }
})


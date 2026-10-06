function requiredFlowEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Falta la variable ${name}`)
  return value
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function signFlowParams(params: Record<string, string>, secretKey = requiredFlowEnv('FLOW_SECRET_KEY')) {
  const payload = Object.keys(params).sort().map((key) => `${key}${params[key]}`).join('')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)))
}

export async function flowRequest<T>(path: string, params: Record<string, string>, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const apiKey = requiredFlowEnv('FLOW_API_KEY')
  const apiUrl = requiredFlowEnv('FLOW_API_URL').replace(/\/$/, '')
  const signedParams = { apiKey, ...params }
  const body = new URLSearchParams({ ...signedParams, s: await signFlowParams(signedParams) })
  const response = await fetch(method === 'GET' ? `${apiUrl}/${path}?${body}` : `${apiUrl}/${path}`, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    body: method === 'POST' ? body : undefined,
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(`Flow ${path} respondió ${response.status}`)
  return payload as T
}


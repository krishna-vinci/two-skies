export type PushSupport = 'ok' | 'unsupported' | 'needs-https' | 'ios-install'

export interface PushSettings {
  places: string[]
  prefs: { rain: boolean; alerts: boolean; morning: boolean; hourly: boolean; hourlyChanged: boolean }
  lang: string
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function pushSupport(): PushSupport {
  if (!window.isSecureContext) return 'needs-https'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported'
  }
  return 'ok'
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })
  if (!r.ok) throw new Error(`${path} ${r.status}`)
  return r.json() as Promise<T>
}

const b64ToBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  return navigator.serviceWorker.ready
}

export async function currentSubscription() {
  return (await registration()).pushManager.getSubscription()
}

/** Settings stored on the server for this device, or null if not subscribed. */
export async function loadSettings(): Promise<PushSettings | null> {
  const sub = await currentSubscription()
  if (!sub) return null
  const s = await api<{ subscribed: boolean } & Partial<PushSettings>>('/api/push/state', { endpoint: sub.endpoint })
  const none = { rain: false, alerts: false, morning: false, hourly: false, hourlyChanged: false }
  return s.subscribed ? { places: s.places ?? [], prefs: { ...none, ...s.prefs }, lang: s.lang ?? 'en' } : null
}

export async function enablePush(settings: PushSettings): Promise<'ok' | 'denied'> {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'denied'
  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const { key } = await api<{ key: string }>('/api/push/key')
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) as BufferSource })
  }
  await api('/api/push/subscribe', { subscription: sub.toJSON(), ...settings })
  return 'ok'
}

export async function savePush(settings: PushSettings) {
  const sub = await currentSubscription()
  if (sub) await api('/api/push/subscribe', { subscription: sub.toJSON(), ...settings })
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  await api('/api/push/unsubscribe', { endpoint: sub.endpoint })
  await sub.unsubscribe()
}

export async function sendTest() {
  const sub = await currentSubscription()
  if (sub) await api('/api/push/test', { endpoint: sub.endpoint })
}

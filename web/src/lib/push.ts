import { deleteSubscription, saveSubscription } from '../api/push'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushSupport = 'unsupported' | 'needs-install' | 'missing-key' | 'denied' | 'ready'

// iOS only exposes push to PWAs added to the Home Screen.
export function pushSupport(): PushSupport {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  if (ios && !standalone) return 'needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'missing-key'
  if (Notification.permission === 'denied') return 'denied'
  return 'ready'
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

// Must be called from a user gesture (a button tap), or iOS refuses the permission prompt.
export async function subscribeToPush(): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    }))
  await saveSubscription(sub)
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  await deleteSubscription(sub.endpoint)
  await sub.unsubscribe()
}

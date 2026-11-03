import { useEffect, useState } from 'react'
import { currentSubscription, pushSupport, subscribeToPush, unsubscribeFromPush } from '../lib/push'

const MESSAGES = {
  unsupported: 'This browser does not support push notifications.',
  'needs-install': 'On iPhone, add this app to your Home Screen (Share, then Add to Home Screen) and open it from there to turn on notifications.',
  'missing-key': 'Push is not configured for this deployment (missing VAPID public key).',
  denied: 'Notifications are blocked for this app. Re-enable them in your device settings.',
} as const

export function SettingsScreen() {
  const support = pushSupport()
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (support !== 'ready') return
    currentSubscription().then((s) => setSubscribed(!!s))
  }, [support])

  async function toggle() {
    setBusy(true)
    setMessage('')
    try {
      if (subscribed) await unsubscribeFromPush()
      else await subscribeToPush()
      setSubscribed(!subscribed)
    } catch (e) {
      setMessage((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <section>
      <h2>Settings</h2>
      <h3>Notifications on this device</h3>
      {support !== 'ready' ? (
        <p>{MESSAGES[support]}</p>
      ) : (
        <>
          <p>{subscribed === null ? 'Checking…' : subscribed ? 'This device is subscribed.' : 'This device is not subscribed.'}</p>
          <button onClick={toggle} disabled={busy || subscribed === null}>
            {subscribed ? 'Turn off notifications' : 'Enable notifications'}
          </button>
        </>
      )}
      {message && <p role="alert">{message}</p>}
    </section>
  )
}

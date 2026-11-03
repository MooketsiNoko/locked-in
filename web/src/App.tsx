import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { useSettings } from './hooks/useItems'
import { AgendaScreen } from './screens/AgendaScreen'
import { AuthScreen } from './screens/AuthScreen'
import { MonthScreen } from './screens/MonthScreen'

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <AuthScreen />
  return <Calendar email={session.user.email ?? ''} />
}

function Calendar({ email }: { email: string }) {
  const [tab, setTab] = useState<'month' | 'agenda'>('month')
  const { data: settings, error } = useSettings()
  const tz = settings?.tz

  return (
    <>
      <nav>
        <button className={tab === 'month' ? 'active' : ''} onClick={() => setTab('month')}>Month</button>
        <button className={tab === 'agenda' ? 'active' : ''} onClick={() => setTab('agenda')}>Agenda</button>
        <span className="spacer" />
        <small>{email}</small>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </nav>
      <main>
        {error && <p role="alert">{error.message}</p>}
        {tz && (tab === 'month' ? <MonthScreen tz={tz} /> : <AgendaScreen tz={tz} />)}
      </main>
    </>
  )
}

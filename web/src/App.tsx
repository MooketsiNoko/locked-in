import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { useSettings } from './hooks/useItems'
import { AgendaScreen } from './screens/AgendaScreen'
import type { Category } from '../../shared/types'
import { CATEGORIES } from './categories'
import { AuthScreen } from './screens/AuthScreen'
import { ItemDetailScreen } from './screens/ItemDetailScreen'
import { ItemEditorScreen } from './screens/ItemEditorScreen'
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
  const [view, setView] = useState<
    { kind: 'detail'; itemId: string } | { kind: 'edit'; itemId?: string; category?: Category } | null
  >(null)
  const { data: settings, error } = useSettings()

  return (
    <>
      <nav>
        <button className={tab === 'month' ? 'active' : ''} onClick={() => setTab('month')}>Month</button>
        <button className={tab === 'agenda' ? 'active' : ''} onClick={() => setTab('agenda')}>Agenda</button>
        <select
          value=""
          aria-label="New item"
          onChange={(e) => e.target.value && setView({ kind: 'edit', category: e.target.value as Category })}
        >
          <option value="">+ New</option>
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <option key={c} value={c}>{CATEGORIES[c].singular}</option>
          ))}
        </select>
        <span className="spacer" />
        <small>{email}</small>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </nav>
      <main>
        {error && <p role="alert">{error.message}</p>}
        {settings && view?.kind === 'detail' && (
          <ItemDetailScreen
            itemId={view.itemId}
            settings={settings}
            onEdit={() => setView({ kind: 'edit', itemId: view.itemId })}
            onBack={() => setView(null)}
          />
        )}
        {settings && view?.kind === 'edit' && (
          <ItemEditorScreen
            key={view.itemId ?? view.category}
            itemId={view.itemId}
            category={view.category}
            settings={settings}
            onClose={() => setView(view.itemId ? { kind: 'detail', itemId: view.itemId } : null)}
            onDeleted={() => setView(null)}
          />
        )}
        {settings && !view && (tab === 'month'
          ? <MonthScreen tz={settings.tz} onOpen={(itemId) => setView({ kind: 'detail', itemId })} />
          : <AgendaScreen tz={settings.tz} onOpen={(itemId) => setView({ kind: 'detail', itemId })} />)}
      </main>
    </>
  )
}

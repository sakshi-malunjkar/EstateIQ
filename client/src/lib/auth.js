import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  return data
}

export async function logout() {
  await supabase.auth.signOut()
  window.location.href = '/login'
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function isAuthenticated() {
  return Boolean(await getSession())
}

// Roles live in the `profiles` table (id = auth user id, role = 'admin' | 'sales');
// a signed-in user can read only their own row. Missing row => least privilege.
async function fetchRole(userId) {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) {
    console.error('Could not load profile role:', error.message)
    return 'sales'
  }
  return data?.role === 'admin' ? 'admin' : 'sales'
}

/**
 * React hook: { loading, session, email, role }. Re-renders on sign-in /
 * sign-out / token refresh.
 */
export function useAuth() {
  const [state, setState] = useState({ loading: isSupabaseConfigured, session: null, role: null })

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let cancelled = false

    async function apply(session) {
      if (!session) {
        if (!cancelled) setState({ loading: false, session: null, role: null })
        return
      }
      const role = await fetchRole(session.user.id)
      if (!cancelled) setState({ loading: false, session, role })
    }

    getSession().then(apply)
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Deferred: supabase-js warns against awaiting other supabase calls inside this callback.
      setTimeout(() => apply(session), 0)
    })
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  return { ...state, email: state.session?.user?.email ?? null }
}

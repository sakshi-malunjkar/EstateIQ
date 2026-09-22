// Hardcoded demo credentials -- there is no auth backend yet, this is
// a client-side-only gate so the app has role-aware UI (admin vs sales
// agent) to build against. Swap for real auth against the API later.
const USERS = {
  'admin@estateiq.com': { password: 'admin123', role: 'admin' },
  'sales@estateiq.com': { password: 'sales123', role: 'sales' },
}

const STORAGE_KEY = 'estateiq_auth'

export function login(email, password) {
  const user = USERS[email.trim().toLowerCase()]
  if (!user || user.password !== password) {
    return { ok: false, error: 'Invalid email or password.' }
  }
  const session = { email: email.trim().toLowerCase(), role: user.role }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return { ok: true, session }
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return getSession() !== null
}

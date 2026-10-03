import { motion } from 'framer-motion'
import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login, useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const { loading, session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already signed in (e.g. returning to /login): go straight to the app.
  if (!loading && session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      toast.error('Authentication is not configured (missing VITE_SUPABASE_* values).')
      return
    }
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      toast.error('Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-4">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/3 -left-1/4 size-[600px] rounded-full bg-indigo-300/40 blur-[120px] animate-pulse" />
        <div
          className="absolute -bottom-1/3 -right-1/4 size-[600px] rounded-full bg-blue-300/40 blur-[120px] animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#131836 1px, transparent 1px), linear-gradient(90deg, #131836 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-sm p-8 shadow-xl shadow-indigo-900/10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <span className="text-4xl mb-2">🏠</span>
          <h1 className="text-2xl font-semibold tracking-tight text-gradient">EstateIQ</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI-Powered Real Estate Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-white border-gray-300 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-white border-gray-300 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

      </motion.div>
    </div>
  )
}

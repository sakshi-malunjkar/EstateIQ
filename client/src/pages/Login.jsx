import { motion } from 'framer-motion'
import { Lock, Mail, Shield, UserRound } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login } from '@/lib/auth'
import { cn } from '@/lib/utils'

export default function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState('admin')
  const [email, setEmail] = useState('admin@estateiq.com')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleRoleToggle(nextRole) {
    setRole(nextRole)
    setEmail(nextRole === 'admin' ? 'admin@estateiq.com' : 'sales@estateiq.com')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    // Deliberately no artificial delay -- login is a synchronous
    // localStorage check (see lib/auth.js), no network call yet.
    const result = login(email, password)
    setSubmitting(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`Welcome back, ${result.session.role === 'admin' ? 'Admin' : 'Sales Agent'}!`)
    navigate('/dashboard')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-4">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/3 -left-1/4 size-[600px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" />
        <div
          className="absolute -bottom-1/3 -right-1/4 size-[600px] rounded-full bg-purple-600/20 blur-[120px] animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-8 shadow-2xl shadow-black/40"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <span className="text-4xl mb-2">🏠</span>
          <h1 className="text-2xl font-semibold tracking-tight text-gradient">EstateIQ</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI-Powered Real Estate Intelligence</p>
        </div>

        {/* Role selector */}
        <div className="mb-6 flex rounded-full border border-white/10 bg-white/5 p-1">
          {[
            { value: 'admin', label: 'Admin', icon: Shield },
            { value: 'sales', label: 'Sales Agent', icon: UserRound },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleRoleToggle(opt.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200',
                role === opt.value
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <opt.icon className="size-4" />
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
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
              className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo credentials -- Admin: <code className="text-foreground/80">admin123</code> · Sales:{' '}
          <code className="text-foreground/80">sales123</code>
        </p>
      </motion.div>
    </div>
  )
}

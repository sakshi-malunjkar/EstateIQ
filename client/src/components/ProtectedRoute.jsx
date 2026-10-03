import { Loader2 } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

// The single auth gate for every page under it (Dashboard, Analytics,
// Lead Detail, Lead Analysis), so no page needs its own session check.
export default function ProtectedRoute() {
  const { loading, session } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

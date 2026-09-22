import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Shown when the API request failed outright (network/backend down)
 * or the resource wasn't found, with a retry action. */
export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-card/60 py-16 px-6 text-center animate-fade-in">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="size-6 text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {message && <p className="max-w-sm text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 gap-1.5">
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      )}
    </div>
  )
}

/** Shown when a query succeeded but returned nothing. */
export function EmptyState({ title = 'Nothing here yet', message, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-card/60 py-16 px-6 text-center animate-fade-in">
      <div className="flex size-12 items-center justify-center rounded-full bg-white/5">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {message && <p className="max-w-sm text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}

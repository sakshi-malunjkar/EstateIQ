import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

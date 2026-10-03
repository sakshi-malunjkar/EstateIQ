import { BarChart3, Home, LayoutDashboard, LogOut, Sparkles } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getSession, logout } from '@/lib/auth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/analyze', label: 'Lead Analysis', icon: Sparkles },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const session = getSession()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 h-screen sticky top-0 border-r border-white/10 bg-sidebar text-white shadow-lg',
          'w-16 lg:w-64 transition-all duration-200'
        )}
      >
        <div className="flex items-center gap-2 px-4 h-16 shrink-0">
          <span className="rounded bg-yellow-400 p-1.5 text-[#131836]">
            <Home className="size-5 stroke-[2.5]" />
          </span>
          <span className="hidden lg:inline text-xl font-extrabold tracking-tight text-white">
            Estate<span className="font-black text-yellow-400">IQ</span>
          </span>
        </div>

        <Separator />

        <nav className="flex-1 flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  'hover:bg-white/5',
                  isActive
                    ? 'bg-white/10 text-white border border-white/10 shadow-sm [&>svg]:text-yellow-400'
                    : 'text-gray-300 hover:text-white'
                )
              }
            >
              <item.icon className="size-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <Separator />

        <div className="p-3 flex flex-col gap-2">
          {session && (
            <div className="hidden lg:flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">{session.email}</p>
                <span
                  className={cn(
                    'inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    session.role === 'admin'
                      ? 'bg-yellow-400/20 text-yellow-300'
                      : 'bg-blue-400/20 text-blue-200'
                  )}
                >
                  {session.role === 'admin' ? 'Admin' : 'Sales Agent'}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="size-5 shrink-0" />
            <span className="hidden lg:inline">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-white/10 flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-all duration-200 flex-1',
                isActive ? 'text-indigo-400' : 'text-gray-300 hover:text-white'
              )
            }
          >
            <item.icon className="size-5" />
            {item.label.split(' ')[0]}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-300 hover:text-red-400 flex-1"
        >
          <LogOut className="size-5" />
          Logout
        </button>
      </nav>
    </>
  )
}

function Separator() {
  return <div className="h-px bg-white/10 mx-3" />
}

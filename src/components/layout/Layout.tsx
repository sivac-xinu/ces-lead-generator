import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/utils/cn'
import { Toast } from '@/components/ui/Toast'
import { BarChart3, Briefcase, LayoutDashboard, LogOut, Phone, Settings, Shield, Users } from 'lucide-react'

const navItems = [
  { to: '/leads', label: 'Lead Discovery', icon: LayoutDashboard },
  { to: '/apis', label: 'API Sources', icon: Briefcase },
  { to: '/script', label: 'Script Generator', icon: Phone },
  { to: '/tracker', label: 'Call Tracker', icon: BarChart3 },
  { to: '/solutions', label: 'Solutions', icon: Settings, admin: false },
  { to: '/admin', label: 'Admin', icon: Shield, admin: true },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-ces-bg">
      <aside className="flex w-56 min-w-56 flex-col bg-ces-navy text-white">
        <div className="border-b border-white/10 p-4">
          <div className="text-xl font-bold">CES</div>
          <div className="text-xs text-white/60">IT Infrastructure · Lead Generator</div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems
            .filter(item => !item.admin || isAdmin)
            .map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname.startsWith(item.to)
                      ? 'bg-ces-orange text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Users className="h-3 w-3" />
            {user?.email}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
      <Toast />
    </div>
  )
}

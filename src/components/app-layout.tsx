import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth, useLogout } from '@/hooks/use-auth'
import { LayoutDashboard, Receipt, Upload, LogOut, Wallet, CreditCard, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transações', icon: Receipt },
  { to: '/accounts', label: 'Contas', icon: CreditCard },
  { to: '/loans', label: 'Dívidas', icon: TrendingDown },
  { to: '/import', label: 'Importar', icon: Upload },
]

export function AppLayout() {
  const { data: me } = useAuth()
  const logout = useLogout()
  useLocation() // for re-render on nav

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface/40 backdrop-blur-xl md:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-[0_0_24px_-4px_rgba(168,85,247,0.6)]">
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight">Whodo</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Ledger</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 h-5 w-0.5 rounded-r-full bg-primary" />
                  )}
                  <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold uppercase text-primary">
                {me?.name?.[0] || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{me?.name}</div>
                <div className="truncate text-xs text-muted-foreground">{me?.email}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-start"
              onClick={() => logout.mutate()}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth, useLogout } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Receipt,
  Upload,
  LogOut,
  Wallet,
  CreditCard,
  TrendingDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transações', icon: Receipt },
  { to: '/accounts', label: 'Contas', icon: CreditCard },
  { to: '/loans', label: 'Dívidas', icon: TrendingDown },
  { to: '/import', label: 'Importar', icon: Upload },
]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transações',
  '/accounts': 'Contas',
  '/loans': 'Dívidas',
  '/import': 'Importar extrato',
}

const SIDEBAR_STORAGE_KEY = 'whodo:sidebar-collapsed'

export function AppLayout() {
  const { data: me } = useAuth()
  const logout = useLogout()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Whodo Ledger'

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  })

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar — fixa, colapsável */}
      <aside
        className={cn(
          'hidden h-full shrink-0 flex-col transition-[width] duration-200 ease-out md:flex',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        <div className="flex h-11 items-center gap-2.5 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-[0_0_24px_-4px_rgba(168,85,247,0.7)]">
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-bold tracking-tight">Whodo</span>
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Ledger
              </span>
            </div>
          )}
        </div>
        <nav className={cn('flex flex-1 flex-col gap-1 overflow-y-auto pt-3', collapsed ? 'px-2' : 'px-3')}>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} title={collapsed ? item.label : undefined}>
              {({ isActive }) => (
                <span
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                    collapsed ? 'justify-center h-10 w-full' : 'px-3 py-2',
                    isActive
                      ? 'bg-surface text-foreground shadow-card'
                      : 'text-muted-foreground hover:bg-surface/60 hover:text-foreground',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground/70',
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        {/* Toggle no rodapé da sidebar */}
        <div className={cn('flex pb-4', collapsed ? 'justify-center px-2' : 'justify-end px-3')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="h-8 w-8 text-muted-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between gap-4 px-5 lg:px-7">
          <h2 className="truncate text-[13px] font-semibold tracking-tight">{pageTitle}</h2>
          <div className="flex items-center gap-2">
            <span className="hidden text-[13px] font-medium text-muted-foreground sm:inline">
              {me?.name}
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold uppercase text-primary">
              {me?.name?.[0] || '?'}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout.mutate()}
              aria-label="Sair"
              className="h-7 w-7 text-muted-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto rounded-l-[24px] bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

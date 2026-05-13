import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/kpi-card'
import { Money } from '@/components/money'
import { TrendingDown, TrendingUp, Wallet, Hash } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { formatDateShort, formatBRLCompact, formatBRL } from '@/lib/format'

const PALETTE = [
  '#a855f7', // violet
  '#22d3ee', // cyan
  '#f43f5e', // rose
  '#fbbf24', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#10b981', // emerald
  '#8b5cf6', // indigo
  '#f97316', // orange
  '#94a3b8', // slate (brighter — was #64748b)
]

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: api.dashboardSummary,
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 max-w-xl" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const empty = data.count === 0
  const flowData = data.daily_flow.map((d) => ({
    date: formatDateShort(d.date),
    entradas: d.income,
    saídas: d.expense,
    saldo: d.net,
  }))
  const categoryData = data.by_category
    .filter((c) => c.total_abs > 0)
    .slice(0, 10)
    .map((c) => ({ name: c.category_name, value: c.total_abs }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="capitalize">
            {new Date(data.period.from).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          {' '}· saldo acumulado considera todo o histórico
        </p>
      </div>

      {empty && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">Você ainda não tem transações neste período.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vá em <a href="/import" className="text-primary hover:underline">Importar</a> e suba seu primeiro extrato.
            </p>
          </CardContent>
        </Card>
      )}

      <KpiCard
        label="Saldo acumulado"
        value={data.total_balance}
        icon={Wallet}
        iconTone="primary"
        positiveColor
        hint="contas + extrato importado"
        hero
        className="max-w-xl"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Dívida total"
          value={-data.total_debt}
          icon={TrendingDown}
          iconTone="expense"
          hint={data.total_debt > 0 ? 'soma das dívidas ativas' : 'nenhuma dívida cadastrada'}
        />
        <KpiCard
          label="Entradas do mês"
          value={data.income}
          icon={TrendingUp}
          iconTone="income"
          positiveColor
          signless
        />
        <KpiCard
          label="Saídas do mês"
          value={data.expense}
          icon={TrendingDown}
          iconTone="expense"
          signless
        />
        <KpiCard
          label="Resultado do mês"
          value={data.balance}
          icon={Hash}
          iconTone={data.balance >= 0 ? 'income' : 'expense'}
          positiveColor
          hint={`${data.count} transações`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Fluxo diário</CardTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-income" />
                <span className="text-muted-foreground">Entradas</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-expense" />
                <span className="text-muted-foreground">Saídas</span>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <AreaChart data={flowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatBRLCompact(v)}
                    width={64}
                  />
                  <Tooltip formatter={(v: number) => formatBRL(v)} wrapperStyle={{ zIndex: 50, outline: 'none' }} />
                  <Area type="monotone" dataKey="entradas" stroke="#10b981" fill="url(#g-income)" strokeWidth={2} />
                  <Area type="monotone" dataKey="saídas" stroke="#f43f5e" fill="url(#g-expense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Sem gastos no período.</p>
            ) : (
              <>
                <div className="relative h-60 w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={64}
                        outerRadius={92}
                        paddingAngle={3}
                        stroke="hsl(225 16% 10%)"
                        strokeWidth={2}
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatBRL(v)}
                        wrapperStyle={{ zIndex: 50, outline: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total</div>
                    <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                      {formatBRLCompact(categoryData.reduce((s, c) => s + c.value, 0))}
                    </div>
                  </div>
                </div>
                <div className="my-4 h-px bg-border" />
                <ul className="space-y-3 text-sm">
                  {categoryData.slice(0, 6).map((c, i) => (
                    <li key={c.name} className="flex items-center justify-between">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full ring-2 ring-card"
                          style={{ background: PALETTE[i % PALETTE.length] }}
                        />
                        <span className="truncate font-semibold text-foreground">{c.name}</span>
                      </span>
                      <Money value={-c.value} className="text-foreground" />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

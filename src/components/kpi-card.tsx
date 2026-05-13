import { Money } from '@/components/money'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: number
  icon?: LucideIcon
  positiveColor?: boolean
  className?: string
  hint?: string
  signless?: boolean
  hero?: boolean
  iconTone?: 'primary' | 'income' | 'expense' | 'warning' | 'neutral'
}

const ICON_TONE: Record<NonNullable<KpiCardProps['iconTone']>, string> = {
  primary: 'bg-primary/15 text-primary',
  income: 'bg-income-soft text-income',
  expense: 'bg-expense-soft text-expense',
  warning: 'bg-warning-soft text-warning',
  neutral: 'bg-surface-hover text-muted-foreground',
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  positiveColor,
  className,
  hint,
  signless,
  hero,
  iconTone = 'neutral',
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border p-5 transition-colors',
        hero
          ? 'bg-hero-gradient border-border-strong/50'
          : 'bg-card-gradient hover:border-border-strong/60',
        className,
      )}
    >
      {hero && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
        />
      )}
      <div className="relative flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', ICON_TONE[iconTone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className={cn('relative mt-3 font-bold tracking-tight', hero ? 'text-4xl' : 'text-2xl')}>
        <Money value={value} positiveColor={positiveColor} signless={signless} />
      </div>
      {hint && <p className="relative mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

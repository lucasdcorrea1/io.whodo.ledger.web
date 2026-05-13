import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/format'

interface MoneyProps {
  value: number
  className?: string
  muted?: boolean
  positiveColor?: boolean
  signless?: boolean
}

export function Money({ value, className, muted, positiveColor, signless }: MoneyProps) {
  const isNegative = value < 0
  const isPositive = value > 0
  const color = muted
    ? 'text-muted-foreground'
    : isNegative
    ? 'text-expense'
    : isPositive && positiveColor
    ? 'text-income'
    : 'text-foreground'
  const display = signless ? formatBRL(Math.abs(value)) : formatBRL(value)
  return (
    <span
      className={cn('tabular-nums font-semibold tracking-tight', color, className)}
      aria-label={`${isNegative ? 'saída' : 'entrada'} ${display}`}
    >
      {display}
    </span>
  )
}

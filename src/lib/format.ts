const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatBRL(value: number): string {
  return brl.format(value)
}

export function formatBRLCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return brl.format(value)
}

const dateShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const dateFull = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function formatDateShort(d: string | Date): string {
  return dateShort.format(typeof d === 'string' ? new Date(d) : d)
}

export function formatDate(d: string | Date): string {
  return dateFull.format(typeof d === 'string' ? new Date(d) : d)
}

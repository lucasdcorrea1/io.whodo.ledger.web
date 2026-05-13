import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Transaction } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Money } from '@/components/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { formatDateShort } from '@/lib/format'
import { Receipt, Pencil, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'

const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Família',
  'Renda',
  'Transferência',
  'Outros',
]

export function TransactionsPage() {
  const [editing, setEditing] = useState<Transaction | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { limit: 200 }],
    queryFn: () => api.transactions({ limit: 200 }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clique numa linha para ajustar categoria, descrição ou valor.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
                <Receipt className="h-6 w-6" />
              </div>
              <p className="text-lg font-semibold">Nenhuma transação ainda</p>
              <p className="text-sm text-muted-foreground">
                Importe um extrato em <a href="/import" className="text-primary hover:underline">Importar</a>.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.items.map((t) => {
                const isPositive = t.amount > 0
                return (
                  <li
                    key={t.id}
                    className="group flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-hover"
                    onClick={() => setEditing(t)}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isPositive ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'
                      }`}
                    >
                      {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.description}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDateShort(t.occurred_at)}</span>
                        <span>·</span>
                        <span className="rounded-md bg-elevated px-1.5 py-0.5 text-foreground/80">
                          {t.category_name || 'Sem categoria'}
                        </span>
                      </div>
                    </div>
                    <Money value={t.amount} className="text-base" />
                    <Pencil className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {editing && (
        <EditTransactionDialog
          transaction={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function EditTransactionDialog({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const qc = useQueryClient()
  const [description, setDescription] = useState(transaction.description)
  const [amount, setAmount] = useState(String(transaction.amount))
  const [categoryName, setCategoryName] = useState(transaction.category_name || 'Outros')

  const txCache = qc.getQueryData<{ items: Transaction[] }>(['transactions', { limit: 200 }])
  const categoryMap = useMemo(() => {
    const m = new Map<string, string>()
    if (txCache) {
      for (const t of txCache.items) {
        if (t.category_name && t.category_id && !m.has(t.category_name)) {
          m.set(t.category_name, t.category_id)
        }
      }
    }
    return m
  }, [txCache])

  const categoryOptions = useMemo(() => {
    const names = new Set<string>(DEFAULT_CATEGORIES)
    for (const n of categoryMap.keys()) names.add(n)
    return Array.from(names)
  }, [categoryMap])

  const update = useMutation({
    mutationFn: () => {
      const id = categoryMap.get(categoryName)
      const payload: any = { description, amount: Number(amount) }
      if (id) payload.category_id = id
      return api.updateTransaction(transaction.id, payload)
    },
    onSuccess: () => {
      toast.success('Transação atualizada')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.message || 'falha ao salvar'),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate()
  }

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="Editar transação"
      description={formatDateShort(transaction.occurred_at)}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="desc">Descrição</Label>
          <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground/70">use negativo para saída</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat">Categoria</Label>
            <Select id="cat" value={categoryName} onChange={(e) => setCategoryName(e.target.value)}>
              {categoryOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            {!categoryMap.has(categoryName) && (
              <p className="text-xs text-warning">categoria nova — vai aparecer no extrato após salvar</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

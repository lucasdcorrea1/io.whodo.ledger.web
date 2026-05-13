import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Account, type CreateAccountInput } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Money } from '@/components/money'
import { Skeleton } from '@/components/ui/skeleton'
import { Wallet, CreditCard, PiggyBank, Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const KIND_ICON: Record<string, typeof Wallet> = {
  checking: Wallet,
  credit: CreditCard,
  savings: PiggyBank,
}

const KIND_LABEL: Record<string, string> = {
  checking: 'Conta corrente',
  credit: 'Cartão de crédito',
  savings: 'Poupança',
}

const KIND_TONE: Record<string, string> = {
  checking: 'bg-primary/15 text-primary',
  credit: 'bg-expense-soft text-expense',
  savings: 'bg-income-soft text-income',
}

export function AccountsPage() {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.listAccounts,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre o saldo inicial para o Saldo acumulado bater com a realidade.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nova conta
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg font-semibold">Você ainda não tem contas cadastradas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((acc) => {
            const Icon = KIND_ICON[acc.kind] || Wallet
            return (
              <Card key={acc.id} className="cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${KIND_TONE[acc.kind] || KIND_TONE.checking}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{acc.name}</div>
                        <p className="text-xs text-muted-foreground">
                          {KIND_LABEL[acc.kind] || acc.kind} · {acc.bank}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(acc)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-5">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Saldo inicial
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      <Money value={acc.initial_balance} positiveColor />
                    </div>
                    {acc.initial_balance_date && acc.initial_balance_date !== '0001-01-01T00:00:00Z' && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        em {new Date(acc.initial_balance_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AccountFormDialog open={creating} onClose={() => setCreating(false)} />
      {editing && (
        <AccountFormDialog open={true} onClose={() => setEditing(null)} account={editing} />
      )}
    </div>
  )
}

interface FormProps {
  open: boolean
  onClose: () => void
  account?: Account
}

function AccountFormDialog({ open, onClose, account }: FormProps) {
  const qc = useQueryClient()
  const editing = !!account
  const [name, setName] = useState(account?.name || '')
  const [bank, setBank] = useState(account?.bank || 'nubank')
  const [kind, setKind] = useState(account?.kind || 'checking')
  const [balance, setBalance] = useState(String(account?.initial_balance ?? 0))
  const [date, setDate] = useState(() => {
    if (account?.initial_balance_date && account.initial_balance_date !== '0001-01-01T00:00:00Z') {
      return account.initial_balance_date.slice(0, 10)
    }
    return new Date().toISOString().slice(0, 10)
  })

  const create = useMutation({
    mutationFn: (input: CreateAccountInput) => api.createAccount(input),
    onSuccess: () => {
      toast.success('Conta criada')
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.message || 'falha ao criar'),
  })

  const update = useMutation({
    mutationFn: () =>
      api.updateAccount(account!.id, {
        name,
        kind,
        initial_balance: Number(balance),
        initial_balance_date: date ? new Date(date + 'T00:00:00Z').toISOString() : undefined,
      }),
    onSuccess: () => {
      toast.success('Conta atualizada')
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.message || 'falha ao salvar'),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      update.mutate()
    } else {
      create.mutate({
        name,
        bank,
        kind,
        initial_balance: Number(balance),
        initial_balance_date: date ? new Date(date + 'T00:00:00Z').toISOString() : undefined,
      })
    }
  }

  const pending = create.isPending || update.isPending

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Editar conta' : 'Nova conta'}
      description={editing ? account?.name : 'Cadastre uma nova conta bancária ou cartão.'}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        {!editing && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bank">Banco</Label>
            <Input
              id="bank"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="nubank, itau, bradesco..."
              required
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kind">Tipo</Label>
          <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="checking">Conta corrente</option>
            <option value="credit">Cartão de crédito</option>
            <option value="savings">Poupança</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="balance">Saldo inicial (R$)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70">
          Use o saldo da conta na data acima. Tudo no extrato a partir dela vai somar/subtrair desse valor.
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

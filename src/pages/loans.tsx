import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  type Loan,
  type LoanKind,
  type CreateLoanInput,
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Money } from '@/components/money'
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Plus,
  Trash2,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateShort, formatBRL } from '@/lib/format'

export function LoansPage() {
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState<Loan | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: api.listLoans,
  })

  const loans = data?.items || []
  const totalDebt = loans
    .filter((l) => l.active && l.balance > 0)
    .reduce((sum, l) => sum + l.balance, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dívidas</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre suas dívidas. O app calcula saldo atual, juros acumulados e quando vai quitar.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nova dívida
        </Button>
      </div>

      {!isLoading && loans.length > 0 && (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-expense/10 text-expense">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Dívida total ativa</div>
              <div className="text-2xl font-bold">
                <Money value={-totalDebt} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">Nenhuma dívida cadastrada.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Clique em "Nova dívida" pra cadastrar um financiamento, parcelamento ou empréstimo informal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {loans.map((l) => (
            <LoanCard key={l.id} loan={l} onClick={() => setDetail(l)} />
          ))}
        </div>
      )}

      <LoanFormDialog open={creating} onClose={() => setCreating(false)} />
      {detail && <LoanDetailDialog loan={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function LoanCard({ loan: l, onClick }: { loan: Loan; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer transition-shadow hover:shadow-md"
    >
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="min-w-0">
          <CardTitle className="truncate text-base text-foreground">{l.name}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {l.creditor || '—'} · {KIND_LABEL[l.kind]}
          </p>
        </div>
        {!l.active && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">inativa</span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-xs text-muted-foreground">Saldo devedor</div>
          <div className="text-2xl font-bold">
            <Money value={-l.balance} />
          </div>
        </div>
        {l.never_pays_off ? (
          <div className="flex items-start gap-2 rounded-md bg-expense/10 p-2 text-xs text-expense">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Pagamento de <strong>{formatBRL(l.monthly_payment)}</strong> não cobre os juros mensais.
              Aumente para pelo menos {formatBRL(l.balance * l.interest_rate_monthly + 1)} para começar a amortizar.
            </span>
          </div>
        ) : l.balance === 0 ? (
          <div className="rounded-md bg-income/10 p-2 text-xs text-income">
            Quitada — paga em {l.payments_count} pagamentos
          </div>
        ) : l.projected_months_left > 0 ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Falta</div>
              <div className="font-semibold">
                {l.projected_months_left} {l.projected_months_left === 1 ? 'mês' : 'meses'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Quita em</div>
              <div className="font-semibold capitalize">
                {l.projected_payoff
                  ? new Date(l.projected_payoff).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
                  : '—'}
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <span className="text-muted-foreground">
            Parcela: <span className="font-medium text-foreground">{formatBRL(l.monthly_payment)}</span>
          </span>
          {l.next_due_date && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatDateShort(l.next_due_date)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const KIND_LABEL: Record<LoanKind, string> = {
  with_interest: 'Com juros',
  fixed_installments: 'Parcelado',
  informal: 'Informal (sem juros)',
}

interface LoanFormProps {
  open: boolean
  onClose: () => void
  loan?: Loan
}

function LoanFormDialog({ open, onClose, loan }: LoanFormProps) {
  const qc = useQueryClient()
  const editing = !!loan
  const [name, setName] = useState(loan?.name || '')
  const [creditor, setCreditor] = useState(loan?.creditor || '')
  const [kind, setKind] = useState<LoanKind>((loan?.kind as LoanKind) || 'with_interest')
  const [principal, setPrincipal] = useState(String(loan?.principal ?? ''))
  const [rate, setRate] = useState(String((loan?.interest_rate_monthly ?? 0.01) * 100))
  const [payment, setPayment] = useState(String(loan?.monthly_payment ?? ''))
  const [installments, setInstallments] = useState(String(loan?.installments_total ?? ''))
  const [startDate, setStartDate] = useState(() => {
    if (loan?.start_date) return loan.start_date.slice(0, 10)
    return new Date().toISOString().slice(0, 10)
  })
  const [dueDay, setDueDay] = useState(String(loan?.due_day ?? 10))

  const create = useMutation({
    mutationFn: (input: CreateLoanInput) => api.createLoan(input),
    onSuccess: () => {
      toast.success('Dívida cadastrada')
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.message || 'falha'),
  })

  const update = useMutation({
    mutationFn: () =>
      api.updateLoan(loan!.id, {
        name,
        creditor,
        kind,
        principal: Number(principal),
        interest_rate_monthly: kind === 'with_interest' ? Number(rate) / 100 : 0,
        monthly_payment: Number(payment),
        installments_total: kind === 'fixed_installments' ? Number(installments) : 0,
        start_date: new Date(startDate + 'T00:00:00Z').toISOString(),
        due_day: Number(dueDay),
      }),
    onSuccess: () => {
      toast.success('Dívida atualizada')
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.message || 'falha'),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: CreateLoanInput = {
      name,
      creditor,
      kind,
      principal: Number(principal),
      interest_rate_monthly: kind === 'with_interest' ? Number(rate) / 100 : 0,
      monthly_payment: Number(payment),
      installments_total: kind === 'fixed_installments' ? Number(installments) : 0,
      start_date: new Date(startDate + 'T00:00:00Z').toISOString(),
      due_day: Number(dueDay),
    }
    if (editing) update.mutate()
    else create.mutate(payload)
  }

  const pending = create.isPending || update.isPending

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Editar dívida' : 'Nova dívida'}
      description={editing ? loan?.name : 'Financiamento, empréstimo ou parcelamento.'}
      className="max-w-lg"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Carro" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="creditor">Credor</Label>
            <Input id="creditor" value={creditor} onChange={(e) => setCreditor(e.target.value)} placeholder="Banco X, Felipe..." />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kind">Tipo</Label>
          <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as LoanKind)}>
            <option value="with_interest">Com juros (financiamento, empréstimo)</option>
            <option value="fixed_installments">Parcelado em N vezes fixas</option>
            <option value="informal">Informal (sem juros, sem schedule)</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="principal">Valor original (R$)</Label>
            <Input
              id="principal"
              type="number"
              step="0.01"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="20000"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment">Pagamento mensal (R$)</Label>
            <Input
              id="payment"
              type="number"
              step="0.01"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              placeholder="1000"
            />
          </div>
        </div>
        {kind === 'with_interest' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rate">Juros mensal (%)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="1.0"
            />
            <p className="text-xs text-muted-foreground">Ex.: 1.0 significa 1% ao mês — informe a taxa do contrato.</p>
          </div>
        )}
        {kind === 'fixed_installments' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="installments">Número de parcelas</Label>
            <Input
              id="installments"
              type="number"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
              placeholder="48"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start">Data inicial</Label>
            <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="due">Dia de vencimento</Label>
            <Input
              id="due"
              type="number"
              min="1"
              max="28"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          </div>
        </div>
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

function LoanDetailDialog({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(String(loan.monthly_payment || ''))
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentNote, setPaymentNote] = useState('')

  const { data } = useQuery({
    queryKey: ['loan', loan.id],
    queryFn: () => api.getLoan(loan.id),
  })

  const addPayment = useMutation({
    mutationFn: () =>
      api.addLoanPayment(loan.id, {
        amount: Number(paymentAmount),
        date: new Date(paymentDate + 'T00:00:00Z').toISOString(),
        note: paymentNote,
      }),
    onSuccess: () => {
      toast.success('Pagamento registrado')
      qc.invalidateQueries({ queryKey: ['loan', loan.id] })
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setPaymentAmount(String(loan.monthly_payment || ''))
      setPaymentNote('')
    },
    onError: (err: any) => toast.error(err?.message || 'falha'),
  })

  const deletePayment = useMutation({
    mutationFn: (paymentId: string) => api.deleteLoanPayment(loan.id, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan', loan.id] })
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const remove = useMutation({
    mutationFn: () => api.deleteLoan(loan.id),
    onSuccess: () => {
      toast.success('Dívida removida')
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  if (editing) {
    return <LoanFormDialog open={true} onClose={() => setEditing(false)} loan={data?.loan || loan} />
  }

  const cur = data?.loan || loan

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={cur.name}
      description={`${KIND_LABEL[cur.kind as LoanKind]} · ${cur.creditor || '—'}`}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Wallet} label="Saldo devedor" value={<Money value={-cur.balance} />} />
          <Stat icon={CircleDollarSign} label="Total pago" value={<Money value={cur.total_paid} positiveColor signless />} />
          <Stat
            icon={TrendingDown}
            label="Juros pagos"
            value={<span className="text-base font-bold">{formatBRL(cur.interest_accrued)}</span>}
          />
          <Stat
            icon={CalendarClock}
            label="Próx. vencimento"
            value={
              <span className="text-base font-bold capitalize">
                {cur.next_due_date ? new Date(cur.next_due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
              </span>
            }
          />
        </div>

        {cur.never_pays_off ? (
          <div className="flex items-start gap-2 rounded-md bg-expense/10 p-3 text-sm text-expense">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Pagamento mensal abaixo dos juros</p>
              <p className="text-xs">
                Juros mensais atuais: {formatBRL(cur.balance * cur.interest_rate_monthly)}. Você precisa pagar pelo menos{' '}
                {formatBRL(cur.balance * cur.interest_rate_monthly + 1)} pra começar a reduzir o saldo.
              </p>
            </div>
          </div>
        ) : cur.balance > 0 && cur.projected_months_left > 0 ? (
          <div className="rounded-md bg-muted p-3 text-sm">
            Pagando {formatBRL(cur.monthly_payment)} por mês, vai quitar em{' '}
            <strong>
              {cur.projected_months_left} {cur.projected_months_left === 1 ? 'mês' : 'meses'}
            </strong>
            {cur.projected_payoff && (
              <>
                {' '}
                (
                <span className="capitalize">
                  {new Date(cur.projected_payoff).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                )
              </>
            )}
            .
          </div>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Registrar pagamento</h3>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Valor"
            />
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            <Button onClick={() => addPayment.mutate()} disabled={addPayment.isPending || !paymentAmount}>
              {addPayment.isPending ? '…' : 'Adicionar'}
            </Button>
          </div>
          <Input
            className="mt-2"
            placeholder="Observação (opcional)"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Pagamentos ({data?.payments.length || 0})</h3>
          {!data || data.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {data.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      <Money value={p.amount} positiveColor signless />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateShort(p.date)}
                      {p.note && ` · ${p.note}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePayment.mutate(p.id)}
                    aria-label="Excluir pagamento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm('Remover esta dívida? Pagamentos também serão apagados.')) {
                remove.mutate()
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Excluir dívida
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={() => setEditing(true)}>Editar dados</Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-base font-bold">{value}</div>
    </div>
  )
}

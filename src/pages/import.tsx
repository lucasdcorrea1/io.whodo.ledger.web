import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ImportJob } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Upload, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/format'

export function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [accountId, setAccountId] = useState<string>('')
  const qc = useQueryClient()

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.listAccounts,
  })

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadImport(file, accountId || undefined),
    onSuccess: (job) => {
      toast.success(`${job.imported} novas · ${job.skipped} duplicadas`)
      qc.invalidateQueries({ queryKey: ['imports'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (err: any) => toast.error(err?.message || 'falha no upload'),
  })

  const { data: jobs } = useQuery({
    queryKey: ['imports'],
    queryFn: () => api.listImports(),
    refetchInterval: 3000,
  })

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const f = files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      toast.error('arquivo > 5MB')
      return
    }
    upload.mutate(f)
  }

  const accountOptions = accounts?.items || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar extrato</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV do Nubank (formato exportado direto do app).
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account">Conta de destino</Label>
            <Select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Padrão (Nubank corrente)</option>
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.bank} · {a.kind}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground/70">
              Não tem a conta certa?{' '}
              <a href="/accounts" className="text-primary hover:underline">Cadastre em Contas</a>.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 text-center transition-all ${
              dragOver
                ? 'border-primary bg-primary/10 shadow-[0_0_32px_-8px_rgba(168,85,247,0.5)]'
                : 'border-border hover:border-primary/50 hover:bg-surface-hover'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold">Solte o CSV aqui ou clique para escolher</div>
            <div className="text-xs text-muted-foreground">.csv até 5MB</div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          {upload.isPending && (
            <p className="text-center text-sm text-muted-foreground">processando…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Importações recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!jobs || jobs.items.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhuma importação ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {jobs.items.map((j) => (
                <JobRow key={j.id} job={j} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function JobRow({ job }: { job: ImportJob }) {
  const Icon = job.status === 'done' ? CheckCircle2 : job.status === 'failed' ? AlertTriangle : FileText
  const tone =
    job.status === 'done'
      ? 'bg-income-soft text-income'
      : job.status === 'failed'
      ? 'bg-expense-soft text-expense'
      : 'bg-surface-hover text-muted-foreground'
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{job.filename}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatDateShort(job.created_at)} · {job.imported} novas, {job.skipped} duplicadas
          {job.failed > 0 && `, ${job.failed} falharam`}
        </div>
      </div>
      <span
        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}
      >
        {job.status === 'done' ? 'concluído' : job.status === 'failed' ? 'falhou' : job.status}
      </span>
    </li>
  )
}

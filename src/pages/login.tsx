import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, useLogin } from '@/hooks/use-auth'
import { Wallet } from 'lucide-react'

export function LoginPage() {
  const { data: me } = useAuth()
  const login = useLogin()
  const navigate = useNavigate()
  const [email, setEmail] = useState('lucas@whodo.io')
  const [password, setPassword] = useState('whodo123')
  const [error, setError] = useState<string | null>(null)

  if (me) return <Navigate to="/" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login.mutateAsync({ email, password })
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'falha no login')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(168,85,247,0.25)_0%,rgba(168,85,247,0)_100%)]"
      />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_32px_-4px_rgba(168,85,247,0.7)]">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Whodo Ledger</h1>
          <p className="text-sm text-muted-foreground">Finanças pessoais sob controle.</p>
        </div>
        <Card className="border-border-strong/40">
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-expense">{error}</p>}
              <Button type="submit" size="lg" disabled={login.isPending}>
                {login.isPending ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

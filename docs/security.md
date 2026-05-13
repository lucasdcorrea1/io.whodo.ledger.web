# Segurança — Whodo Ledger Web

O front lida com dados financeiros e vai estar exposto na internet. Não dá pra "confiar no usuário" — vamos servir para qualquer browser, qualquer extensão, qualquer rede.

## 1. Token de autenticação — cookie httpOnly, sempre

**Não use `localStorage`/`sessionStorage` para token de sessão.** Qualquer XSS (injeção de JS) lê tudo que está lá. A defesa primária é cookie `httpOnly + Secure + SameSite`, que o JS do browser **nem consegue ler**.

O fluxo:

1. Front faz `POST /auth/login` com `credentials: 'include'`.
2. API responde com `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax; Path=/`.
3. Todas as chamadas subsequentes incluem o cookie automaticamente (`credentials: 'include'` no fetch).
4. Logout: `POST /auth/logout` → API responde com `Set-Cookie` que expira.

No código do front, **não há manipulação manual de token**. O cliente HTTP só precisa `credentials: 'include'`.

```ts
// shared/lib/api/client.ts
const res = await fetch(`${API_URL}${path}`, {
  ...init,
  credentials: 'include',   // browser cuida do cookie
  headers: { 'Content-Type': 'application/json', ...init.headers },
})
```

## 2. Variáveis de ambiente — apenas `VITE_PUBLIC_*` chegam ao bundle

Tudo que o front lê via `import.meta.env.X` **vai parar no JS final, visível para qualquer um**. Isso é como o Vite funciona — não é bug.

Convenção:
- `VITE_PUBLIC_API_URL` — público por natureza, URL da API. OK no bundle.
- `VITE_PUBLIC_SENTRY_DSN` — DSN é desenhado para ser público.
- **Qualquer outra coisa: não está no front.** Se "precisar" estar, repensa: deveria ser uma chamada à API com o secret guardado lá.

`.env.local` está no `.gitignore`. `.env.example` commitado tem valores fake.

```
# .env.example
VITE_PUBLIC_API_URL=http://localhost:8080
```

## 3. CSP (Content Security Policy) — definido no nginx em prod

O nginx que serve o build estático em prod (ver [deployment.md](./deployment.md)) injeta:

```
Content-Security-Policy: default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self' https://api.whodo.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

Se for adicionar CDN ou serviço externo, atualize o CSP. **Não use `'unsafe-inline'` em `script-src`** — isso destrói a proteção contra XSS.

## 4. XSS — React protege, mas tem fendas

React escapa por padrão. As fendas a evitar:

- **`dangerouslySetInnerHTML`**: proibido sem revisão. Se for absolutamente necessário (renderizar markdown do usuário), passe por `DOMPurify.sanitize` antes.
- **URLs em `href`/`src`**: validar protocolo. Atacante pode injetar `javascript:alert(1)`. Use helper:
  ```ts
  function safeHref(url: string): string | undefined {
    try {
      const u = new URL(url, window.location.origin)
      if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') return u.href
    } catch {}
    return undefined
  }
  ```
- **`<iframe srcdoc>`** com conteúdo do usuário: nunca.

## 5. Cabeçalhos de segurança — definidos no nginx em prod

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 6. CORS — do lado do servidor

CORS é regra do **servidor**, não do front. A API responde com `Access-Control-Allow-Origin: https://app.whodo.io` em prod, e o browser respeita. Front não tem o que configurar aqui — só usar `credentials: 'include'` (e ter `Access-Control-Allow-Credentials: true` na API).

## 7. Dependências

- `npm audit` na pipeline de CI. Vulnerabilidade `high`/`critical` bloqueia merge.
- Renovate ou Dependabot para PRs automáticos de update.
- Antes de adicionar uma dep: ela é mantida? Tem testes? Quantos downloads/issues? Repo abandonado é débito.

## 8. Erros — mensagens amigáveis, nada de stack

Erro da API mostrado ao usuário: texto amigável do campo `error.message`. Stack/JSON cru nunca aparece na UI.

Em dev pode mostrar mais detalhe (ex.: toast com `error.requestId`). Em prod, só o essencial. Use `import.meta.env.DEV` para condicionar.

## 9. Sentry (quando configurar)

- DSN como `VITE_PUBLIC_SENTRY_DSN` (público por design).
- **Configurar `beforeSend`** para limpar dados sensíveis (e-mail, valores de transação) antes de enviar.
- Não capturar conteúdo de input (`maskAllInputs: true` no replay, se usar).

## 10. Checklist antes de deploy

- [ ] `.env.local` não está no commit.
- [ ] Nenhum `console.log` com dado de usuário ficou no código.
- [ ] `import.meta.env.*` usados começam todos com `VITE_PUBLIC_`.
- [ ] Build de prod (`npm run build`) gera arquivos sem secrets (grep no `dist/`).
- [ ] nginx em prod injeta CSP, HSTS, X-Frame-Options.
- [ ] HTTPS válido (cert renovado, redirecionamento http → https).
- [ ] `npm audit` sem `high`/`critical`.

## 11. Em caso de incidente

Se aparecer XSS reportado ou suspeito:

1. Reproduzir e isolar o ponto.
2. Reverter para versão segura (rollback).
3. Forçar invalidação de sessões (API roda script).
4. Patch + redeploy.
5. Comunicar usuários afetados se houve exfiltração.

Documentar conforme acontecer.

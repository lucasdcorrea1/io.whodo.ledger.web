# Whodo Ledger — Web

Front-end do **Whodo Ledger**, app de finanças pessoais da marca Whodo. SPA que conversa com a API em `io.whodo.ledger.api`.

🌐 **Live:** https://lucasdcorrea1.github.io/io.whodo.ledger.web/

> A interface está publicada, mas o backend (`io.whodo.ledger.api`) ainda não está em produção — login e dados ainda não funcionam no ar. Para usar com dados reais, rode local com Docker (veja abaixo).

## Stack

- **React 19** + **TypeScript** + **Vite**
- **TanStack Router** (routing tipado) + **TanStack Query** (estado servidor) + **TanStack Table** (tabelas)
- **Tailwind CSS v4** + **shadcn/ui** (componentes base) + **Tremor Raw** (charts e dashboards financeiros)
- **Lucide React** (ícones) + **Sonner** (toasts) + **motion** (animações)
- **React Hook Form** + **Zod** (forms + validação)
- **Docker** com hot reload (Vite HMR) em dev, nginx servindo build estático em prod

Política: dependências mínimas e justificadas. Catálogo completo em [docs/design-system.md](./docs/design-system.md). Regras em [CLAUDE.md](./CLAUDE.md).

## Rodando local

Pré-requisitos: Docker Desktop. A API (`io.whodo.ledger.api`) precisa estar rodando — suba ela primeiro.

```bash
cp .env.example .env.local       # ajuste a URL da API se necessário
docker compose up                # sobe vite dev server
```

O front fica em `http://localhost:5173`. Salvar qualquer arquivo dá HMR instantâneo (sem reload da página, estado preservado).

## Rodando em produção

```bash
docker compose -f docker-compose.prod.yml up -d
```

Mesma origem (Dockerfile multi-stage), target `prod`: faz `vite build` e serve via nginx com headers de segurança. Veja [docs/deployment.md](./docs/deployment.md).

## Estrutura

```
.
├── src/
│   ├── app/                # Router raiz, app shell, providers
│   ├── features/           # Uma pasta por feature de domínio
│   │   ├── accounts/
│   │   ├── transactions/
│   │   └── reports/
│   ├── shared/
│   │   ├── ui/             # Primitivas de design system (shadcn customizado)
│   │   ├── hooks/          # Hooks utilitários genéricos
│   │   └── lib/            # Cliente HTTP, helpers, schemas comuns
│   ├── styles/             # Tailwind config consumido aqui
│   └── main.tsx
├── docs/
│   ├── architecture.md
│   ├── security.md
│   └── deployment.md
├── .env.example
├── Dockerfile
├── docker-compose.yml          # dev
├── docker-compose.prod.yml     # prod
└── package.json
```

Detalhamento em [docs/architecture.md](./docs/architecture.md).

## Documentos

- [CLAUDE.md](./CLAUDE.md) — convenções de desenvolvimento (humano e IA)
- [docs/architecture.md](./docs/architecture.md) — feature-based, componentização, estado
- [docs/design-system.md](./docs/design-system.md) — paleta de libs, tokens, padrões de componente
- [docs/security.md](./docs/security.md) — XSS, cookies, env, CSP
- [docs/deployment.md](./docs/deployment.md) — Docker dev vs prod, nginx

## Convenções rápidas

- Toda chamada à API passa pelo cliente HTTP em `shared/lib/api/`. Nunca `fetch` direto em componente.
- Estado de servidor (dados da API) → TanStack Query. Estado de UI local → `useState`/`useReducer` ou Zustand para slice global pequeno.
- Cada feature exporta sua interface pública via `index.ts`. O resto é privado.
- Formulários sempre com `react-hook-form` + schema Zod.
- Nada de `any`. Use `unknown` se precisar de fallback.
- Nada de credencial em `import.meta.env` que não seja `VITE_PUBLIC_*`. Secrets do front vazam no bundle.

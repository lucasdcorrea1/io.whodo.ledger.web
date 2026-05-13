# Arquitetura — Whodo Ledger Web

O front é uma SPA React organizada em torno de **features de domínio**, não de tipos técnicos. Cada feature é uma fatia vertical: rotas, componentes, queries, schemas e tipos juntos.

## Visão geral

```
src/
├── app/                         # Boot: router, providers, app shell
├── features/                    # ⭐ Onde mora a maior parte do código
│   ├── accounts/
│   ├── transactions/
│   ├── categories/
│   ├── budgets/
│   ├── reports/
│   ├── import/                  # Upload de extrato + acompanhamento de job
│   ├── chat/                    # Conversa com agentes de IA (SSE streaming)
│   ├── goals/                   # Metas financeiras
│   └── auth/
├── shared/
│   ├── ui/                      # Primitivas de design system (Button, Input, Dialog…)
│   ├── lib/                     # api client, formatters, stores globais
│   └── hooks/                   # hooks genéricos sem cara de feature
├── styles/
└── main.tsx
```

## Anatomia de uma feature

Toma `transactions` como referência:

```
src/features/transactions/
├── api/
│   ├── useTransactions.ts          # query (GET list)
│   ├── useTransaction.ts           # query (GET by id)
│   ├── useCreateTransaction.ts     # mutation
│   ├── useUpdateTransaction.ts     # mutation
│   ├── useDeleteTransaction.ts     # mutation
│   └── schemas.ts                  # Zod: TransactionSchema, CreateInputSchema, etc.
├── components/
│   ├── TransactionList.tsx
│   ├── TransactionRow.tsx
│   ├── TransactionForm.tsx
│   └── TransactionFilters.tsx
├── routes/
│   ├── index.tsx                   # /transactions
│   └── $id.tsx                     # /transactions/:id
├── types.ts                        # type Transaction = z.infer<typeof TransactionSchema>
└── index.ts                        # interface pública: o que outras features podem importar
```

**Regra mental**: se você está editando uma feature e precisa mexer em **dois arquivos fora dela**, algo está errado — ou a feature precisa exportar mais, ou a coisa que você está fazendo é genuinamente compartilhada e devia estar em `shared/`.

## A camada `app/`

Boot e composição. Não tem lógica de negócio.

```
src/app/
├── router.tsx              # cria o router do TanStack Router, monta árvore de rotas
├── providers.tsx           # QueryClientProvider, ThemeProvider, etc.
├── layouts/
│   ├── AppLayout.tsx       # sidebar + topbar + outlet
│   └── AuthLayout.tsx      # centralizado, sem chrome (login/register)
└── error/
    └── ErrorBoundary.tsx
```

## A camada `shared/`

```
src/shared/
├── ui/                     # Design system. shadcn/ui copiado e customizado.
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── select.tsx
│   ├── form.tsx
│   └── ...
├── lib/
│   ├── api/
│   │   ├── client.ts           # fetch wrapper com auth, error mapping, Zod parse
│   │   └── errors.ts           # ApiError, isApiError
│   ├── format/
│   │   ├── currency.ts         # formatBRL(123.45) -> "R$ 123,45"
│   │   └── date.ts             # formatDate, formatRelative
│   ├── stores/
│   │   └── useUIStore.ts       # Zustand: theme, sidebar open
│   └── utils/
│       └── cn.ts               # clsx wrapper
└── hooks/
    ├── useDebounce.ts
    └── useMediaQuery.ts
```

## Estado: três tipos, três ferramentas

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Servidor (API)                Cliente (UI)                │
│   ────────────────              ────────────────            │
│                                                             │
│   TanStack Query                useState  / useReducer      │
│   (cache, refetch,              (estado local de            │
│    dedupe, invalidação)          componente)                │
│                                                             │
│                                 Zustand (global UI:         │
│                                  tema, sidebar, etc.)       │
│                                                             │
│                                 Router search params        │
│                                 (filtros, paginação:        │
│                                  URL é fonte da verdade)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Erros comuns a evitar**:
- Copiar `data` do TanStack Query para um `useState` ("para poder modificar"). Não. Use `mutation` para escrita, deixe o cache lidar com a sincronização.
- Guardar `selectedFilter` no Zustand. Não. Vai no URL via search params — refresh preserva, link compartilhável funciona.

## Fluxo típico: criar transação

```
TransactionForm (component)
  │
  ├─ react-hook-form com zodResolver(createTransactionSchema)
  │
  ├─ onSubmit: chama useCreateTransaction().mutate(data)
  │
  ▼
useCreateTransaction (hook em features/transactions/api/)
  │
  ├─ useMutation do TanStack Query
  ├─ chama apiClient.post('/transactions', data)
  ├─ onSuccess: invalida queryKey ['transactions']
  │
  ▼
apiClient (shared/lib/api/client.ts)
  │
  ├─ monta fetch com credentials: 'include'
  ├─ trata 401 → redirect /login
  ├─ parseia resposta com Zod
  │
  ▼
API HTTP
```

Cada peça tem uma responsabilidade clara, é testável isolada, e pode ser trocada sem cascata.

## Roteamento

TanStack Router com **file-based routing**. Cada feature declara suas rotas em `features/<x>/routes/` e são montadas em `app/router.tsx`. Vantagens:

- Tipos de params, search params e contexto são inferidos do código.
- Loaders permitem pré-carregar dados da query antes do render.
- Search params são fonte da verdade para filtros (URL compartilhável, voltar/avançar funciona).

## Estilo e design system

Stack completa em [docs/design-system.md](./design-system.md). Regras arquiteturais:

- **Tailwind v4** é a única forma de estilizar. Sem CSS modules, sem styled-components.
- **shadcn/ui** (base) + **Tremor Raw** (dashboards/charts) — componentes copiados para `shared/ui/`, não dep npm. Você controla o código.
- **Tokens** (cores semânticas income/expense/warning, tipografia, espaçamento) no `tailwind.config.ts` + `globals.css`. Mudou design = um lugar só.
- **Variantes** via **class-variance-authority** (`cva`) quando um componente tem variantes (`<Button variant="primary" size="sm">`).
- Componente de `shared/ui/` **não decide layout** (margins, posicionamento) — quem usa decide via `className`. Componente decide aparência interna.
- Componentes especializados em finanças (`<Money>`, `<KpiCard>`, `<TransactionRow>`, `<ChartContainer>`) moram em `shared/ui/` e são a forma **única** de exibir aqueles dados em todo o app.

## Acessibilidade

- Botão = `<button>`. Sempre.
- Input sempre com `<label htmlFor>`.
- Modais com foco gerenciado (shadcn/Radix já fazem).
- Cor não é o único indicador de erro (texto + ícone também).
- Teste com teclado: dá pra navegar tudo só com Tab/Enter/Escape?
- `prefers-reduced-motion` respeitado em animações.

## Performance

Não otimize antes do tempo. Quando perceber lag:

1. React DevTools Profiler para achar render desnecessário.
2. `memo`, `useMemo`, `useCallback` cirurgicamente. Não preventivamente.
3. Code splitting por rota (TanStack Router faz por feature).
4. `react-virtual` para listas grandes (>200 itens).
5. Imagens com `loading="lazy"` e dimensões definidas.

## Features com particularidades

A maioria das features segue o padrão de `transactions` (CRUD com TanStack Query). Duas saem do molde e merecem atenção:

### `features/import/`

- Upload `multipart/form-data` (não JSON).
- API responde com `ImportJob` em status `parsing` e processa async.
- UI faz **polling** do job (`useImportJob(jobId)`, `refetchInterval: 2000` enquanto não `done`).
- Resultado: cartão com sumário (`X importadas, Y skip de duplicata, Z categorizadas pela IA`) e link "Ver transações importadas".

### `features/chat/`

- Streaming SSE sobre POST (cf. [CLAUDE.md#streaming](../CLAUDE.md#streaming-chat-com-ia)).
- Histórico via TanStack Query (`useConversation(id)`); turno novo via hook customizado de streaming.
- Estado da mensagem em andamento: local no componente (`useState<string>` acumulando deltas).
- Quando `done`, invalida `['conversation', id]` para o histórico ficar consistente.
- Indicadores de tool use: chip inline ("consultando transações de fevereiro...") aparece e some entre `tool_use_start` e `tool_use_end`.
- Propostas vindas de tool gated (criar goal, criar budget, regra): renderiza como **card de ação** com botões "Aplicar" e "Descartar". "Aplicar" faz `POST` no endpoint específico (não passa de novo pelo agente).

## Quando NÃO seguir esta arquitetura

Spike de exploração, prova de conceito de uma lib nova, página one-off de marketing: faça em um diretório isolado (`src/spike/`, `src/marketing/`) e não importe de `features/` ou `shared/`. Quando virar permanente, refatore para a estrutura.

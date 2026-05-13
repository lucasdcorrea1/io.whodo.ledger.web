# CLAUDE.md — Whodo Ledger Web

Instruções para humanos e agentes de IA trabalhando neste repositório. Leia antes de qualquer mudança.

## Princípios

1. **Organização por feature, não por tipo**. Tudo que pertence a "transactions" vive em `src/features/transactions/`: componentes, hooks, queries, schemas, testes. Pasta `components/` global é antipattern.
2. **Componentização disciplinada**. Componente que cresce além de ~150 linhas ou cuja JSX vira árvore de Natal: extrair sub-componentes. Componente reusável entre features: promover para `shared/ui/`.
3. **Estado de servidor != estado de cliente**. Dados da API são gerenciados por TanStack Query. Estado de UI local fica no componente. Estado de UI global (raro) usa Zustand.
4. **Tipagem estrita**. `strict: true` no `tsconfig`, `noUncheckedIndexedAccess: true`. `any` é erro de revisão.
5. **Segurança importa no front também**. Tokens em httpOnly cookie (não localStorage), `dangerouslySetInnerHTML` proibido sem aprovação, env vars apenas `VITE_PUBLIC_*` se forem para o browser.

## Estrutura de uma feature

Padrão para uma feature `transactions`:

```
src/features/transactions/
├── api/                    # queries e mutations (TanStack Query)
│   ├── useTransactions.ts
│   ├── useCreateTransaction.ts
│   └── transactionSchemas.ts   # Zod schemas espelhando contratos da API
├── components/             # componentes específicos desta feature
│   ├── TransactionList.tsx
│   ├── TransactionForm.tsx
│   └── TransactionRow.tsx
├── routes/                 # rotas da feature (TanStack Router)
│   └── transactions.tsx
├── types.ts                # tipos derivados dos Zod schemas
└── index.ts                # interface pública: exporta só o que outras features usam
```

**O que NÃO existe**:
- `components/` global no topo de `src/`
- Pasta `pages/` separada — rotas vivem dentro da feature
- `utils.ts` genérico — coloque o helper onde ele pertence

## Quando promover algo para `shared/`

Mova de `features/<x>/` para `shared/` **só quando**:

- Já existem **duas features** que usariam o mesmo código, ou
- É claramente uma primitiva de UI (Button, Input, Dialog), ou
- É um util genuinamente genérico (formatação de data/moeda, cliente HTTP).

Antes disso: deixa duplicado. Duplicação ruim só vira problema na terceira vez.

## Estado

| O que | Como |
|---|---|
| Dados da API | TanStack Query. Hook por endpoint (`useTransactions`, `useCreateTransaction`). |
| Form state | `react-hook-form` + Zod resolver. |
| UI local (toggle, hover, etc.) | `useState`. |
| UI global (tema, sidebar open) | Zustand store em `shared/lib/stores/`. Só quando 3+ componentes precisam. |
| URL state (filtros, paginação) | TanStack Router search params. Não duplicar em estado React. |

## Cliente HTTP

Centralizado em `shared/lib/api/client.ts`. Único lugar que conhece `import.meta.env.VITE_PUBLIC_API_URL`. Lida com:

- Base URL.
- `credentials: 'include'` (cookie httpOnly de sessão).
- Interceptação de 401 (redireciona para login).
- Parse de erro padronizado da API.
- Tipagem dos retornos via Zod parse (validação runtime do que a API mandou).

Componentes **nunca** chamam `fetch` direto.

## Streaming (chat com IA)

Respostas dos agentes chegam via **SSE** (Server-Sent Events) sobre POST. Padrão:

- Hook `useAgentStream(conversationId)` em `features/chat/api/` faz `fetch` com `body` JSON e lê manualmente o `ReadableStream` do response (`response.body.getReader()`).
- A UI mantém um "draft" da mensagem do assistant acumulando `text_delta`. Quando recebe `done`, marca como persistida e invalida a query do histórico (TanStack Query refaz fetch).
- Eventos `tool_use_start` / `tool_use_end` mostram indicador inline ("consultando suas transações...").

`EventSource` nativo não serve (não suporta POST). Implementação manual com `fetch` + reader em ~80 linhas. Sem dep extra.

## Upload de arquivo (import de extrato)

Padrão:

- Componente `<FileDropzone>` em `shared/ui/` (drag&drop + click pra abrir).
- Hook `useImport()` em `features/import/api/` faz `POST /imports` com `FormData` (multipart). API responde com `ImportJob` em status `parsing`.
- Hook `useImportJob(jobId)` faz polling (ou WS, se evoluir) acompanhando `status: parsing → categorizing → done`.
- **Frontend não processa CSV/OFX**. API parseia, dedupa, categoriza. Front só sobe e mostra resultado.

Validação cliente-side antes do upload (UX, não segurança): tamanho ≤5MB, extensão `csv`/`ofx`, prefixo conhecido (`NU_` para Nubank). Validação real é no backend.

## Markdown da IA — sanitizado

Respostas dos agentes vêm em Markdown. Renderizar com `react-markdown` mínimo:

- **Tags HTML inline desabilitadas** (`disallowedElements` ou plugin `rehype-sanitize` agressivo).
- **Links forçados** a `target="_blank" rel="noopener noreferrer"`, protocolo validado (apenas `http://`, `https://`, `mailto:`).
- **Sem `style=` injetado**, sem `<iframe>`, sem `<script>`.

Configuração centralizada em `shared/ui/Markdown.tsx`. Toda renderização de texto AI passa por esse componente — nunca renderize string da API com `dangerouslySetInnerHTML`.

## Formulários

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTransactionSchema, CreateTransactionInput } from '../api/transactionSchemas'

export function TransactionForm() {
  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
  })
  // ...
}
```

Schema é **fonte da verdade** do tipo via `z.infer`. Nunca declare o type à parte.

## Convenções de código

- **Nomes**: componentes em `PascalCase`, hooks em `camelCase` começando com `use`, types em `PascalCase`.
- **Arquivos**: um componente exportado por arquivo, nome do arquivo == nome do componente.
- **Imports**: absolutos a partir de `src/` (configurar `paths` no tsconfig). Nada de `../../../`.
- **Estilos**: Tailwind. Sem CSS modules, sem styled-components. Classe condicional via `clsx` ou helper `cn`.
- **Acessibilidade**: todo botão é `<button>` (não `<div onClick>`), todo input tem `<label>`, foco visível, contraste suficiente.

## Design system — qual lib para o quê

Catálogo completo em [docs/design-system.md](./docs/design-system.md). Resumo das regras:

- **Botões, inputs, dialogs, selects, sheets, popovers**: copiar do **shadcn/ui** (`npx shadcn@latest add <component>`). Componentes ficam em `shared/ui/`.
- **KPI cards, AreaChart, DonutChart, BarChart, Tracker** (visualizações financeiras): **Tremor Raw / Tremor Blocks** (também copiar para `shared/ui/`).
- **Charts low-level** que Tremor não cobre: **Recharts** direto.
- **Ícones**: `lucide-react`. Sem SVG inline de outra fonte sem justificativa.
- **Toast / notification**: `sonner` (configurado no `<App>`). Use `toast.success/error/info`.
- **Animação**: `motion/react`. Restrito a transições de UI (entrada/saída de modal, hover de card). Não anime sem razão.
- **Tabela de transações e listas grandes**: `@tanstack/react-table` (headless). Renderiza com primitives shadcn `Table`.
- **Date picker**: shadcn `Calendar` + `Popover` (usa `react-day-picker` internamente).
- **Forms**: `react-hook-form` + `zod` + `@hookform/resolvers/zod`.
- **Variantes de componente**: `class-variance-authority` (`cva`).
- **Composição de classes**: `clsx` + `tailwind-merge` via `cn()` helper em `shared/lib/utils/cn.ts`.

**Componentes especializados em finanças** que SEMPRE vão em `shared/ui/`:
- `<Money value={n} />` — única forma de exibir valor monetário. Encapsula formatação, sinal, cor e a11y.
- `<KpiCard label value delta trend />` — métricas no dashboard.
- `<TransactionRow />` — linha de transação na lista.
- `<ChartContainer />` — wrapper com loading/empty/altura consistente em volta de qualquer chart.

Não introduza biblioteca de UI nova sem justificativa em PR. A stack acima é completa para dashboards financeiros.

## Testes

- **Vitest** + **Testing Library**.
- Componentes complexos têm teste de interação (renderiza, simula click/typing, valida output).
- Hooks customizados têm teste isolado.
- Não testar implementação (estado interno) — testar comportamento (o que o usuário vê).

## Segurança — checklist antes de PR

- [ ] Nenhum secret/token em código ou em `.env` commitado.
- [ ] Token de auth permanece em cookie httpOnly — não tem `localStorage.setItem('token', ...)` em lugar nenhum.
- [ ] Nenhum `dangerouslySetInnerHTML` novo (se precisar mesmo, justifique e sanitize com DOMPurify).
- [ ] Toda variável `import.meta.env.*` usada no cliente começa com `VITE_PUBLIC_`.
- [ ] Erro da API mostrado ao usuário é texto amigável, não JSON cru.

Detalhamento em [docs/security.md](./docs/security.md).

## O que NÃO fazer

- Não usar Redux. TanStack Query + Zustand cobrem 99% dos casos.
- Não usar Axios. `fetch` nativo é suficiente; o cliente em `shared/lib/api/` envelopa o que precisar.
- Não usar bibliotecas de componentes prontos (MUI, Mantine, Ant Design). Stack é Tailwind + shadcn/ui.
- Não escrever CSS em arquivo separado por componente. Tailwind direto.
- Não criar `index.tsx` que reexporta tudo de uma pasta sem critério (barrel files quebram tree-shaking em alguns casos). Use só onde fizer sentido.
- Não acessar `localStorage`/`sessionStorage` para dado sensível.

## Comandos úteis

```bash
npm run dev               # vite dev server (usado pelo docker-compose dev)
npm run build             # build de produção (usado pelo docker-compose prod)
npm run preview           # serve o build local para sanity check
npm run test              # vitest
npm run lint              # eslint
npm run type-check        # tsc --noEmit
docker compose up         # sobe local com HMR
```

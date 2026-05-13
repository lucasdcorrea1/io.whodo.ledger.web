# Design System — Whodo Ledger Web

Catálogo de bibliotecas, tokens e padrões para construir a interface. Foco: **dashboard financeiro** com excelente densidade de informação, clareza numérica e acessibilidade.

## Paleta de bibliotecas

| Necessidade | Lib | Por quê |
|---|---|---|
| Componentes base (Button, Input, Dialog, Select, Sheet, Popover, etc.) | **shadcn/ui** | Componentes copiados para o repo, sem dep npm — você controla o código. Padrão de mercado. |
| Dashboards e charts financeiros | **Tremor Raw / Tremor Blocks** | Construída para dashboards: `KpiCard`, `AreaChart`, `DonutChart`, `BarChart`, `Tracker`. Tailwind nativo. |
| Gráficos low-level (fora do que Tremor cobre) | **Recharts** | Lib subjacente do Tremor. Usar direto só quando o componente do Tremor não atender. |
| Ícones | **Lucide React** (`lucide-react`) | Padrão moderno, ~1500 ícones, design coerente, tree-shakeable. |
| Toasts / notificações | **Sonner** | Leve, animado, acessível. Recomendado oficialmente pelo shadcn. |
| Animação | **motion** (Framer Motion v12+) | API declarativa, ideal para transições de modal, hover de card, entrada/saída de elementos. |
| Tabela de transações | **@tanstack/react-table** | Headless: sorting, filtering, paginação, virtualization. Renderiza com primitives shadcn `Table`. |
| Date picker | **react-day-picker** | Usado pelo shadcn `Calendar`. Em campos de período/data. |
| Forms | **react-hook-form** + **zod** + **@hookform/resolvers** | Já travado no [CLAUDE.md](../CLAUDE.md). |
| Class composition | **clsx** + **tailwind-merge** (helper `cn()`) | Padrão shadcn. |
| Variantes de componente | **class-variance-authority** (`cva`) | Para componentes com variantes (size/intent). |

**Sem MUI, sem Mantine, sem Ant Design, sem Chakra.** Stack acima é completa para dashboard financeiro e comprovada em conjunto.

## Tokens (Tailwind v4)

Configurados em `tailwind.config.ts` e `src/styles/globals.css`.

### Cores semânticas (específicas de finanças)

```css
--color-income:   142 71% 45%;   /* verde — entradas */
--color-expense:    0 84% 60%;   /* vermelho — saídas */
--color-neutral:  220 14% 60%;   /* cinza — neutro / transferência interna */
--color-warning:   38 92% 50%;   /* âmbar — atenção (estouro de budget) */
--color-success:  142 71% 45%;   /* verde — meta batida */
```

**Regra**: número de valor numa transação **sempre** usa `text-income` ou `text-expense` conforme o sinal. Nunca cor neutra de texto.

### Cores de UI (claro/escuro)

Padrão shadcn (`--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--card`, `--border`, `--ring`, etc.). Dark mode default por preferência do sistema, com toggle manual no menu de perfil.

### Tipografia

| Token | Uso | Tratamento |
|---|---|---|
| `text-display` | Saldos grandes, hero numbers | `3rem`, `font-bold`, **`tabular-nums`** |
| `text-headline` | Títulos de seção | `1.5rem`, `font-semibold` |
| `text-body` | Texto padrão | `1rem` |
| `text-caption` | Labels, metadata | `0.875rem`, `text-muted-foreground` |
| `text-mono` | Valores em tabela/lista | **`tabular-nums`**, `font-feature-settings: 'tnum'` |

**Sempre `tabular-nums` em valores monetários.** Dígitos com largura variável (default) deixam a tabela de transações torta.

## Padrões de componente — `shared/ui/`

### `<Money>`

Único componente para exibir valor monetário. Encapsula formatação, sinal, cor, acessibilidade.

```tsx
<Money value={-22.98} />         // "R$ 22,98" com text-expense, aria-label "saída de 22 reais e 98 centavos"
<Money value={4000} positive />  // "R$ 4.000,00" com text-income (positive força)
<Money value={n} muted />        // cor neutra (uso em totais/subtotais)
```

**Onde mora**: `shared/ui/money.tsx`. Nunca formate moeda à mão em outro lugar do app.

### `<KpiCard>`

Cartão de métrica para o dashboard.

```tsx
<KpiCard
  label="Saldo do mês"
  value={2_345.67}
  delta={+150.0}         // mostra ↑ +R$150 vs período anterior
  trend="up"
  hint="comparado a janeiro/26"
/>
```

Base: Tremor `Card` + variantes via `cva`. Padroniza layout de KPI em todo o app.

### `<TransactionRow>`

Linha da lista de transações. Densidade alta (poucos px verticais — usuários veem dezenas/centenas):

```
[ícone categoria]  Descrição truncada              -R$ 22,98
                   data curta · categoria              [chevron]
```

### `<ChartContainer>`

Wrapper consistente para qualquer chart (Recharts ou Tremor):
- Altura padrão (`h-72`) com override por prop
- Loading skeleton enquanto query não resolveu
- Empty state (ícone + mensagem) se array vazio
- Tooltip estilizado consistente em todos os charts

## Layout do app

```
┌─────────────────────────────────────────────────────┐
│  Topbar (logo, busca, perfil, toggle tema)          │
├──────┬──────────────────────────────────────────────┤
│      │                                              │
│ Side │   Conteúdo da rota                           │
│ bar  │   max-w-7xl mx-auto px-4 sm:px-6 lg:px-8     │
│      │                                              │
└──────┴──────────────────────────────────────────────┘
```

- **Sidebar** colapsável (drawer no mobile via shadcn `Sheet`).
- **Topbar** fixa no topo, altura 56px (`h-14`).
- **Conteúdo** com `max-w-7xl` para não esticar em ultra-wide.

## Dark mode

Habilitado por padrão (respeita `prefers-color-scheme`). Toggle manual no menu de perfil, persistido em `localStorage` via `useUIStore` (Zustand).

Implementação: Tailwind v4 `@variant dark` + classe `dark` no `<html>`. **Sem `next-themes`** (overkill para Vite — um hook simples resolve).

## Padrões de UI financeira (acessibilidade)

- **Cor não é o único indicador.** Saída tem sinal `-` explícito **e** ícone (`ArrowDownRight`). Entrada tem sinal `+` **e** ícone (`ArrowUpRight`). Daltônicos enxergam.
- **Contraste** testado com `prefers-contrast: more` em mente. Cor de expense em fundo claro: ratio ≥ 4.5:1.
- **Foco visível** em todo interativo (`focus-visible:ring-2 ring-ring`).
- **Skip-to-content** link no topo, oculto até receber foco.
- **`aria-label` em `<Money>`** lê o valor por extenso (`"saída de 22 reais e 98 centavos"`).

## Estado vazio (empty states)

Toda lista importante (transações, dívidas, metas) tem empty state com:
- Ilustração simples (Lucide ícone grande)
- Mensagem clara ("Você ainda não importou nenhuma transação")
- CTA primário ("Importar extrato Nubank")

Empty state mal feito (lista em branco sem feedback) é o defeito mais comum em dashboards. Não cometer.

## O que NÃO está aqui

- Estado, fetching, organização de feature → [architecture.md](./architecture.md)
- Streaming de chat, upload de arquivo, Markdown sanitizado → [../CLAUDE.md](../CLAUDE.md)
- Segurança de UI (CSP, XSS) → [security.md](./security.md)

## Decisões pendentes (quando começarmos a codar)

- **Cor primária da marca Whodo**: tem referência ou logo definido? Default sugerido: índigo (`hsl(238 75% 60%)`) — neutro, moderno, lê bem em claro e escuro.
- **Logo / wordmark**: usar placeholder até ter o SVG final.
- **Ilustração de empty state**: começar com Lucide ícone grande; se a marca tiver ilustração, trocar.

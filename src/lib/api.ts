export class ApiError extends Error {
  constructor(public status: number, public body: { error?: string }) {
    super(body.error || `HTTP ${status}`)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) {
    let body: { error?: string } = {}
    try {
      body = await res.json()
    } catch {}
    throw new ApiError(res.status, body)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text)
}

export interface MeResponse {
  id: string
  email: string
  name: string
}

export interface LoginResponse {
  user: MeResponse
}

export interface Transaction {
  id: string
  occurred_at: string
  amount_cents: number
  amount: number
  description: string
  category_id: string
  category_name: string
}

export interface Account {
  id: string
  name: string
  bank: string
  kind: string
  initial_balance: number
  initial_balance_date: string
  created_at: string
}

export interface UpdateTransactionInput {
  description?: string
  category_id?: string
  amount?: number
}

export interface CreateAccountInput {
  name: string
  bank: string
  kind: string
  initial_balance: number
  initial_balance_date?: string
}

export interface UpdateAccountInput {
  name?: string
  kind?: string
  initial_balance?: number
  initial_balance_date?: string
}

export interface CategorySum {
  category_id: string
  category_name: string
  total: number
  total_abs: number
  count: number
}

export interface DailyFlow {
  date: string
  income: number
  expense: number
  net: number
}

export interface DashboardSummary {
  period: { from: string; to: string }
  balance: number
  total_balance: number
  initial_balance: number
  total_debt: number
  income: number
  expense: number
  count: number
  by_category: CategorySum[]
  daily_flow: DailyFlow[]
}

export type LoanKind = 'with_interest' | 'fixed_installments' | 'informal'

export interface Loan {
  id: string
  name: string
  description: string
  creditor: string
  kind: LoanKind
  principal: number
  interest_rate_monthly: number
  monthly_payment: number
  installments_total: number
  start_date: string
  due_day: number
  active: boolean
  balance: number
  interest_accrued: number
  total_paid: number
  payments_count: number
  months_passed: number
  projected_months_left: number
  projected_payoff?: string
  never_pays_off: boolean
  next_due_date?: string
  next_due_amount: number
}

export interface LoanPayment {
  id: string
  loan_id: string
  amount: number
  date: string
  transaction_id?: string
  note: string
}

export interface LoanDetail {
  loan: Loan
  payments: LoanPayment[]
}

export interface CreateLoanInput {
  name: string
  description?: string
  creditor?: string
  kind: LoanKind
  principal: number
  interest_rate_monthly: number
  monthly_payment: number
  installments_total?: number
  start_date?: string
  due_day?: number
}

export type UpdateLoanInput = Partial<CreateLoanInput> & { active?: boolean }

export interface ScheduleEntry {
  month: string
  opening_balance: number
  interest: number
  payment: number
  closing_balance: number
}

export interface ImportJob {
  id: string
  status: 'parsing' | 'categorizing' | 'done' | 'failed'
  filename: string
  imported: number
  skipped: number
  failed: number
  categorized: number
  message: string
  created_at: string
  updated_at: string
}

export const api = {
  me: () => request<MeResponse>('/auth/me'),
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  dashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),
  transactions: (params: { limit?: number; skip?: number; category_id?: string } = {}) => {
    const q = new URLSearchParams()
    if (params.limit) q.set('limit', String(params.limit))
    if (params.skip) q.set('skip', String(params.skip))
    if (params.category_id) q.set('category_id', params.category_id)
    const qs = q.toString()
    return request<{ items: Transaction[] }>(`/transactions${qs ? `?${qs}` : ''}`)
  },
  uploadImport: (file: File, accountId?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    if (accountId) fd.append('account_id', accountId)
    return request<ImportJob>('/imports', { method: 'POST', body: fd })
  },
  listImports: () => request<{ items: ImportJob[] }>('/imports'),
  getImport: (id: string) => request<ImportJob>(`/imports/${id}`),
  listAccounts: () => request<{ items: Account[] }>('/accounts'),
  createAccount: (input: CreateAccountInput) =>
    request<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) }),
  updateAccount: (id: string, input: UpdateAccountInput) =>
    request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  updateTransaction: (id: string, input: UpdateTransactionInput) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  listLoans: () => request<{ items: Loan[] }>('/loans'),
  getLoan: (id: string) => request<LoanDetail>(`/loans/${id}`),
  createLoan: (input: CreateLoanInput) =>
    request<Loan>('/loans', { method: 'POST', body: JSON.stringify(input) }),
  updateLoan: (id: string, input: UpdateLoanInput) =>
    request<Loan>(`/loans/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteLoan: (id: string) => request<void>(`/loans/${id}`, { method: 'DELETE' }),
  addLoanPayment: (id: string, input: { amount: number; date?: string; note?: string }) =>
    request<LoanPayment>(`/loans/${id}/payments`, { method: 'POST', body: JSON.stringify(input) }),
  deleteLoanPayment: (loanId: string, paymentId: string) =>
    request<void>(`/loans/${loanId}/payments/${paymentId}`, { method: 'DELETE' }),
  loanSchedule: (id: string) => request<{ schedule: ScheduleEntry[] }>(`/loans/${id}/schedule`),
}

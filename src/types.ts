// Tipos usados em todo o app.

export type TransactionType = 'receita' | 'despesa'

export interface Transaction {
  id: string
  description: string
  // Valor em CENTAVOS (ex.: R$ 12,50 = 1250). Evita erros de arredondamento.
  amountCents: number
  type: TransactionType
  category: string
  // Data no formato aaaa-mm-dd (o mesmo do campo de data do navegador)
  date: string
  // Só existe quando a transação é uma parcela de uma compra parcelada.
  // Todas as parcelas da mesma compra têm o mesmo groupId.
  installment?: { groupId: string; number: number; total: number }
}

// Mudanças pontuais de uma recorrência em UM mês (editar ou excluir só aquele mês)
export interface RecurrenceException {
  deleted?: boolean
  description?: string
  amountCents?: number
  category?: string
}

// Transação fixa que se repete todo mês (aluguel, assinatura...).
// Não guardamos uma transação por mês: o app calcula as ocorrências ao navegar.
export interface Recurrence {
  id: string
  description: string
  amountCents: number
  type: TransactionType
  category: string
  startDate: string // aaaa-mm-dd
  // Dia "de verdade" (ex.: 31). Guardado à parte porque a data de um mês curto
  // pode cair no dia 28, mas o mês seguinte volta para o dia 31.
  dayOfMonth: number
  endDate?: string // aaaa-mm-dd; sem valor = sem fim
  // Chave = mês "aaaa-mm"
  exceptions: Record<string, RecurrenceException>
}

// O que o formulário entrega ao app para criar algo novo
interface NewEntryBase {
  description: string
  type: TransactionType
  category: string
  date: string
}

export type NewEntry =
  | (NewEntryBase & { mode: 'single'; amountCents: number })
  | (NewEntryBase & { mode: 'installments'; totalCents: number; count: number })
  | (NewEntryBase & { mode: 'recurring'; amountCents: number; endDate?: string })

// Conta de usuário como fica guardada no navegador (nunca guarda a senha em si)
export interface User {
  id: string
  name: string
  email: string // sempre em minúsculas
  salt: string // texto aleatório misturado à senha antes do hash
  passwordHash: string
  // Foto de perfil (opcional): imagem já reduzida, guardada como texto (data URL)
  photo?: string
}

// Dados do usuário que o resto do app pode ver (sem salt nem hash)
export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'photo'>

export const EXPENSE_CATEGORIES = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Lazer',
  'Educação',
  'Compras',
  'Contas',
  'Outros',
] as const

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Presente',
  'Outros',
] as const

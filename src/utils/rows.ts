// Conversão entre os objetos do app (camelCase) e as linhas das tabelas do
// Supabase (snake_case). Funções puras, sem rede, fáceis de testar.
// Dinheiro é sempre CENTAVOS inteiros, nos dois lados.
import type { Recurrence, RecurrenceException, Transaction, TransactionType } from '../types'

export interface TransactionRow {
  id: string
  user_id: string
  description: string
  amount_cents: number
  type: string
  category: string
  date: string
  installment_group_id: string | null
  installment_number: number | null
  installment_total: number | null
  // Data do pagamento (aaaa-mm-dd) ou null se pendente
  paid_at: string | null
}

export interface RecurrenceRow {
  id: string
  user_id: string
  description: string
  amount_cents: number
  type: string
  category: string
  start_date: string
  day_of_month: number
  end_date: string | null
  exceptions: Record<string, RecurrenceException>
  // "aaaa-mm" -> data do pagamento daquele mês. Pode vir vazio/nulo de bancos antigos.
  payments: Record<string, string> | null
}

function toType(value: string): TransactionType {
  if (value === 'receita' || value === 'despesa') return value
  throw new Error(`Tipo de transação inválido vindo do banco: ${value}`)
}

function toCents(value: number): number {
  // O banco usa coluna inteira, mas conferimos para nunca deixar passar fração
  if (!Number.isInteger(value)) throw new Error(`Valor em centavos inválido: ${value}`)
  return value
}

export function transactionToRow(t: Transaction, userId: string): TransactionRow {
  return {
    id: t.id,
    user_id: userId,
    description: t.description,
    amount_cents: toCents(t.amountCents),
    type: t.type,
    category: t.category,
    date: t.date,
    installment_group_id: t.installment?.groupId ?? null,
    installment_number: t.installment?.number ?? null,
    installment_total: t.installment?.total ?? null,
    paid_at: t.paidAt ?? null,
  }
}

export function rowToTransaction(row: TransactionRow): Transaction {
  const transaction: Transaction = {
    id: row.id,
    description: row.description,
    amountCents: toCents(row.amount_cents),
    type: toType(row.type),
    category: row.category,
    date: row.date,
  }
  if (
    row.installment_group_id !== null &&
    row.installment_number !== null &&
    row.installment_total !== null
  ) {
    transaction.installment = {
      groupId: row.installment_group_id,
      number: row.installment_number,
      total: row.installment_total,
    }
  }
  if (row.paid_at) transaction.paidAt = row.paid_at
  return transaction
}

export function recurrenceToRow(r: Recurrence, userId: string): RecurrenceRow {
  return {
    id: r.id,
    user_id: userId,
    description: r.description,
    amount_cents: toCents(r.amountCents),
    type: r.type,
    category: r.category,
    start_date: r.startDate,
    day_of_month: r.dayOfMonth,
    end_date: r.endDate ?? null,
    exceptions: r.exceptions,
    payments: r.payments,
  }
}

export function rowToRecurrence(row: RecurrenceRow): Recurrence {
  const recurrence: Recurrence = {
    id: row.id,
    description: row.description,
    amountCents: toCents(row.amount_cents),
    type: toType(row.type),
    category: row.category,
    startDate: row.start_date,
    dayOfMonth: row.day_of_month,
    exceptions: row.exceptions ?? {},
    payments: row.payments ?? {},
  }
  if (row.end_date) recurrence.endDate = row.end_date
  return recurrence
}

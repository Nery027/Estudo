// Leitura e gravação dos dados na nuvem (tabelas do Supabase).
// A segurança de verdade está no banco: a RLS só deixa cada usuário mexer nas próprias linhas.
import { supabase } from './supabase'
import type { Recurrence, Transaction } from './types'
import type { Ledger } from './utils/ledger'
import type { LedgerDiff } from './utils/ledgerDiff'
import {
  recurrenceToRow,
  rowToRecurrence,
  rowToTransaction,
  transactionToRow,
} from './utils/rows'
import type { RecurrenceRow, TransactionRow } from './utils/rows'

// O Supabase devolve no máximo 1.000 linhas por consulta, então lemos em páginas
const PAGE_SIZE = 1000
// Tamanhos de lote para não estourar o limite de tamanho das requisições
const WRITE_CHUNK = 200
const DELETE_CHUNK = 100

function chunk<T>(items: T[], size: number): T[][] {
  const parts: T[][] = []
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size))
  return parts
}

async function fetchAll<Row>(table: 'transactions' | 'recurrences'): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    // Ordenar por id deixa a paginação estável (nenhuma linha pula ou repete)
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = (data ?? []) as Row[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

// Lê todas as transações e recorrências do usuário logado.
export async function fetchLedger(): Promise<Ledger> {
  const [transactions, recurrences] = await Promise.all([
    fetchAll<TransactionRow>('transactions'),
    fetchAll<RecurrenceRow>('recurrences'),
  ])
  return {
    transactions: transactions.map(rowToTransaction),
    recurrences: recurrences.map(rowToRecurrence),
  }
}

// Envia ao banco apenas as diferenças de uma ação (novas/alteradas e excluídas).
export async function pushDiff(userId: string, diff: LedgerDiff): Promise<void> {
  for (const ids of chunk(diff.deleteTransactionIds, DELETE_CHUNK)) {
    const { error } = await supabase.from('transactions').delete().in('id', ids)
    if (error) throw error
  }
  for (const ids of chunk(diff.deleteRecurrenceIds, DELETE_CHUNK)) {
    const { error } = await supabase.from('recurrences').delete().in('id', ids)
    if (error) throw error
  }
  for (const part of chunk(diff.upsertTransactions, WRITE_CHUNK)) {
    const rows = part.map((t) => transactionToRow(t, userId))
    const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' })
    if (error) throw error
  }
  for (const part of chunk(diff.upsertRecurrences, WRITE_CHUNK)) {
    const rows = part.map((r) => recurrenceToRow(r, userId))
    const { error } = await supabase.from('recurrences').upsert(rows, { onConflict: 'id' })
    if (error) throw error
  }
}

// Grava de uma vez dados importados (usa a mesma rota das alterações normais).
export async function importLedger(
  userId: string,
  data: { transactions: Transaction[]; recurrences: Recurrence[] },
): Promise<void> {
  await pushDiff(userId, {
    upsertTransactions: data.transactions,
    deleteTransactionIds: [],
    upsertRecurrences: data.recurrences,
    deleteRecurrenceIds: [],
  })
}

// ---------- Perfil (nome e foto) ----------

export interface Profile {
  name: string
  photo: string | null
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, photo')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { name: String(data.name ?? ''), photo: typeof data.photo === 'string' ? data.photo : null }
}

// Troca a foto (ou remove, com null). Só as colunas enviadas são alteradas.
export async function saveProfilePhoto(userId: string, photo: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({ id: userId, photo }, { onConflict: 'id' })
  if (error) throw error
}

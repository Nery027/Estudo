// Compara o livro-caixa "antes" e "depois" de uma ação e diz exatamente o que
// precisa ser enviado ao banco. Assim a lógica de parcelas e recorrências
// (já testada) continua a mesma, e só as DIFERENÇAS vão para a nuvem.
import type { Recurrence, Transaction } from '../types'
import type { Ledger } from './ledger'

export interface LedgerDiff {
  upsertTransactions: Transaction[] // novas ou alteradas
  deleteTransactionIds: string[]
  upsertRecurrences: Recurrence[] // novas ou alteradas
  deleteRecurrenceIds: string[]
}

// Texto estável (chaves em ordem) para comparar objetos sem depender da ordem das chaves
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function diffById<T extends { id: string }>(before: T[], after: T[]) {
  const beforeById = new Map(before.map((item) => [item.id, item]))
  const afterIds = new Set(after.map((item) => item.id))

  const upserts = after.filter((item) => {
    const old = beforeById.get(item.id)
    return old === undefined || stableStringify(old) !== stableStringify(item)
  })
  const deletes = before.filter((item) => !afterIds.has(item.id)).map((item) => item.id)
  return { upserts, deletes }
}

export function diffLedger(before: Ledger, after: Ledger): LedgerDiff {
  const transactions = diffById(before.transactions, after.transactions)
  const recurrences = diffById(before.recurrences, after.recurrences)
  return {
    upsertTransactions: transactions.upserts,
    deleteTransactionIds: transactions.deletes,
    upsertRecurrences: recurrences.upserts,
    deleteRecurrenceIds: recurrences.deletes,
  }
}

export function isEmptyDiff(diff: LedgerDiff): boolean {
  return (
    diff.upsertTransactions.length === 0 &&
    diff.deleteTransactionIds.length === 0 &&
    diff.upsertRecurrences.length === 0 &&
    diff.deleteRecurrenceIds.length === 0
  )
}

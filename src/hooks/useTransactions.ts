import { useEffect, useState } from 'react'
import { loadRecurrences, loadTransactions, saveRecurrences, saveTransactions } from '../storage'
import type { NewEntry } from '../types'
import { createEntry, deleteItem, editItem, getMonthItems } from '../utils/ledger'
import type { ItemPatch, Ledger, LedgerItem, Scope } from '../utils/ledger'

// Guarda as transações e recorrências DO USUÁRIO e salva a cada mudança.
export function useTransactions(userId: string) {
  const [ledger, setLedger] = useState<Ledger>(() => ({
    transactions: loadTransactions(userId),
    recurrences: loadRecurrences(userId),
  }))

  useEffect(() => {
    saveTransactions(userId, ledger.transactions)
    saveRecurrences(userId, ledger.recurrences)
  }, [userId, ledger])

  return {
    // Itens (transações, parcelas e recorrências) de um mês "aaaa-mm"
    getItems: (month: string): LedgerItem[] => getMonthItems(ledger, month),
    addEntry: (entry: NewEntry) => setLedger((current) => createEntry(current, entry)),
    removeItem: (item: LedgerItem, scope: Scope) =>
      setLedger((current) => deleteItem(current, item, scope)),
    updateItem: (item: LedgerItem, scope: Scope, patch: ItemPatch) =>
      setLedger((current) => editItem(current, item, scope, patch)),
  }
}

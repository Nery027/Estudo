import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLedger, pushDiff } from '../cloud'
import type { NewEntry } from '../types'
import { createEntry, deleteItem, editItem, getMonthItems } from '../utils/ledger'
import type { ItemPatch, Ledger, LedgerItem, Scope } from '../utils/ledger'
import { diffLedger, isEmptyDiff } from '../utils/ledgerDiff'

export type DataStatus = 'loading' | 'ready' | 'error'

const SAVE_ERROR =
  'Não foi possível salvar na nuvem. Recarregamos seus dados; confira sua conexão e tente de novo.'

// Transações e recorrências do usuário, guardadas na nuvem (Supabase).
// A tela atualiza na hora (otimista) e as mudanças seguem para o banco em fila.
export function useTransactions(userId: string) {
  const [ledger, setLedger] = useState<Ledger>({ transactions: [], recurrences: [] })
  const [status, setStatus] = useState<DataStatus>('loading')
  const [syncError, setSyncError] = useState('')

  // Cópia sempre atual do livro-caixa (evita ler um valor "velho" dentro de funções)
  const ledgerRef = useRef(ledger)
  // Fila: as gravações acontecem uma por vez, na ordem em que o usuário agiu
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const pendingRef = useRef(0) // gravações ainda em andamento
  const versionRef = useRef(0) // sobe a cada ação do usuário
  const failedRef = useRef(false)

  const replaceLedger = useCallback((next: Ledger) => {
    ledgerRef.current = next
    setLedger(next)
  }, [])

  // Lê tudo da nuvem. Descarta o resultado se o usuário mexeu em algo no meio
  // do caminho, para uma leitura atrasada nunca apagar uma alteração nova.
  const load = useCallback(
    async (initial: boolean) => {
      const startVersion = versionRef.current
      try {
        const fresh = await fetchLedger()
        if (versionRef.current !== startVersion || pendingRef.current > 0) return
        replaceLedger(fresh)
        setStatus('ready')
      } catch {
        // Falha na primeira leitura: mostra erro. Numa atualização em segundo plano, ignora.
        if (initial) setStatus('error')
      }
    },
    [replaceLedger],
  )

  useEffect(() => {
    void load(true)
  }, [load])

  // Ao voltar para a aba/app, busca de novo (pega o que mudou em outro aparelho)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && pendingRef.current === 0) void load(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const commit = useCallback(
    (next: Ledger) => {
      const diff = diffLedger(ledgerRef.current, next)
      if (isEmptyDiff(diff)) return

      versionRef.current += 1
      replaceLedger(next)
      pendingRef.current += 1

      queueRef.current = queueRef.current.then(async () => {
        try {
          await pushDiff(userId, diff)
        } catch {
          failedRef.current = true
          setSyncError(SAVE_ERROR)
        } finally {
          pendingRef.current -= 1
        }
        // Se algo falhou, depois que a fila esvaziar voltamos ao que está de fato na nuvem
        if (pendingRef.current === 0 && failedRef.current) {
          failedRef.current = false
          await load(false)
        }
      })
    },
    [userId, replaceLedger, load],
  )

  return {
    status,
    syncError,
    dismissError: () => setSyncError(''),
    reload: () => load(false),
    // Itens (transações, parcelas e recorrências) de um mês "aaaa-mm"
    getItems: (month: string): LedgerItem[] => getMonthItems(ledger, month),
    addEntry: (entry: NewEntry) => commit(createEntry(ledgerRef.current, entry)),
    removeItem: (item: LedgerItem, scope: Scope) =>
      commit(deleteItem(ledgerRef.current, item, scope)),
    updateItem: (item: LedgerItem, scope: Scope, patch: ItemPatch) =>
      commit(editItem(ledgerRef.current, item, scope, patch)),
  }
}

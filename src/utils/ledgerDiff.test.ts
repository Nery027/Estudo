import { describe, expect, it } from 'vitest'
import type { NewEntry } from '../types'
import { createEntry, deleteItem, editItem, getMonthItems } from './ledger'
import type { Ledger, LedgerItem } from './ledger'
import { diffLedger, isEmptyDiff } from './ledgerDiff'

const EMPTY: Ledger = { transactions: [], recurrences: [] }

const BUY: NewEntry = {
  mode: 'installments',
  description: 'Compra X',
  totalCents: 100000,
  count: 10,
  type: 'despesa',
  category: 'Compras',
  date: '2026-01-15',
}

const RENT: NewEntry = {
  mode: 'recurring',
  description: 'Aluguel',
  amountCents: 150000,
  type: 'despesa',
  category: 'Moradia',
  date: '2026-01-10',
}

function itemIn(ledger: Ledger, month: string): LedgerItem {
  const items = getMonthItems(ledger, month)
  expect(items).toHaveLength(1)
  return items[0]
}

describe('diffLedger (o que enviar ao banco)', () => {
  it('sem mudanças, o diff é vazio', () => {
    const ledger = createEntry(EMPTY, BUY)
    expect(isEmptyDiff(diffLedger(ledger, ledger))).toBe(true)
  })

  it('criar compra parcelada: 10 linhas novas e nenhuma exclusão', () => {
    const diff = diffLedger(EMPTY, createEntry(EMPTY, BUY))
    expect(diff.upsertTransactions).toHaveLength(10)
    expect(diff.deleteTransactionIds).toHaveLength(0)
    expect(diff.upsertRecurrences).toHaveLength(0)
  })

  it('criar transação simples: 1 linha nova', () => {
    const after = createEntry(EMPTY, {
      mode: 'single',
      description: 'Mercado',
      amountCents: 4590,
      type: 'despesa',
      category: 'Alimentação',
      date: '2026-05-20',
    })
    expect(diffLedger(EMPTY, after).upsertTransactions).toHaveLength(1)
  })

  it('criar recorrência: 1 regra nova e nenhuma transação', () => {
    const diff = diffLedger(EMPTY, createEntry(EMPTY, RENT))
    expect(diff.upsertRecurrences).toHaveLength(1)
    expect(diff.upsertTransactions).toHaveLength(0)
  })

  it('excluir uma parcela: só aquele id é excluído e nada é regravado', () => {
    const before = createEntry(EMPTY, BUY)
    const item = itemIn(before, '2026-03')
    const diff = diffLedger(before, deleteItem(before, item, 'one'))
    expect(diff.deleteTransactionIds).toEqual([item.transactionId])
    expect(diff.upsertTransactions).toHaveLength(0)
  })

  it('excluir "esta e as próximas": exclui as parcelas 3 a 10', () => {
    const before = createEntry(EMPTY, BUY)
    const diff = diffLedger(before, deleteItem(before, itemIn(before, '2026-03'), 'following'))
    expect(diff.deleteTransactionIds).toHaveLength(8)
    expect(diff.upsertTransactions).toHaveLength(0)
  })

  it('editar o valor de "esta e as próximas": regrava só as 8 afetadas', () => {
    const before = createEntry(EMPTY, BUY)
    const after = editItem(before, itemIn(before, '2026-03'), 'following', { amountCents: 2000 })
    const diff = diffLedger(before, after)
    expect(diff.upsertTransactions).toHaveLength(8)
    expect(diff.upsertTransactions.every((t) => t.amountCents === 2000)).toBe(true)
    expect(diff.upsertTransactions.every((t) => (t.installment?.number ?? 0) >= 3)).toBe(true)
    expect(diff.deleteTransactionIds).toHaveLength(0)
  })

  it('editar o valor com o mesmo número de antes não conta como mudança', () => {
    const before = createEntry(EMPTY, BUY)
    const item = itemIn(before, '2026-03')
    const after = editItem(before, item, 'one', { amountCents: item.amountCents })
    expect(isEmptyDiff(diffLedger(before, after))).toBe(true)
  })

  it('recorrência: excluir só um mês regrava 1 regra (a exceção) e não exclui nada', () => {
    const before = createEntry(EMPTY, RENT)
    const diff = diffLedger(before, deleteItem(before, itemIn(before, '2026-02'), 'one'))
    expect(diff.upsertRecurrences).toHaveLength(1)
    expect(diff.deleteRecurrenceIds).toHaveLength(0)
  })

  it('recorrência: editar "este mês e os próximos" regrava a antiga e cria uma nova', () => {
    const before = createEntry(EMPTY, RENT)
    const after = editItem(before, itemIn(before, '2026-03'), 'following', { amountCents: 180000 })
    const diff = diffLedger(before, after)
    expect(diff.upsertRecurrences).toHaveLength(2)
    expect(diff.deleteRecurrenceIds).toHaveLength(0)
  })

  it('recorrência: excluir a recorrência inteira exclui 1 regra', () => {
    const before = createEntry(EMPTY, RENT)
    const diff = diffLedger(before, deleteItem(before, itemIn(before, '2026-03'), 'all'))
    expect(diff.deleteRecurrenceIds).toHaveLength(1)
    expect(diff.upsertRecurrences).toHaveLength(0)
  })

  it('exceções com as chaves em outra ordem não contam como mudança', () => {
    const base = createEntry(EMPTY, RENT)
    const rule = base.recurrences[0]
    const a: Ledger = {
      ...base,
      recurrences: [{ ...rule, exceptions: { '2026-02': { deleted: true }, '2026-01': { amountCents: 1 } } }],
    }
    const b: Ledger = {
      ...base,
      recurrences: [{ ...rule, exceptions: { '2026-01': { amountCents: 1 }, '2026-02': { deleted: true } } }],
    }
    expect(isEmptyDiff(diffLedger(a, b))).toBe(true)
  })
})

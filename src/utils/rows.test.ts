import { describe, expect, it } from 'vitest'
import type { Recurrence, Transaction } from '../types'
import {
  recurrenceToRow,
  rowToRecurrence,
  rowToTransaction,
  transactionToRow,
} from './rows'
import type { TransactionRow } from './rows'

const USER = '11111111-1111-4111-8111-111111111111'

const single: Transaction = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  description: 'Mercado',
  amountCents: 4590,
  type: 'despesa',
  category: 'Alimentação',
  date: '2026-11-16',
}

const parcel: Transaction = {
  ...single,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  description: 'Fone',
  amountCents: 3334,
  installment: { groupId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', number: 3, total: 3 },
}

const rent: Recurrence = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  description: 'Aluguel',
  amountCents: 150000,
  type: 'despesa',
  category: 'Moradia',
  startDate: '2026-01-31',
  dayOfMonth: 31,
  endDate: '2026-12-31',
  exceptions: { '2026-03': { deleted: true }, '2026-04': { amountCents: 99900 } },
}

describe('transações <-> linhas do banco', () => {
  it('transação simples: ida e volta sem perder nada', () => {
    expect(rowToTransaction(transactionToRow(single, USER))).toEqual(single)
  })

  it('transação simples: campos de parcela ficam vazios (null) na linha', () => {
    const row = transactionToRow(single, USER)
    expect(row.installment_group_id).toBeNull()
    expect(row.installment_number).toBeNull()
    expect(row.installment_total).toBeNull()
    expect(row.user_id).toBe(USER)
  })

  it('parcela: ida e volta mantém grupo, número e total', () => {
    const row = transactionToRow(parcel, USER)
    expect(row.installment_group_id).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    expect(row.installment_number).toBe(3)
    expect(row.installment_total).toBe(3)
    expect(rowToTransaction(row)).toEqual(parcel)
  })

  it('o valor continua em centavos inteiros nos dois sentidos', () => {
    expect(transactionToRow(parcel, USER).amount_cents).toBe(3334)
    expect(rowToTransaction(transactionToRow(parcel, USER)).amountCents).toBe(3334)
  })

  it('recusa valor em centavos com fração (nunca grava R$ quebrado)', () => {
    expect(() => transactionToRow({ ...single, amountCents: 10.5 }, USER)).toThrow()
    const row: TransactionRow = { ...transactionToRow(single, USER), amount_cents: 12.5 }
    expect(() => rowToTransaction(row)).toThrow()
  })

  it('recusa tipo inválido vindo do banco', () => {
    const row: TransactionRow = { ...transactionToRow(single, USER), type: 'outro' }
    expect(() => rowToTransaction(row)).toThrow()
  })
})

describe('recorrências <-> linhas do banco', () => {
  it('ida e volta mantém dia 31, data final e exceções', () => {
    const row = recurrenceToRow(rent, USER)
    expect(row.day_of_month).toBe(31)
    expect(row.end_date).toBe('2026-12-31')
    expect(row.exceptions).toEqual(rent.exceptions)
    expect(rowToRecurrence(row)).toEqual(rent)
  })

  it('sem data final: end_date é null e volta como "sem fim"', () => {
    const open: Recurrence = { ...rent, endDate: undefined }
    const row = recurrenceToRow(open, USER)
    expect(row.end_date).toBeNull()
    expect(rowToRecurrence(row).endDate).toBeUndefined()
  })

  it('valor mensal continua em centavos inteiros', () => {
    expect(recurrenceToRow(rent, USER).amount_cents).toBe(150000)
    expect(() => recurrenceToRow({ ...rent, amountCents: 99.9 }, USER)).toThrow()
  })
})

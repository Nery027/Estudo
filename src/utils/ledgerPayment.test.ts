import { describe, expect, it } from 'vitest'
import type { NewEntry } from '../types'
import { createEntry, deleteItem, editItem, getMonthItems, setPaid } from './ledger'
import type { Ledger, LedgerItem } from './ledger'
import { diffLedger } from './ledgerDiff'

const EMPTY: Ledger = { transactions: [], recurrences: [] }

function build(entries: NewEntry[]): Ledger {
  return entries.reduce((ledger, entry) => createEntry(ledger, entry), EMPTY)
}

const RENT: NewEntry = {
  mode: 'recurring',
  description: 'Luz',
  amountCents: 20000,
  type: 'despesa',
  category: 'Contas',
  date: '2026-01-10',
}

const SOFA: NewEntry = {
  mode: 'installments',
  description: 'Sofá',
  totalCents: 10000,
  count: 3,
  type: 'despesa',
  category: 'Compras',
  date: '2026-01-15',
}

const MARKET: NewEntry = {
  mode: 'single',
  description: 'Mercado',
  amountCents: 4590,
  type: 'despesa',
  category: 'Alimentação',
  date: '2026-05-20',
}

function itemIn(ledger: Ledger, month: string): LedgerItem {
  const items = getMonthItems(ledger, month)
  expect(items).toHaveLength(1)
  return items[0]
}

const paidIn = (ledger: Ledger, months: string[]) =>
  months.map((m) => getMonthItems(ledger, m)[0]?.paidAt ?? null)

describe('setPaid: despesa avulsa', () => {
  it('marca como paga com a data do pagamento e desfaz', () => {
    const ledger = build([MARKET])
    const paid = setPaid(ledger, itemIn(ledger, '2026-05'), '2026-05-18')
    expect(itemIn(paid, '2026-05').paidAt).toBe('2026-05-18')
    expect(paid.transactions[0].paidAt).toBe('2026-05-18')

    const undone = setPaid(paid, itemIn(paid, '2026-05'), null)
    expect(itemIn(undone, '2026-05').paidAt).toBeUndefined()
    expect('paidAt' in undone.transactions[0]).toBe(false)
  })

  it('só a transação marcada muda', () => {
    const ledger = build([MARKET, { ...MARKET, description: 'Padaria' }])
    const target = getMonthItems(ledger, '2026-05').find((i) => i.description === 'Mercado')!
    const paid = setPaid(ledger, target, '2026-05-19')
    const other = getMonthItems(paid, '2026-05').find((i) => i.description === 'Padaria')!
    expect(other.paidAt).toBeUndefined()
  })

  it('não altera os dados originais', () => {
    const ledger = build([MARKET])
    const snapshot = JSON.stringify(ledger)
    setPaid(ledger, itemIn(ledger, '2026-05'), '2026-05-18')
    expect(JSON.stringify(ledger)).toBe(snapshot)
  })

  it('o valor continua em centavos inteiros', () => {
    const ledger = build([MARKET])
    const paid = setPaid(ledger, itemIn(ledger, '2026-05'), '2026-05-18')
    expect(itemIn(paid, '2026-05').amountCents).toBe(4590)
  })
})

describe('setPaid: parcelas', () => {
  it('pagar a parcela 2 não paga as outras', () => {
    const ledger = build([SOFA])
    const paid = setPaid(ledger, itemIn(ledger, '2026-02'), '2026-02-14')
    expect(paidIn(paid, ['2026-01', '2026-02', '2026-03'])).toEqual([null, '2026-02-14', null])
  })

  it('desfazer o pagamento de uma parcela não mexe nas outras', () => {
    let ledger = build([SOFA])
    ledger = setPaid(ledger, itemIn(ledger, '2026-01'), '2026-01-10')
    ledger = setPaid(ledger, itemIn(ledger, '2026-02'), '2026-02-10')
    ledger = setPaid(ledger, itemIn(ledger, '2026-01'), null)
    expect(paidIn(ledger, ['2026-01', '2026-02', '2026-03'])).toEqual([null, '2026-02-10', null])
  })

  it('editar a descrição de todas as parcelas preserva quais estão pagas', () => {
    let ledger = build([SOFA])
    ledger = setPaid(ledger, itemIn(ledger, '2026-02'), '2026-02-14')
    ledger = editItem(ledger, itemIn(ledger, '2026-01'), 'all', { description: 'Sofá novo' })
    expect(paidIn(ledger, ['2026-01', '2026-02', '2026-03'])).toEqual([null, '2026-02-14', null])
    expect(itemIn(ledger, '2026-02').description).toBe('Sofá novo')
  })

  it('excluir uma parcela paga leva o pagamento junto', () => {
    let ledger = build([SOFA])
    ledger = setPaid(ledger, itemIn(ledger, '2026-02'), '2026-02-14')
    ledger = deleteItem(ledger, itemIn(ledger, '2026-02'), 'one')
    expect(ledger.transactions.filter((t) => t.paidAt)).toHaveLength(0)
  })
})

describe('setPaid: recorrente (vale por mês)', () => {
  it('a conta paga em janeiro não paga a de fevereiro', () => {
    const ledger = build([RENT])
    const paid = setPaid(ledger, itemIn(ledger, '2026-01'), '2026-01-09')
    expect(paidIn(paid, ['2026-01', '2026-02', '2026-03'])).toEqual(['2026-01-09', null, null])
    // continua sendo uma única regra: nada de transações por mês
    expect(paid.transactions).toHaveLength(0)
    expect(paid.recurrences).toHaveLength(1)
  })

  it('guarda a data em que foi paga, por mês', () => {
    let ledger = build([RENT])
    ledger = setPaid(ledger, itemIn(ledger, '2026-01'), '2026-01-09')
    ledger = setPaid(ledger, itemIn(ledger, '2026-03'), '2026-03-12')
    expect(ledger.recurrences[0].payments).toEqual({ '2026-01': '2026-01-09', '2026-03': '2026-03-12' })
  })

  it('desfazer um mês não afeta os outros', () => {
    let ledger = build([RENT])
    ledger = setPaid(ledger, itemIn(ledger, '2026-01'), '2026-01-09')
    ledger = setPaid(ledger, itemIn(ledger, '2026-02'), '2026-02-09')
    ledger = setPaid(ledger, itemIn(ledger, '2026-01'), null)
    expect(paidIn(ledger, ['2026-01', '2026-02'])).toEqual([null, '2026-02-09'])
    expect(ledger.recurrences[0].payments).toEqual({ '2026-02': '2026-02-09' })
  })

  it('dia 31: o pagamento de fevereiro (dia 28) não vale para março (dia 31)', () => {
    let ledger = build([{ ...RENT, date: '2027-01-31' }])
    const feb = itemIn(ledger, '2027-02')
    expect(feb.date).toBe('2027-02-28')
    ledger = setPaid(ledger, feb, '2027-02-27')
    expect(itemIn(ledger, '2027-02').paidAt).toBe('2027-02-27')
    expect(itemIn(ledger, '2027-03').date).toBe('2027-03-31')
    expect(itemIn(ledger, '2027-03').paidAt).toBeUndefined()
  })

  it('virada de ano: janeiro do ano seguinte começa pendente', () => {
    let ledger = build([{ ...RENT, date: '2026-12-10' }])
    ledger = setPaid(ledger, itemIn(ledger, '2026-12'), '2026-12-08')
    expect(paidIn(ledger, ['2026-12', '2027-01'])).toEqual(['2026-12-08', null])
  })

  it('editar o valor de "somente este mês" mantém o pagamento daquele mês', () => {
    let ledger = build([RENT])
    ledger = setPaid(ledger, itemIn(ledger, '2026-02'), '2026-02-09')
    ledger = editItem(ledger, itemIn(ledger, '2026-02'), 'one', { amountCents: 25000 })
    expect(itemIn(ledger, '2026-02').paidAt).toBe('2026-02-09')
    expect(itemIn(ledger, '2026-02').amountCents).toBe(25000)
  })

  it('editar a recorrência inteira mantém os pagamentos já feitos', () => {
    let ledger = build([RENT])
    ledger = setPaid(ledger, itemIn(ledger, '2026-01'), '2026-01-09')
    ledger = setPaid(ledger, itemIn(ledger, '2026-02'), '2026-02-09')
    ledger = editItem(ledger, itemIn(ledger, '2026-03'), 'all', { amountCents: 30000 })
    expect(paidIn(ledger, ['2026-01', '2026-02', '2026-03'])).toEqual(['2026-01-09', '2026-02-09', null])
  })

  it('"este mês e os próximos": cada pagamento fica na regra do seu mês', () => {
    let ledger = build([RENT])
    for (const month of ['2026-01', '2026-02', '2026-03', '2026-04']) {
      ledger = setPaid(ledger, itemIn(ledger, month), `${month}-05`)
    }
    ledger = editItem(ledger, itemIn(ledger, '2026-03'), 'following', { amountCents: 30000 })
    expect(ledger.recurrences).toHaveLength(2)
    const [head, tail] = ledger.recurrences
    expect(Object.keys(head.payments).sort()).toEqual(['2026-01', '2026-02'])
    expect(Object.keys(tail.payments).sort()).toEqual(['2026-03', '2026-04'])
    // e a lista continua mostrando tudo pago
    expect(paidIn(ledger, ['2026-01', '2026-02', '2026-03', '2026-04'])).toEqual([
      '2026-01-05',
      '2026-02-05',
      '2026-03-05',
      '2026-04-05',
    ])
  })

  it('excluir "somente este mês" tira o pagamento daquele mês', () => {
    let ledger = build([RENT])
    ledger = setPaid(ledger, itemIn(ledger, '2026-02'), '2026-02-09')
    ledger = deleteItem(ledger, itemIn(ledger, '2026-02'), 'one')
    expect(ledger.recurrences[0].payments).toEqual({})
    expect(getMonthItems(ledger, '2026-02')).toHaveLength(0)
  })

  it('excluir "este mês e os próximos" descarta pagamentos dos meses que deixam de existir', () => {
    let ledger = build([RENT])
    for (const month of ['2026-01', '2026-02', '2026-03']) {
      ledger = setPaid(ledger, itemIn(ledger, month), `${month}-05`)
    }
    ledger = deleteItem(ledger, itemIn(ledger, '2026-02'), 'following')
    expect(Object.keys(ledger.recurrences[0].payments)).toEqual(['2026-01'])
  })
})

describe('setPaid: receitas não têm status de pagamento', () => {
  const salary: NewEntry = {
    mode: 'single',
    description: 'Salário',
    amountCents: 500000,
    type: 'receita',
    category: 'Salário',
    date: '2026-05-05',
  }

  it('transação de receita: nada muda', () => {
    const ledger = build([salary])
    expect(setPaid(ledger, itemIn(ledger, '2026-05'), '2026-05-05')).toBe(ledger)
  })

  it('recorrência de receita: nada muda', () => {
    const ledger = build([{ ...RENT, type: 'receita', category: 'Salário' }])
    expect(setPaid(ledger, itemIn(ledger, '2026-02'), '2026-02-05')).toBe(ledger)
  })

  it('mesmo que o dado venha com paidAt, a receita não exibe pagamento', () => {
    const ledger = build([salary])
    const dirty: Ledger = {
      ...ledger,
      transactions: [{ ...ledger.transactions[0], paidAt: '2026-05-05' }],
    }
    expect(itemIn(dirty, '2026-05').paidAt).toBeUndefined()
  })
})

describe('pagamento e o que vai para o banco (diff)', () => {
  it('marcar uma despesa como paga envia só aquela linha', () => {
    const before = build([SOFA])
    const after = setPaid(before, itemIn(before, '2026-02'), '2026-02-14')
    const diff = diffLedger(before, after)
    expect(diff.upsertTransactions).toHaveLength(1)
    expect(diff.upsertTransactions[0].paidAt).toBe('2026-02-14')
    expect(diff.deleteTransactionIds).toHaveLength(0)
    expect(diff.upsertRecurrences).toHaveLength(0)
  })

  it('desfazer o pagamento também é enviado (a linha volta a ficar sem paid_at)', () => {
    const base = build([MARKET])
    const paid = setPaid(base, itemIn(base, '2026-05'), '2026-05-18')
    const diff = diffLedger(paid, setPaid(paid, itemIn(paid, '2026-05'), null))
    expect(diff.upsertTransactions).toHaveLength(1)
    expect(diff.upsertTransactions[0].paidAt).toBeUndefined()
  })

  it('marcar um mês de recorrente envia só a regra (1 linha de recurrences)', () => {
    const before = build([RENT])
    const after = setPaid(before, itemIn(before, '2026-03'), '2026-03-09')
    const diff = diffLedger(before, after)
    expect(diff.upsertRecurrences).toHaveLength(1)
    expect(diff.upsertRecurrences[0].payments).toEqual({ '2026-03': '2026-03-09' })
    expect(diff.upsertTransactions).toHaveLength(0)
  })

  it('marcar de novo com a mesma data não gera envio nenhum', () => {
    const before = build([MARKET])
    const paid = setPaid(before, itemIn(before, '2026-05'), '2026-05-18')
    const again = setPaid(paid, itemIn(paid, '2026-05'), '2026-05-18')
    const diff = diffLedger(paid, again)
    expect(diff.upsertTransactions).toHaveLength(0)
  })
})

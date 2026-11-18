import { describe, expect, it } from 'vitest'
import type { NewEntry } from '../types'
import { createEntry, deleteItem, editItem, getMonthItems, itemTitle } from './ledger'
import type { Ledger, LedgerItem } from './ledger'

const EMPTY: Ledger = { transactions: [], recurrences: [] }

function add(ledger: Ledger, entry: NewEntry): Ledger {
  return createEntry(ledger, entry)
}

function installments(description = 'Compra X', totalCents = 100000, count = 10): Ledger {
  return add(EMPTY, {
    mode: 'installments',
    description,
    totalCents,
    count,
    type: 'despesa',
    category: 'Compras',
    date: '2026-01-15',
  })
}

function rent(extra: { endDate?: string; date?: string } = {}): Ledger {
  return add(EMPTY, {
    mode: 'recurring',
    description: 'Aluguel',
    amountCents: 150000,
    type: 'despesa',
    category: 'Moradia',
    date: extra.date ?? '2026-01-10',
    endDate: extra.endDate,
  })
}

// Pega o item de um mês (deve existir exatamente um)
function itemIn(ledger: Ledger, month: string): LedgerItem {
  const items = getMonthItems(ledger, month)
  expect(items).toHaveLength(1)
  return items[0]
}

function amountsByMonth(ledger: Ledger, months: string[]): (number | null)[] {
  return months.map((m) => getMonthItems(ledger, m)[0]?.amountCents ?? null)
}

describe('compra parcelada', () => {
  it('cria uma parcela por mês, com título "Compra X (3/10)"', () => {
    const ledger = installments()
    expect(ledger.transactions).toHaveLength(10)
    expect(itemTitle(itemIn(ledger, '2026-03'))).toBe('Compra X (3/10)')
    expect(itemTitle(itemIn(ledger, '2026-10'))).toBe('Compra X (10/10)')
  })

  it('as parcelas futuras aparecem nos meses certos e em nenhum outro', () => {
    const ledger = installments()
    expect(getMonthItems(ledger, '2025-12')).toHaveLength(0)
    expect(getMonthItems(ledger, '2026-01')).toHaveLength(1)
    expect(getMonthItems(ledger, '2026-10')).toHaveLength(1)
    expect(getMonthItems(ledger, '2026-11')).toHaveLength(0)
  })

  it('100,00 em 3x: 33,33 + 33,33 + 33,34', () => {
    const ledger = installments('Fone', 10000, 3)
    expect(amountsByMonth(ledger, ['2026-01', '2026-02', '2026-03'])).toEqual([3333, 3333, 3334])
  })

  it('todas as parcelas compartilham o mesmo grupo e são marcadas como parceladas', () => {
    const ledger = installments()
    const groups = new Set(ledger.transactions.map((t) => t.installment?.groupId))
    expect(groups.size).toBe(1)
    expect(itemIn(ledger, '2026-02').kind).toBe('installment')
  })

  it('duas compras diferentes têm grupos diferentes', () => {
    const ledger = add(installments('A', 3000, 3), {
      mode: 'installments',
      description: 'B',
      totalCents: 3000,
      count: 3,
      type: 'despesa',
      category: 'Compras',
      date: '2026-01-15',
    })
    const groups = new Set(ledger.transactions.map((t) => t.installment?.groupId))
    expect(groups.size).toBe(2)
  })
})

describe('recorrente fixa', () => {
  it('aparece todos os meses a partir do início, mas não antes', () => {
    const ledger = rent()
    expect(getMonthItems(ledger, '2025-12')).toHaveLength(0)
    expect(itemIn(ledger, '2026-01').kind).toBe('recurring')
    expect(itemIn(ledger, '2027-06').date).toBe('2027-06-10')
  })

  it('com data final, para de aparecer depois dela', () => {
    const ledger = rent({ endDate: '2026-03-31' })
    expect(getMonthItems(ledger, '2026-03')).toHaveLength(1)
    expect(getMonthItems(ledger, '2026-04')).toHaveLength(0)
  })

  it('dia 31 usa o último dia dos meses curtos', () => {
    const ledger = rent({ date: '2026-01-31' })
    expect(itemIn(ledger, '2026-02').date).toBe('2026-02-28')
    expect(itemIn(ledger, '2026-03').date).toBe('2026-03-31')
    expect(itemIn(ledger, '2026-04').date).toBe('2026-04-30')
    expect(itemIn(ledger, '2028-02').date).toBe('2028-02-29')
  })

  it('não cria uma transação por mês (guarda só a regra)', () => {
    const ledger = rent()
    expect(ledger.transactions).toHaveLength(0)
    expect(ledger.recurrences).toHaveLength(1)
  })
})

describe('transação simples', () => {
  it('aparece só no mês da data', () => {
    const ledger = add(EMPTY, {
      mode: 'single',
      description: 'Mercado',
      amountCents: 5000,
      type: 'despesa',
      category: 'Alimentação',
      date: '2026-05-20',
    })
    expect(itemIn(ledger, '2026-05').kind).toBe('single')
    expect(getMonthItems(ledger, '2026-06')).toHaveLength(0)
  })
})

describe('excluir parcelas', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']
  const exists = (ledger: Ledger) => months.map((m) => getMonthItems(ledger, m).length === 1)

  it('somente esta', () => {
    const ledger = installments('Compra X', 5000, 5)
    const result = deleteItem(ledger, itemIn(ledger, '2026-03'), 'one')
    expect(exists(result)).toEqual([true, true, false, true, true])
  })

  it('esta e as próximas', () => {
    const ledger = installments('Compra X', 5000, 5)
    const result = deleteItem(ledger, itemIn(ledger, '2026-03'), 'following')
    expect(exists(result)).toEqual([true, true, false, false, false])
  })

  it('o grupo inteiro', () => {
    const ledger = installments('Compra X', 5000, 5)
    const result = deleteItem(ledger, itemIn(ledger, '2026-03'), 'all')
    expect(exists(result)).toEqual([false, false, false, false, false])
  })

  it('não mexe em parcelas de outra compra', () => {
    const other = add(installments('Compra X', 5000, 5), {
      mode: 'installments',
      description: 'Outra',
      totalCents: 5000,
      count: 5,
      type: 'despesa',
      category: 'Compras',
      date: '2026-01-15',
    })
    const target = getMonthItems(other, '2026-03').find((i) => i.description === 'Compra X')!
    const result = deleteItem(other, target, 'all')
    expect(result.transactions).toHaveLength(5)
    expect(result.transactions.every((t) => t.description === 'Outra')).toBe(true)
  })

  it('transação simples é excluída', () => {
    const ledger = add(EMPTY, {
      mode: 'single',
      description: 'Mercado',
      amountCents: 5000,
      type: 'despesa',
      category: 'Alimentação',
      date: '2026-05-20',
    })
    expect(deleteItem(ledger, itemIn(ledger, '2026-05'), 'one').transactions).toHaveLength(0)
  })
})

describe('excluir recorrências', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04']
  const exists = (ledger: Ledger) => months.map((m) => getMonthItems(ledger, m).length === 1)

  it('somente este mês: os outros continuam', () => {
    const ledger = rent()
    const result = deleteItem(ledger, itemIn(ledger, '2026-02'), 'one')
    expect(exists(result)).toEqual([true, false, true, true])
  })

  it('este mês e os próximos: encerra a recorrência', () => {
    const ledger = rent()
    const result = deleteItem(ledger, itemIn(ledger, '2026-03'), 'following')
    expect(exists(result)).toEqual([true, true, false, false])
    expect(getMonthItems(result, '2030-01')).toHaveLength(0)
  })

  it('este mês e os próximos, no primeiro mês: remove a recorrência toda', () => {
    const ledger = rent()
    const result = deleteItem(ledger, itemIn(ledger, '2026-01'), 'following')
    expect(result.recurrences).toHaveLength(0)
  })

  it('a recorrência inteira', () => {
    const ledger = rent()
    const result = deleteItem(ledger, itemIn(ledger, '2026-03'), 'all')
    expect(result.recurrences).toHaveLength(0)
    expect(exists(result)).toEqual([false, false, false, false])
  })
})

describe('editar parcelas', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']

  it('somente esta: muda valor só dela', () => {
    const ledger = installments('Compra X', 5000, 5)
    const result = editItem(ledger, itemIn(ledger, '2026-03'), 'one', { amountCents: 2000 })
    expect(amountsByMonth(result, months)).toEqual([1000, 1000, 2000, 1000, 1000])
  })

  it('esta e as próximas: muda a 3ª em diante', () => {
    const ledger = installments('Compra X', 5000, 5)
    const result = editItem(ledger, itemIn(ledger, '2026-03'), 'following', { amountCents: 2000 })
    expect(amountsByMonth(result, months)).toEqual([1000, 1000, 2000, 2000, 2000])
  })

  it('o grupo inteiro: muda a descrição de todas e mantém os valores', () => {
    const ledger = installments('Compra X', 10000, 3)
    const result = editItem(ledger, itemIn(ledger, '2026-02'), 'all', { description: 'Geladeira' })
    expect(getMonthItems(result, '2026-01')[0].description).toBe('Geladeira')
    expect(itemTitle(getMonthItems(result, '2026-03')[0])).toBe('Geladeira (3/3)')
    // a última parcela continua com a diferença dos centavos
    expect(amountsByMonth(result, ['2026-01', '2026-02', '2026-03'])).toEqual([3333, 3333, 3334])
  })

  it('a data de uma parcela não muda, mesmo se vier no pedido', () => {
    const ledger = installments('Compra X', 5000, 5)
    const result = editItem(ledger, itemIn(ledger, '2026-03'), 'one', { date: '2030-01-01' })
    expect(itemIn(result, '2026-03').date).toBe('2026-03-15')
    expect(getMonthItems(result, '2030-01')).toHaveLength(0)
  })

  it('campos não informados (undefined) não apagam nada', () => {
    const ledger = installments('Compra X', 5000, 5)
    const result = editItem(ledger, itemIn(ledger, '2026-03'), 'one', {
      category: 'Lazer',
      description: undefined,
    })
    expect(itemIn(result, '2026-03').description).toBe('Compra X')
    expect(itemIn(result, '2026-03').category).toBe('Lazer')
  })
})

describe('editar transação simples', () => {
  it('pode mudar a data para outro mês', () => {
    const ledger = add(EMPTY, {
      mode: 'single',
      description: 'Mercado',
      amountCents: 5000,
      type: 'despesa',
      category: 'Alimentação',
      date: '2026-05-20',
    })
    const result = editItem(ledger, itemIn(ledger, '2026-05'), 'one', { date: '2026-06-02' })
    expect(getMonthItems(result, '2026-05')).toHaveLength(0)
    expect(itemIn(result, '2026-06').date).toBe('2026-06-02')
  })
})

describe('editar recorrências', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04']

  it('somente este mês: só aquele mês muda', () => {
    const ledger = rent()
    const result = editItem(ledger, itemIn(ledger, '2026-02'), 'one', { amountCents: 99900 })
    expect(amountsByMonth(result, months)).toEqual([150000, 99900, 150000, 150000])
  })

  it('este mês e os próximos: mês anterior mantém o valor antigo', () => {
    const ledger = rent()
    const result = editItem(ledger, itemIn(ledger, '2026-03'), 'following', { amountCents: 180000 })
    expect(amountsByMonth(result, months)).toEqual([150000, 150000, 180000, 180000])
    expect(getMonthItems(result, '2030-01')[0].amountCents).toBe(180000)
    expect(result.recurrences).toHaveLength(2)
  })

  it('este mês e os próximos: a nova recorrência mantém o dia 31 original', () => {
    const ledger = rent({ date: '2026-01-31' })
    const result = editItem(ledger, itemIn(ledger, '2026-02'), 'following', { amountCents: 1 })
    expect(itemIn(result, '2026-02').date).toBe('2026-02-28')
    expect(itemIn(result, '2026-03').date).toBe('2026-03-31')
    expect(itemIn(result, '2026-04').date).toBe('2026-04-30')
  })

  it('este mês e os próximos: respeita a data final original', () => {
    const ledger = rent({ endDate: '2026-04-30' })
    const result = editItem(ledger, itemIn(ledger, '2026-03'), 'following', { amountCents: 180000 })
    expect(getMonthItems(result, '2026-04')).toHaveLength(1)
    expect(getMonthItems(result, '2026-05')).toHaveLength(0)
  })

  it('este mês e os próximos, no primeiro mês: muda a recorrência toda', () => {
    const ledger = rent()
    const result = editItem(ledger, itemIn(ledger, '2026-01'), 'following', { amountCents: 1 })
    expect(result.recurrences).toHaveLength(1)
    expect(amountsByMonth(result, months)).toEqual([1, 1, 1, 1])
  })

  it('a recorrência inteira: muda todos os meses, até os já editados antes', () => {
    const ledger = rent()
    const withException = editItem(ledger, itemIn(ledger, '2026-02'), 'one', { amountCents: 99900 })
    const result = editItem(withException, itemIn(withException, '2026-03'), 'all', {
      amountCents: 170000,
    })
    expect(amountsByMonth(result, months)).toEqual([170000, 170000, 170000, 170000])
  })

  it('uma exclusão "só este mês" continua valendo depois de editar o grupo', () => {
    const ledger = rent()
    const deleted = deleteItem(ledger, itemIn(ledger, '2026-02'), 'one')
    const result = editItem(deleted, itemIn(deleted, '2026-03'), 'all', { amountCents: 170000 })
    expect(amountsByMonth(result, months)).toEqual([170000, null, 170000, 170000])
  })

  it('a data da recorrência não muda', () => {
    const ledger = rent()
    const result = editItem(ledger, itemIn(ledger, '2026-02'), 'all', { date: '2030-01-01' })
    expect(itemIn(result, '2026-02').date).toBe('2026-02-10')
  })
})

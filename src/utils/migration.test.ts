import { describe, expect, it } from 'vitest'
import type { NewEntry } from '../types'
import { createEntry, deleteItem, editItem, getMonthItems } from './ledger'
import type { Ledger } from './ledger'
import { deriveId, remapForImport } from './migration'

const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const CLOUD_USER = '11111111-1111-4111-8111-111111111111'
const OTHER_USER = '22222222-2222-4222-8222-222222222222'

function sampleLedger(): Ledger {
  const entries: NewEntry[] = [
    { mode: 'single', description: 'Mercado', amountCents: 4590, type: 'despesa', category: 'Alimentação', date: '2026-05-20' },
    { mode: 'installments', description: 'Fone', totalCents: 10000, count: 3, type: 'despesa', category: 'Compras', date: '2026-01-31' },
    { mode: 'installments', description: 'Sofá', totalCents: 90000, count: 6, type: 'despesa', category: 'Moradia', date: '2026-02-10' },
    { mode: 'recurring', description: 'Aluguel', amountCents: 150000, type: 'despesa', category: 'Moradia', date: '2026-01-31' },
  ]
  let ledger: Ledger = { transactions: [], recurrences: [] }
  for (const entry of entries) ledger = createEntry(ledger, entry)
  // uma exceção de recorrência, para conferir que ela é preservada
  const march = getMonthItems(ledger, '2026-03').find((i) => i.kind === 'recurring')!
  ledger = deleteItem(ledger, march, 'one')
  const april = getMonthItems(ledger, '2026-04').find((i) => i.kind === 'recurring')!
  return editItem(ledger, april, 'one', { amountCents: 99900 })
}

describe('deriveId (identificador calculado)', () => {
  it('tem formato de UUID', async () => {
    expect(await deriveId(CLOUD_USER, 'tx:abc')).toMatch(UUID_V5)
  })

  it('é sempre o mesmo para a mesma entrada (por isso importar de novo não duplica)', async () => {
    expect(await deriveId(CLOUD_USER, 'tx:abc')).toBe(await deriveId(CLOUD_USER, 'tx:abc'))
  })

  it('muda quando muda o usuário ou o item', async () => {
    const base = await deriveId(CLOUD_USER, 'tx:abc')
    expect(await deriveId(OTHER_USER, 'tx:abc')).not.toBe(base)
    expect(await deriveId(CLOUD_USER, 'tx:abd')).not.toBe(base)
  })

  it('transação e recorrência com o mesmo id antigo não colidem', async () => {
    expect(await deriveId(CLOUD_USER, 'tx:abc')).not.toBe(await deriveId(CLOUD_USER, 'rec:abc'))
  })
})

describe('remapForImport (preparar a importação)', () => {
  it('troca todos os ids por ids novos e únicos', async () => {
    const original = sampleLedger()
    const result = await remapForImport(original, CLOUD_USER)
    const oldIds = new Set(original.transactions.map((t) => t.id))
    expect(result.transactions).toHaveLength(original.transactions.length)
    for (const t of result.transactions) {
      expect(t.id).toMatch(UUID_V5)
      expect(oldIds.has(t.id)).toBe(false)
    }
    const newIds = result.transactions.map((t) => t.id)
    expect(new Set(newIds).size).toBe(newIds.length)
  })

  it('mantém valores em centavos, datas, descrições e categorias', async () => {
    const original = sampleLedger()
    const result = await remapForImport(original, CLOUD_USER)
    const strip = (t: { id: string; installment?: unknown }) => {
      const { id: _id, installment: _installment, ...rest } = t as Record<string, unknown>
      return rest
    }
    expect(result.transactions.map(strip)).toEqual(original.transactions.map(strip))
    expect(result.recurrences.map((r) => r.amountCents)).toEqual(
      original.recurrences.map((r) => r.amountCents),
    )
  })

  it('parcelas da mesma compra continuam no mesmo grupo e compras diferentes ficam em grupos diferentes', async () => {
    const original = sampleLedger()
    const result = await remapForImport(original, CLOUD_USER)
    const groupOf = (description: string) =>
      new Set(result.transactions.filter((t) => t.description === description).map((t) => t.installment?.groupId))
    expect(groupOf('Fone').size).toBe(1)
    expect(groupOf('Sofá').size).toBe(1)
    expect([...groupOf('Fone')][0]).not.toBe([...groupOf('Sofá')][0])
    expect(groupOf('Mercado')).toEqual(new Set([undefined]))
  })

  it('mantém número e total das parcelas', async () => {
    const result = await remapForImport(sampleLedger(), CLOUD_USER)
    const fone = result.transactions
      .filter((t) => t.description === 'Fone')
      .map((t) => `${t.installment?.number}/${t.installment?.total}`)
      .sort()
    expect(fone).toEqual(['1/3', '2/3', '3/3'])
  })

  it('mantém dia 31, exceções e a data final das recorrências', async () => {
    const original = sampleLedger()
    const result = await remapForImport(original, CLOUD_USER)
    expect(result.recurrences).toHaveLength(1)
    expect(result.recurrences[0].dayOfMonth).toBe(31)
    expect(result.recurrences[0].exceptions).toEqual(original.recurrences[0].exceptions)
    expect(result.recurrences[0].id).not.toBe(original.recurrences[0].id)
  })

  it('não altera os dados originais', async () => {
    const original = sampleLedger()
    const snapshot = JSON.stringify(original)
    await remapForImport(original, CLOUD_USER)
    expect(JSON.stringify(original)).toBe(snapshot)
  })

  it('importar duas vezes dá exatamente o mesmo resultado (sem duplicar)', async () => {
    const original = sampleLedger()
    const first = await remapForImport(original, CLOUD_USER)
    const second = await remapForImport(original, CLOUD_USER)
    expect(second).toEqual(first)
  })

  it('usuários diferentes recebem ids diferentes para os mesmos dados', async () => {
    const original = sampleLedger()
    const mine = await remapForImport(original, CLOUD_USER)
    const theirs = await remapForImport(original, OTHER_USER)
    const mineIds = new Set(mine.transactions.map((t) => t.id))
    expect(theirs.transactions.some((t) => mineIds.has(t.id))).toBe(false)
  })

  it('sem dados, devolve listas vazias', async () => {
    expect(await remapForImport({ transactions: [], recurrences: [] }, CLOUD_USER)).toEqual({
      transactions: [],
      recurrences: [],
    })
  })
})

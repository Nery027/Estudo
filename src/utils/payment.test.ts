import { describe, expect, it } from 'vitest'
import type { NewEntry } from '../types'
import { createEntry, getMonthItems, setPaid } from './ledger'
import type { Ledger, LedgerItem } from './ledger'
import {
  ALERT_LOOKBACK_DAYS,
  alertMonths,
  buildNotificationText,
  collectDueAlerts,
  countAlerts,
  monthPaymentTotals,
  paymentStatus,
} from './payment'

const EMPTY: Ledger = { transactions: [], recurrences: [] }

function expense(date: string, description = 'Conta', amountCents = 1000): NewEntry {
  return { mode: 'single', description, amountCents, type: 'despesa', category: 'Contas', date }
}

function build(entries: NewEntry[]): Ledger {
  return entries.reduce((ledger, entry) => createEntry(ledger, entry), EMPTY)
}

function itemOn(ledger: Ledger, month: string, description: string): LedgerItem {
  const found = getMonthItems(ledger, month).find((i) => i.description === description)
  if (!found) throw new Error(`Item "${description}" não encontrado em ${month}`)
  return found
}

function alertsFor(ledger: Ledger, today: string) {
  return collectDueAlerts((month) => getMonthItems(ledger, month), today)
}

const names = (items: LedgerItem[]) => items.map((i) => i.description)

describe('paymentStatus (Paga, Pendente ou Vencida)', () => {
  const base = { type: 'despesa' as const, date: '2026-11-25' }

  it('receita não tem status', () => {
    expect(paymentStatus({ type: 'receita', date: '2026-11-01' }, '2026-11-25')).toBeNull()
  })

  it('com data de pagamento é paga, mesmo que a data de vencimento já tenha passado', () => {
    expect(paymentStatus({ ...base, paidAt: '2026-11-20' }, '2026-12-30')).toBe('paid')
  })

  it('vence hoje e não foi paga: ainda é pendente, não vencida', () => {
    expect(paymentStatus(base, '2026-11-25')).toBe('pending')
  })

  it('vence no futuro: pendente', () => {
    expect(paymentStatus(base, '2026-11-24')).toBe('pending')
    expect(paymentStatus(base, '2026-01-01')).toBe('pending')
  })

  it('a data passou sem pagamento: vencida (a partir do dia seguinte)', () => {
    expect(paymentStatus(base, '2026-11-26')).toBe('overdue')
  })

  it('virada de ano: venceu em 31/12 e hoje é 01/01 = vencida', () => {
    expect(paymentStatus({ ...base, date: '2026-12-31' }, '2027-01-01')).toBe('overdue')
    expect(paymentStatus({ ...base, date: '2026-12-31' }, '2026-12-31')).toBe('pending')
  })
})

describe('alertMonths (meses consultados para o aviso)', () => {
  it('cobre a janela de vencidas até o mês de amanhã', () => {
    expect(alertMonths('2026-11-25')).toEqual(['2026-09', '2026-10', '2026-11'])
  })

  it('no último dia do ano inclui janeiro, porque amanhã já é outro ano', () => {
    expect(alertMonths('2026-12-31')).toEqual(['2026-11', '2026-12', '2027-01'])
  })

  it('no último dia do mês inclui o mês seguinte', () => {
    expect(alertMonths('2026-11-30')).toContain('2026-12')
  })
})

describe('collectDueAlerts (o que aparece no aviso do topo)', () => {
  const TODAY = '2026-11-25'

  it('separa vencidas, vencem hoje e vencem amanhã', () => {
    const ledger = build([
      expense('2026-11-24', 'Ontem'),
      expense('2026-11-25', 'Hoje'),
      expense('2026-11-26', 'Amanhã'),
      expense('2026-11-27', 'Depois de amanhã'),
    ])
    const alerts = alertsFor(ledger, TODAY)
    expect(names(alerts.overdue)).toEqual(['Ontem'])
    expect(names(alerts.today)).toEqual(['Hoje'])
    expect(names(alerts.tomorrow)).toEqual(['Amanhã'])
    expect(countAlerts(alerts)).toBe(3)
  })

  it('despesa paga não aparece no aviso', () => {
    let ledger = build([expense('2026-11-25', 'Paga'), expense('2026-11-25', 'Aberta')])
    ledger = setPaid(ledger, itemOn(ledger, '2026-11', 'Paga'), '2026-11-20')
    expect(names(alertsFor(ledger, TODAY).today)).toEqual(['Aberta'])
  })

  it('receita nunca aparece no aviso', () => {
    const ledger = build([
      { mode: 'single', description: 'Salário', amountCents: 500000, type: 'receita', category: 'Salário', date: '2026-11-25' },
    ])
    expect(countAlerts(alertsFor(ledger, TODAY))).toBe(0)
  })

  it('vencidas: incluem exatamente os últimos 60 dias e ignoram as mais antigas', () => {
    expect(ALERT_LOOKBACK_DAYS).toBe(60)
    const ledger = build([
      expense('2026-09-26', 'No limite'), // 60 dias antes de 25/11
      expense('2026-09-25', 'Antiga demais'), // 61 dias antes
    ])
    expect(names(alertsFor(ledger, TODAY).overdue)).toEqual(['No limite'])
  })

  it('vencidas vêm da mais antiga para a mais recente, atravessando meses', () => {
    const ledger = build([
      expense('2026-11-20', 'C'),
      expense('2026-10-05', 'A'),
      expense('2026-11-02', 'B'),
    ])
    expect(names(alertsFor(ledger, TODAY).overdue)).toEqual(['A', 'B', 'C'])
  })

  it('virada de ano: no dia 31/12, uma conta de 01/01 aparece como "amanhã"', () => {
    const ledger = build([expense('2027-01-01', 'Ano novo'), expense('2026-12-30', 'Atrasada')])
    const alerts = alertsFor(ledger, '2026-12-31')
    expect(names(alerts.tomorrow)).toEqual(['Ano novo'])
    expect(names(alerts.overdue)).toEqual(['Atrasada'])
  })

  it('virada de ano para trás: em 02/01, uma conta de 30/12 está vencida', () => {
    const ledger = build([expense('2026-12-30', 'Dezembro')])
    expect(names(alertsFor(ledger, '2027-01-02').overdue)).toEqual(['Dezembro'])
  })

  it('recorrente no dia 31: em fevereiro vence dia 28 e o aviso acompanha', () => {
    const ledger = build([
      { mode: 'recurring', description: 'Aluguel', amountCents: 150000, type: 'despesa', category: 'Moradia', date: '2027-01-31' },
    ])
    expect(names(alertsFor(ledger, '2027-02-27').tomorrow)).toEqual(['Aluguel'])
    expect(names(alertsFor(ledger, '2027-02-28').today)).toEqual(['Aluguel'])
    // em março volta ao dia 31
    expect(names(alertsFor(ledger, '2027-03-30').tomorrow)).toEqual(['Aluguel'])
  })

  it('recorrente paga em um mês e pendente no outro', () => {
    let ledger = build([
      { mode: 'recurring', description: 'Luz', amountCents: 20000, type: 'despesa', category: 'Contas', date: '2026-01-10' },
    ])
    ledger = setPaid(ledger, itemOn(ledger, '2026-01', 'Luz'), '2026-01-09')

    // 10/02: janeiro está paga, fevereiro vence hoje
    expect(names(alertsFor(ledger, '2026-02-10').today)).toEqual(['Luz'])
    // 11/02: fevereiro venceu; janeiro (paga) não volta como vencida
    const next = alertsFor(ledger, '2026-02-11')
    expect(next.overdue.map((i) => i.date)).toEqual(['2026-02-10'])
    expect(next.today).toHaveLength(0)
  })

  it('parcelas: cada parcela tem o próprio pagamento', () => {
    let ledger = build([
      { mode: 'installments', description: 'Sofá', totalCents: 90000, count: 3, type: 'despesa', category: 'Compras', date: '2026-11-26' },
    ])
    // paga só a parcela 1 (26/11)
    ledger = setPaid(ledger, itemOn(ledger, '2026-11', 'Sofá'), '2026-11-25')

    // em 25/12 a parcela 2 vence amanhã e a 1 (paga) não aparece como vencida
    const alerts = alertsFor(ledger, '2026-12-25')
    expect(alerts.tomorrow.map((i) => `${i.installment?.number}/${i.installment?.total}`)).toEqual(['2/3'])
    expect(alerts.overdue).toHaveLength(0)

    // se a parcela 1 NÃO tivesse sido paga, estaria vencida
    const unpaid = build([
      { mode: 'installments', description: 'Sofá', totalCents: 90000, count: 3, type: 'despesa', category: 'Compras', date: '2026-11-26' },
    ])
    expect(alertsFor(unpaid, '2026-12-25').overdue.map((i) => i.installment?.number)).toEqual([1])
  })

  it('sem nada pendente, o aviso fica vazio', () => {
    expect(countAlerts(alertsFor(EMPTY, TODAY))).toBe(0)
  })
})

describe('monthPaymentTotals (Pago e A pagar do mês)', () => {
  const TODAY = '2026-11-15'

  function monthTotals(ledger: Ledger) {
    return monthPaymentTotals(getMonthItems(ledger, '2026-11'), TODAY)
  }

  it('soma pagas, pendentes e vencidas', () => {
    let ledger = build([
      expense('2026-11-05', 'Paga', 10000),
      expense('2026-11-10', 'Vencida', 5000),
      expense('2026-11-15', 'Hoje', 2500),
      expense('2026-11-28', 'Futura', 1000),
    ])
    ledger = setPaid(ledger, itemOn(ledger, '2026-11', 'Paga'), '2026-11-05')
    expect(monthTotals(ledger)).toEqual({
      paidCents: 10000,
      pendingCents: 8500, // vencida + hoje + futura
      overdueCents: 5000,
    })
  })

  it('receitas ficam de fora dos totais', () => {
    const ledger = build([
      { mode: 'single', description: 'Salário', amountCents: 500000, type: 'receita', category: 'Salário', date: '2026-11-05' },
      expense('2026-11-20', 'Conta', 1234),
    ])
    expect(monthTotals(ledger)).toEqual({ paidCents: 0, pendingCents: 1234, overdueCents: 0 })
  })

  it('recorrente paga neste mês conta como paga só neste mês', () => {
    let ledger = build([
      { mode: 'recurring', description: 'Luz', amountCents: 20000, type: 'despesa', category: 'Contas', date: '2026-01-20' },
    ])
    ledger = setPaid(ledger, itemOn(ledger, '2026-11', 'Luz'), '2026-11-12')
    expect(monthTotals(ledger).paidCents).toBe(20000)
    const december = monthPaymentTotals(getMonthItems(ledger, '2026-12'), TODAY)
    expect(december).toEqual({ paidCents: 0, pendingCents: 20000, overdueCents: 0 })
  })

  it('valores continuam em centavos inteiros (33,33 + 33,33 + 33,34)', () => {
    let ledger = build([
      { mode: 'installments', description: 'Fone', totalCents: 10000, count: 3, type: 'despesa', category: 'Compras', date: '2026-11-20' },
    ])
    ledger = setPaid(ledger, itemOn(ledger, '2026-11', 'Fone'), '2026-11-20')
    const total = monthPaymentTotals(getMonthItems(ledger, '2026-11'), TODAY)
    expect(total.paidCents).toBe(3333)
    expect(Number.isInteger(total.pendingCents)).toBe(true)
  })

  it('mês vazio: tudo zero', () => {
    expect(monthPaymentTotals([], TODAY)).toEqual({ paidCents: 0, pendingCents: 0, overdueCents: 0 })
  })
})

describe('buildNotificationText (texto da notificação do navegador)', () => {
  const item = { description: 'x' } as LedgerItem
  const many = (n: number) => Array.from({ length: n }, () => item)

  it('sem alertas, não há notificação', () => {
    expect(buildNotificationText({ overdue: [], today: [], tomorrow: [] })).toBeNull()
  })

  it('singular', () => {
    expect(buildNotificationText({ overdue: many(1), today: many(1), tomorrow: many(1) })).toEqual({
      title: 'Contas a pagar',
      body: '1 vencida, 1 vence hoje, 1 vence amanhã',
    })
  })

  it('plural e só os grupos que existem', () => {
    expect(buildNotificationText({ overdue: many(2), today: [], tomorrow: many(3) })?.body).toBe(
      '2 vencidas, 3 vencem amanhã',
    )
    expect(buildNotificationText({ overdue: [], today: many(2), tomorrow: [] })?.body).toBe(
      '2 vencem hoje',
    )
  })
})

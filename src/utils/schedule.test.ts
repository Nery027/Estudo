import { describe, expect, it } from 'vitest'
import {
  buildInstallmentPlan,
  daysInMonth,
  dateForMonth,
  recurrenceDateIn,
  splitAmount,
} from './schedule'

describe('splitAmount (divisão do valor em parcelas)', () => {
  it('100,00 em 3x dá 33,33 + 33,33 + 33,34', () => {
    expect(splitAmount(10000, 3)).toEqual([3333, 3333, 3334])
  })

  it('divisão exata: 1.000,00 em 10x dá 10 parcelas de 100,00', () => {
    expect(splitAmount(100000, 10)).toEqual(Array(10).fill(10000))
  })

  it('a última parcela absorve a diferença (100,01 em 2x)', () => {
    expect(splitAmount(10001, 2)).toEqual([5000, 5001])
  })

  it('1x devolve o valor inteiro', () => {
    expect(splitAmount(12345, 1)).toEqual([12345])
  })

  it('a soma das parcelas é sempre igual ao total', () => {
    for (const total of [1, 7, 99, 100, 1001, 99999, 123457]) {
      for (const count of [1, 2, 3, 6, 7, 10, 12]) {
        if (total < count) continue
        const parts = splitAmount(total, count)
        expect(parts).toHaveLength(count)
        expect(parts.reduce((sum, part) => sum + part, 0)).toBe(total)
      }
    }
  })

  it('a última parcela nunca é menor que as outras', () => {
    const parts = splitAmount(10000, 7)
    expect(parts[6]).toBeGreaterThanOrEqual(parts[0])
  })

  it('recusa número de parcelas inválido', () => {
    expect(() => splitAmount(10000, 0)).toThrow(RangeError)
    expect(() => splitAmount(10000, 2.5)).toThrow(RangeError)
    expect(() => splitAmount(10000, -3)).toThrow(RangeError)
  })

  it('recusa valor menor que 1 centavo por parcela', () => {
    expect(() => splitAmount(2, 3)).toThrow(RangeError)
    expect(() => splitAmount(0, 1)).toThrow(RangeError)
  })
})

describe('daysInMonth (dias de cada mês)', () => {
  it('meses de 31 dias', () => {
    expect(daysInMonth('2026-01')).toBe(31)
    expect(daysInMonth('2026-12')).toBe(31)
  })

  it('meses de 30 dias', () => {
    expect(daysInMonth('2026-04')).toBe(30)
    expect(daysInMonth('2026-11')).toBe(30)
  })

  it('fevereiro de 28 dias em ano comum', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2100-02')).toBe(28) // século não divisível por 400
  })

  it('fevereiro de 29 dias em ano bissexto', () => {
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2000-02')).toBe(29)
  })
})

describe('dateForMonth (dia 31 em mês curto usa o último dia)', () => {
  it('dia 31 em mês de 31 dias continua 31', () => {
    expect(dateForMonth('2026-01', 31)).toBe('2026-01-31')
  })

  it('dia 31 em mês de 30 dias vira 30', () => {
    expect(dateForMonth('2026-04', 31)).toBe('2026-04-30')
  })

  it('dia 31 em fevereiro vira 28 (ano comum) ou 29 (bissexto)', () => {
    expect(dateForMonth('2026-02', 31)).toBe('2026-02-28')
    expect(dateForMonth('2028-02', 31)).toBe('2028-02-29')
  })

  it('dia 30 e 29 em fevereiro também ajustam', () => {
    expect(dateForMonth('2026-02', 30)).toBe('2026-02-28')
    expect(dateForMonth('2026-02', 29)).toBe('2026-02-28')
    expect(dateForMonth('2028-02', 29)).toBe('2028-02-29')
  })

  it('dias normais não mudam e têm dois dígitos', () => {
    expect(dateForMonth('2026-03', 15)).toBe('2026-03-15')
    expect(dateForMonth('2026-03', 5)).toBe('2026-03-05')
  })
})

describe('buildInstallmentPlan (calendário de uma compra parcelada)', () => {
  it('100,00 em 3x a partir de 15/01: valores e datas', () => {
    expect(buildInstallmentPlan(10000, 3, '2026-01-15')).toEqual([
      { number: 1, amountCents: 3333, date: '2026-01-15' },
      { number: 2, amountCents: 3333, date: '2026-02-15' },
      { number: 3, amountCents: 3334, date: '2026-03-15' },
    ])
  })

  it('começando no dia 31: 28 em fevereiro, volta a 31 em março, 30 em abril', () => {
    const dates = buildInstallmentPlan(40000, 4, '2026-01-31').map((p) => p.date)
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('ano bissexto: fevereiro cai no dia 29', () => {
    const dates = buildInstallmentPlan(30000, 3, '2028-01-31').map((p) => p.date)
    expect(dates).toEqual(['2028-01-31', '2028-02-29', '2028-03-31'])
  })

  it('começando no dia 30: fevereiro cai no 28 e depois volta ao 30', () => {
    const dates = buildInstallmentPlan(30000, 3, '2026-01-30').map((p) => p.date)
    expect(dates).toEqual(['2026-01-30', '2026-02-28', '2026-03-30'])
  })

  it('mês de 30 dias como início: dia 30 se mantém nos meses seguintes', () => {
    const dates = buildInstallmentPlan(30000, 3, '2026-04-30').map((p) => p.date)
    expect(dates).toEqual(['2026-04-30', '2026-05-30', '2026-06-30'])
  })

  it('atravessa a virada de ano', () => {
    const dates = buildInstallmentPlan(30000, 3, '2026-11-30').map((p) => p.date)
    expect(dates).toEqual(['2026-11-30', '2026-12-30', '2027-01-30'])
  })

  it('compra em 10x: numeração de 1 a 10 e soma igual ao total', () => {
    const plan = buildInstallmentPlan(99999, 10, '2026-05-10')
    expect(plan.map((p) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(plan.reduce((sum, p) => sum + p.amountCents, 0)).toBe(99999)
    expect(plan[9].date).toBe('2027-02-10')
  })
})

describe('recurrenceDateIn (quando uma recorrência cai em cada mês)', () => {
  const rent = { startDate: '2026-01-31', dayOfMonth: 31 }

  it('não aparece antes do mês de início', () => {
    expect(recurrenceDateIn(rent, '2025-12')).toBeNull()
  })

  it('aparece no mês de início com a data de início', () => {
    expect(recurrenceDateIn(rent, '2026-01')).toBe('2026-01-31')
  })

  it('aparece em todos os meses seguintes, ajustando o dia 31', () => {
    expect(recurrenceDateIn(rent, '2026-02')).toBe('2026-02-28')
    expect(recurrenceDateIn(rent, '2026-03')).toBe('2026-03-31')
    expect(recurrenceDateIn(rent, '2026-04')).toBe('2026-04-30')
    expect(recurrenceDateIn(rent, '2030-07')).toBe('2030-07-31')
  })

  it('sem data final, continua indefinidamente', () => {
    expect(recurrenceDateIn(rent, '2099-12')).toBe('2099-12-31')
  })

  it('a data final é inclusiva e o mês seguinte não aparece', () => {
    const limited = { ...rent, endDate: '2026-06-30' }
    expect(recurrenceDateIn(limited, '2026-06')).toBe('2026-06-30')
    expect(recurrenceDateIn(limited, '2026-07')).toBeNull()
  })

  it('data final antes do dia do mês final exclui aquele mês', () => {
    const limited = { startDate: '2026-01-20', dayOfMonth: 20, endDate: '2026-03-10' }
    expect(recurrenceDateIn(limited, '2026-02')).toBe('2026-02-20')
    expect(recurrenceDateIn(limited, '2026-03')).toBeNull()
  })
})

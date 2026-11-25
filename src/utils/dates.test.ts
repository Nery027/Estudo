import { describe, expect, it } from 'vitest'
import { addDays, todayInSaoPaulo } from './dates'

describe('todayInSaoPaulo (data de hoje no fuso de São Paulo, nunca UTC)', () => {
  it('meio-dia em UTC: mesmo dia em São Paulo', () => {
    expect(todayInSaoPaulo(new Date('2026-11-25T15:00:00Z'))).toBe('2026-11-25')
  })

  it('23h30 em São Paulo ainda é "hoje", mesmo que em UTC já seja amanhã', () => {
    // 02:30 UTC do dia 26 = 23:30 do dia 25 em São Paulo (UTC-3)
    expect(todayInSaoPaulo(new Date('2026-11-26T02:30:00Z'))).toBe('2026-11-25')
  })

  it('a virada acontece à meia-noite de São Paulo (03:00 UTC)', () => {
    expect(todayInSaoPaulo(new Date('2026-11-26T02:59:59Z'))).toBe('2026-11-25')
    expect(todayInSaoPaulo(new Date('2026-11-26T03:00:00Z'))).toBe('2026-11-26')
  })

  it('virada de ano: 01h UTC de 1º de janeiro ainda é 31/12 em São Paulo', () => {
    expect(todayInSaoPaulo(new Date('2027-01-01T01:00:00Z'))).toBe('2026-12-31')
    expect(todayInSaoPaulo(new Date('2027-01-01T03:00:00Z'))).toBe('2027-01-01')
  })

  it('29 de fevereiro de ano bissexto', () => {
    expect(todayInSaoPaulo(new Date('2028-03-01T01:00:00Z'))).toBe('2028-02-29')
  })

  it('o formato é sempre aaaa-mm-dd com zeros', () => {
    expect(todayInSaoPaulo(new Date('2026-03-05T12:00:00Z'))).toBe('2026-03-05')
  })

  it('não depende do fuso do computador que roda o teste', () => {
    const instant = new Date('2026-06-15T02:00:00Z') // 23h do dia 14 em São Paulo
    expect(todayInSaoPaulo(instant)).toBe('2026-06-14')
  })
})

describe('addDays (soma de dias no calendário)', () => {
  it('dentro do mês', () => {
    expect(addDays('2026-11-25', 1)).toBe('2026-11-26')
    expect(addDays('2026-11-25', -5)).toBe('2026-11-20')
  })

  it('passa do fim do mês: dia 30 e dia 31', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-30', 1)).toBe('2026-12-31')
  })

  it('virada de ano, para frente e para trás', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('fevereiro de 28 e de 29 dias', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
  })

  it('zero dias não muda nada e 60 dias para trás cruza meses', () => {
    expect(addDays('2026-11-25', 0)).toBe('2026-11-25')
    expect(addDays('2026-11-25', -60)).toBe('2026-09-26')
  })
})

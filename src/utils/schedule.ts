// Cálculo de parcelas, datas e recorrências. Só funções "puras" (sem tela,
// sem localStorage), para poderem ser testadas com facilidade.
import { addMonths, monthKey } from './format'

// Quantos dias tem o mês "aaaa-mm" (já considera ano bissexto).
export function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number)
  // Dia 0 do mês seguinte = último dia deste mês
  return new Date(year, monthNumber, 0).getDate()
}

// Data do dia `day` no mês "aaaa-mm". Se o mês for mais curto (ex.: dia 31 em
// fevereiro), usa o último dia do mês.
export function dateForMonth(month: string, day: number): string {
  const realDay = Math.min(day, daysInMonth(month))
  return `${month}-${String(realDay).padStart(2, '0')}`
}

// "2026-01-31" -> 31
export function dayOf(isoDate: string): number {
  return Number(isoDate.slice(8, 10))
}

// Divide o total (em centavos) em `count` parcelas. Todas recebem o valor
// arredondado para baixo e a ÚLTIMA absorve a diferença.
// Ex.: 10000 em 3x -> [3333, 3333, 3334]
export function splitAmount(totalCents: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError('O número de parcelas deve ser um inteiro maior que zero.')
  }
  if (!Number.isInteger(totalCents) || totalCents < count) {
    throw new RangeError('O valor total precisa ser de pelo menos 1 centavo por parcela.')
  }
  const base = Math.floor(totalCents / count)
  const amounts = Array<number>(count).fill(base)
  amounts[count - 1] = totalCents - base * (count - 1)
  return amounts
}

export interface InstallmentPlan {
  number: number // 1, 2, 3...
  amountCents: number
  date: string // aaaa-mm-dd
}

// Gera o calendário de uma compra parcelada: uma parcela por mês, a partir da
// data da primeira. O dia da primeira parcela é sempre o "dia de referência":
// 31/01 -> 28/02 -> 31/03 -> 30/04 (não "gruda" no 28).
export function buildInstallmentPlan(
  totalCents: number,
  count: number,
  firstDate: string,
): InstallmentPlan[] {
  const amounts = splitAmount(totalCents, count)
  const firstMonth = monthKey(firstDate)
  const day = dayOf(firstDate)
  return amounts.map((amountCents, index) => ({
    number: index + 1,
    amountCents,
    date: dateForMonth(addMonths(firstMonth, index), day),
  }))
}

// Data em que uma recorrência cai no mês "aaaa-mm", ou null se não cai
// (antes do início ou depois da data final).
export function recurrenceDateIn(
  recurrence: { startDate: string; dayOfMonth: number; endDate?: string },
  month: string,
): string | null {
  // Chaves "aaaa-mm" podem ser comparadas como texto
  if (month < monthKey(recurrence.startDate)) return null
  const date = dateForMonth(month, recurrence.dayOfMonth)
  if (recurrence.endDate && date > recurrence.endDate) return null
  return date
}

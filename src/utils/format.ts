// Funções de formatação (moeda, datas, meses) em português do Brasil.
import { todayInSaoPaulo } from './dates'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// 123456 (centavos) -> "R$ 1.234,56"
export function formatCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

// "2026-11-16" -> "16/11/2026"
// Feito na mão (sem new Date) para não sofrer com fuso horário.
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

// Data de hoje no formato aaaa-mm-dd, no fuso de São Paulo (nunca UTC)
export function todayISO(): string {
  return todayInSaoPaulo()
}

// "2026-11-16" -> "2026-11"
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

// "2026-11" -> "novembro de 2026"
export function formatMonth(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} de ${year}`
}

// "2026-11" -> "nov/26" (para o eixo do gráfico)
export function formatMonthShort(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTH_NAMES[Number(month) - 1].slice(0, 3)}/${year.slice(2)}`
}

// Soma (ou subtrai) meses de uma chave "aaaa-mm"
export function addMonths(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number)
  const index = year * 12 + (month - 1) + delta
  const newYear = Math.floor(index / 12)
  const newMonth = (index % 12) + 1
  return `${newYear}-${String(newMonth).padStart(2, '0')}`
}

// Converte o que o usuário digitou ("1.234,56", "12,5", "12") em centavos.
// Retorna null se o texto for inválido ou o valor não for maior que zero.
export function parseAmountToCents(input: string): number | null {
  const text = input.replace(/R\$|\s/g, '')
  let normalized: string
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text) || /^\d+,\d{1,2}$/.test(text)) {
    // Formato brasileiro: pontos de milhar e vírgula decimal
    normalized = text.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+(\.\d{1,2})?$/.test(text)) {
    normalized = text
  } else {
    return null
  }
  const cents = Math.round(Number(normalized) * 100)
  return cents > 0 ? cents : null
}

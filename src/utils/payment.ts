// Status de pagamento e alertas de vencimento. Só funções puras: recebem
// "hoje" como parâmetro, então os testes controlam a data.
import { addDays } from './dates'
import { addMonths, monthKey } from './format'
import type { LedgerItem } from './ledger'

export type PaymentStatus = 'paid' | 'pending' | 'overdue'

// Receita não tem status (null). Despesa:
//  - com data de pagamento -> paga
//  - sem pagamento e a data JÁ passou -> vencida
//  - sem pagamento e vence hoje ou depois -> pendente (vencer hoje ainda não é atraso)
export function paymentStatus(
  item: Pick<LedgerItem, 'type' | 'date' | 'paidAt'>,
  today: string,
): PaymentStatus | null {
  if (item.type !== 'despesa') return null
  if (item.paidAt) return 'paid'
  return item.date < today ? 'overdue' : 'pending'
}

// O aviso do topo só olha as vencidas dos últimos dias. Sem esse limite, todas as
// despesas antigas (de antes do controle de pagamento existir) apareceriam como
// vencidas. Na lista do mês elas continuam marcadas como "Vencida".
export const ALERT_LOOKBACK_DAYS = 60

export interface DueAlerts {
  overdue: LedgerItem[] // vencidas (mais antigas primeiro)
  today: LedgerItem[] // vencem hoje
  tomorrow: LedgerItem[] // vencem amanhã
}

// Meses que precisam ser consultados para montar o aviso (do início da janela
// de vencidas até o mês de amanhã, que pode ser o mês seguinte ou o ano seguinte).
export function alertMonths(today: string): string[] {
  const first = monthKey(addDays(today, -ALERT_LOOKBACK_DAYS))
  const last = monthKey(addDays(today, 1))
  const months: string[] = []
  for (let month = first; month <= last; month = addMonths(month, 1)) months.push(month)
  return months
}

function byDate(a: LedgerItem, b: LedgerItem): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : a.description.localeCompare(b.description, 'pt-BR')
}

// Despesas PENDENTES que vencem amanhã, que vencem hoje ou que já venceram.
export function collectDueAlerts(
  getItems: (month: string) => LedgerItem[],
  today: string,
): DueAlerts {
  const tomorrow = addDays(today, 1)
  const oldest = addDays(today, -ALERT_LOOKBACK_DAYS)
  const alerts: DueAlerts = { overdue: [], today: [], tomorrow: [] }

  for (const month of alertMonths(today)) {
    for (const item of getItems(month)) {
      if (paymentStatus(item, today) === null || item.paidAt) continue
      if (item.date === today) alerts.today.push(item)
      else if (item.date === tomorrow) alerts.tomorrow.push(item)
      else if (item.date < today && item.date >= oldest) alerts.overdue.push(item)
    }
  }

  alerts.overdue.sort(byDate)
  alerts.today.sort(byDate)
  alerts.tomorrow.sort(byDate)
  return alerts
}

export function countAlerts(alerts: DueAlerts): number {
  return alerts.overdue.length + alerts.today.length + alerts.tomorrow.length
}

export interface PaymentTotals {
  paidCents: number // despesas já pagas
  pendingCents: number // "A pagar": pendentes + vencidas
  overdueCents: number // parte do "A pagar" que já venceu
}

// Totais de despesas do mês (receitas ficam de fora).
export function monthPaymentTotals(items: LedgerItem[], today: string): PaymentTotals {
  const totals: PaymentTotals = { paidCents: 0, pendingCents: 0, overdueCents: 0 }
  for (const item of items) {
    const status = paymentStatus(item, today)
    if (status === 'paid') totals.paidCents += item.amountCents
    else if (status === 'pending') totals.pendingCents += item.amountCents
    else if (status === 'overdue') {
      totals.pendingCents += item.amountCents
      totals.overdueCents += item.amountCents
    }
  }
  return totals
}

// Texto da notificação do navegador (null quando não há nada a avisar).
export function buildNotificationText(alerts: DueAlerts): { title: string; body: string } | null {
  const parts: string[] = []
  const { overdue, today, tomorrow } = alerts
  if (overdue.length > 0) {
    parts.push(`${overdue.length} ${overdue.length === 1 ? 'vencida' : 'vencidas'}`)
  }
  if (today.length > 0) {
    parts.push(`${today.length} ${today.length === 1 ? 'vence' : 'vencem'} hoje`)
  }
  if (tomorrow.length > 0) {
    parts.push(`${tomorrow.length} ${tomorrow.length === 1 ? 'vence' : 'vencem'} amanhã`)
  }
  if (parts.length === 0) return null
  return { title: 'Contas a pagar', body: parts.join(', ') }
}

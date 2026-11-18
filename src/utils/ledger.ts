// O "livro-caixa" do usuário: transações simples, parcelas e recorrências.
// Tudo aqui é função pura (recebe os dados, devolve dados novos), sem tela
// e sem localStorage, para ser fácil de testar.
import type {
  NewEntry,
  Recurrence,
  RecurrenceException,
  Transaction,
  TransactionType,
} from '../types'
import { addMonths, monthKey } from './format'
import { buildInstallmentPlan, dateForMonth, dayOf, recurrenceDateIn } from './schedule'

export interface Ledger {
  transactions: Transaction[]
  recurrences: Recurrence[]
}

// "Esta parcela só", "esta e as próximas" ou "o grupo inteiro"
export type Scope = 'one' | 'following' | 'all'

// Uma linha da lista de um mês, já pronta para exibir.
// Pode vir de uma transação simples, de uma parcela ou de uma recorrência.
export interface LedgerItem {
  key: string
  kind: 'single' | 'installment' | 'recurring'
  description: string // sem o sufixo "(3/10)"
  amountCents: number
  type: TransactionType
  category: string
  date: string
  month: string
  transactionId?: string // single e installment
  installment?: { groupId: string; number: number; total: number }
  recurrenceId?: string // recurring
}

// O que pode ser alterado numa edição. Só as chaves presentes são aplicadas.
export interface ItemPatch {
  description?: string
  amountCents?: number
  category?: string
  date?: string
}

type RecurrenceFields = Pick<ItemPatch, 'description' | 'amountCents' | 'category'>

// "Compra X" + parcela 3 de 10 -> "Compra X (3/10)"
export function itemTitle(item: Pick<LedgerItem, 'description' | 'installment'>): string {
  if (!item.installment) return item.description
  return `${item.description} (${item.installment.number}/${item.installment.total})`
}

// Tudo que acontece no mês "aaaa-mm": transações, parcelas e recorrências.
export function getMonthItems(ledger: Ledger, month: string): LedgerItem[] {
  const items: LedgerItem[] = []

  for (const t of ledger.transactions) {
    if (monthKey(t.date) !== month) continue
    items.push({
      key: t.id,
      kind: t.installment ? 'installment' : 'single',
      description: t.description,
      amountCents: t.amountCents,
      type: t.type,
      category: t.category,
      date: t.date,
      month,
      transactionId: t.id,
      installment: t.installment,
    })
  }

  for (const r of ledger.recurrences) {
    const date = recurrenceDateIn(r, month)
    if (date === null) continue
    const exception = r.exceptions[month]
    if (exception?.deleted) continue
    items.push({
      key: `${r.id}:${month}`,
      kind: 'recurring',
      description: exception?.description ?? r.description,
      amountCents: exception?.amountCents ?? r.amountCents,
      type: r.type,
      category: exception?.category ?? r.category,
      date,
      month,
      recurrenceId: r.id,
    })
  }

  return items
}

// ---------- Criar ----------

export function createEntry(ledger: Ledger, entry: NewEntry): Ledger {
  if (entry.mode === 'single') {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      description: entry.description,
      amountCents: entry.amountCents,
      type: entry.type,
      category: entry.category,
      date: entry.date,
    }
    return { ...ledger, transactions: [...ledger.transactions, transaction] }
  }

  if (entry.mode === 'installments') {
    const groupId = crypto.randomUUID()
    const created: Transaction[] = buildInstallmentPlan(
      entry.totalCents,
      entry.count,
      entry.date,
    ).map((part) => ({
      id: crypto.randomUUID(),
      description: entry.description,
      amountCents: part.amountCents,
      type: entry.type,
      category: entry.category,
      date: part.date,
      installment: { groupId, number: part.number, total: entry.count },
    }))
    return { ...ledger, transactions: [...ledger.transactions, ...created] }
  }

  const recurrence: Recurrence = {
    id: crypto.randomUUID(),
    description: entry.description,
    amountCents: entry.amountCents,
    type: entry.type,
    category: entry.category,
    startDate: entry.date,
    dayOfMonth: dayOf(entry.date),
    ...(entry.endDate ? { endDate: entry.endDate } : {}),
    exceptions: {},
  }
  return { ...ledger, recurrences: [...ledger.recurrences, recurrence] }
}

// ---------- Ajudantes internos ----------

// A transação `t` é afetada por uma ação sobre `item` com este alcance?
function isAffected(t: Transaction, item: LedgerItem, scope: Scope): boolean {
  if (!item.installment || !t.installment) return t.id === item.transactionId
  if (t.installment.groupId !== item.installment.groupId) return false
  if (scope === 'all') return true
  if (scope === 'following') return t.installment.number >= item.installment.number
  return t.id === item.transactionId
}

function definedOnly(patch: ItemPatch): ItemPatch {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
}

// Parcelas e recorrências mantêm o calendário: a data não muda.
function withoutDate(patch: ItemPatch): RecurrenceFields {
  const fields: ItemPatch = { ...patch }
  delete fields.date
  return fields
}

// Tira das exceções os campos que acabaram de ser alterados para todos
function clearFields(
  exceptions: Record<string, RecurrenceException>,
  fields: RecurrenceFields,
): Record<string, RecurrenceException> {
  const result: Record<string, RecurrenceException> = {}
  for (const [month, exception] of Object.entries(exceptions)) {
    const copy: RecurrenceException = { ...exception }
    for (const key of Object.keys(fields) as (keyof RecurrenceFields)[]) delete copy[key]
    if (copy.deleted || Object.keys(copy).length > 0) result[month] = copy
  }
  return result
}

// Encerra a recorrência no mês anterior a `month` (a partir de `month` não existe mais)
function endBefore(recurrence: Recurrence, month: string): Recurrence {
  const exceptions = Object.fromEntries(
    Object.entries(recurrence.exceptions).filter(([key]) => key < month),
  )
  return {
    ...recurrence,
    endDate: dateForMonth(addMonths(month, -1), recurrence.dayOfMonth),
    exceptions,
  }
}

function replaceRecurrence(list: Recurrence[], id: string, replacement: Recurrence | null) {
  return list.flatMap((r) => (r.id !== id ? [r] : replacement ? [replacement] : []))
}

// ---------- Excluir ----------

export function deleteItem(ledger: Ledger, item: LedgerItem, scope: Scope): Ledger {
  if (item.kind !== 'recurring') {
    return {
      ...ledger,
      transactions: ledger.transactions.filter((t) => !isAffected(t, item, scope)),
    }
  }

  const recurrence = ledger.recurrences.find((r) => r.id === item.recurrenceId)
  if (!recurrence) return ledger
  const startsHere = item.month <= monthKey(recurrence.startDate)

  if (scope === 'all' || (scope === 'following' && startsHere)) {
    return { ...ledger, recurrences: replaceRecurrence(ledger.recurrences, recurrence.id, null) }
  }

  const updated: Recurrence =
    scope === 'one'
      ? { ...recurrence, exceptions: { ...recurrence.exceptions, [item.month]: { deleted: true } } }
      : endBefore(recurrence, item.month)
  return {
    ...ledger,
    recurrences: replaceRecurrence(ledger.recurrences, recurrence.id, updated),
  }
}

// ---------- Editar ----------

export function editItem(ledger: Ledger, item: LedgerItem, scope: Scope, rawPatch: ItemPatch): Ledger {
  const patch = definedOnly(rawPatch)

  if (item.kind !== 'recurring') {
    // Só a transação simples pode mudar de data
    const applied = item.kind === 'single' ? patch : withoutDate(patch)
    return {
      ...ledger,
      transactions: ledger.transactions.map((t) =>
        isAffected(t, item, scope) ? { ...t, ...applied } : t,
      ),
    }
  }

  const recurrence = ledger.recurrences.find((r) => r.id === item.recurrenceId)
  if (!recurrence) return ledger
  const fields = withoutDate(patch)
  const startsHere = item.month <= monthKey(recurrence.startDate)

  if (scope === 'one') {
    const updated: Recurrence = {
      ...recurrence,
      exceptions: {
        ...recurrence.exceptions,
        [item.month]: { ...recurrence.exceptions[item.month], ...fields },
      },
    }
    return {
      ...ledger,
      recurrences: replaceRecurrence(ledger.recurrences, recurrence.id, updated),
    }
  }

  if (scope === 'all' || startsHere) {
    const updated: Recurrence = {
      ...recurrence,
      ...fields,
      exceptions: clearFields(recurrence.exceptions, fields),
    }
    return {
      ...ledger,
      recurrences: replaceRecurrence(ledger.recurrences, recurrence.id, updated),
    }
  }

  // "Esta e as próximas": a recorrência antiga termina no mês anterior e uma
  // nova (com os valores editados) começa neste mês.
  const head = endBefore(recurrence, item.month)
  const tailExceptions = Object.fromEntries(
    Object.entries(recurrence.exceptions).filter(([key]) => key >= item.month),
  )
  const tail: Recurrence = {
    ...recurrence,
    ...fields,
    id: crypto.randomUUID(),
    startDate: dateForMonth(item.month, recurrence.dayOfMonth),
    exceptions: clearFields(tailExceptions, fields),
  }
  return {
    ...ledger,
    recurrences: [...replaceRecurrence(ledger.recurrences, recurrence.id, head), tail],
  }
}

import { formatCurrency, formatDate } from '../utils/format'
import { itemTitle } from '../utils/ledger'
import type { LedgerItem } from '../utils/ledger'
import { paymentStatus } from '../utils/payment'
import type { PaymentStatus } from '../utils/payment'

interface Props {
  items: LedgerItem[]
  // "Hoje" em São Paulo (aaaa-mm-dd), para calcular Pendente/Vencida
  today: string
  onEdit: (item: LedgerItem) => void
  onDelete: (item: LedgerItem) => void
  // Marca como paga (paid = true) ou volta para pendente (paid = false)
  onTogglePaid: (item: LedgerItem, paid: boolean) => void
}

// Etiqueta que diferencia parcelas e recorrências das transações simples
function KindBadge({ item }: { item: LedgerItem }) {
  if (item.kind === 'installment') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
        <span aria-hidden="true">💳</span>
        Parcelada
      </span>
    )
  }
  if (item.kind === 'recurring') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
        <span aria-hidden="true">🔁</span>
        Recorrente
      </span>
    )
  }
  return null
}

const STATUS_STYLE: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: 'Paga', className: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-900' },
  overdue: { label: 'Vencida', className: 'bg-red-100 text-red-800' },
}

// Etiqueta de pagamento (só despesas têm)
function StatusBadge({ status }: { status: PaymentStatus }) {
  const { label, className } = STATUS_STYLE[status]
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

const actionClass = 'rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100'

export function TransactionList({ items, today, onEdit, onDelete, onTogglePaid }: Props) {
  // Mais recentes primeiro
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Transações do mês</h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma transação neste mês ainda.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sorted.map((item) => {
            const status = paymentStatus(item, today)
            return (
              <li
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-900">{itemTitle(item)}</p>
                    <KindBadge item={item} />
                    {status && <StatusBadge status={status} />}
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatDate(item.date)} · {item.category}
                    {item.paidAt && ` · paga em ${formatDate(item.paidAt)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <span
                    className={`mr-2 font-semibold ${item.type === 'receita' ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {item.type === 'receita' ? '+' : '−'} {formatCurrency(item.amountCents)}
                  </span>
                  {status && (
                    <button
                      type="button"
                      onClick={() => onTogglePaid(item, status !== 'paid')}
                      aria-label={
                        status === 'paid'
                          ? `Marcar ${itemTitle(item)} como pendente`
                          : `Marcar ${itemTitle(item)} como paga`
                      }
                      className={`rounded-lg border px-2 py-1 text-sm font-medium ${
                        status === 'paid'
                          ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                          : 'border-green-700 text-green-800 hover:bg-green-50'
                      }`}
                    >
                      {status === 'paid' ? 'Desfazer' : 'Marcar paga'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label={`Editar ${itemTitle(item)}`}
                    className={`${actionClass} hover:text-blue-700`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    aria-label={`Excluir ${itemTitle(item)}`}
                    className={`${actionClass} hover:text-red-700`}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

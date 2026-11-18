import { formatCurrency, formatDate } from '../utils/format'
import { itemTitle } from '../utils/ledger'
import type { LedgerItem } from '../utils/ledger'

interface Props {
  items: LedgerItem[]
  onEdit: (item: LedgerItem) => void
  onDelete: (item: LedgerItem) => void
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

const actionClass = 'rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100'

export function TransactionList({ items, onEdit, onDelete }: Props) {
  // Mais recentes primeiro
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Transações do mês</h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma transação neste mês ainda.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sorted.map((item) => (
            <li key={item.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-slate-900">{itemTitle(item)}</p>
                  <KindBadge item={item} />
                </div>
                <p className="text-sm text-slate-500">
                  {formatDate(item.date)} · {item.category}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span
                  className={`mr-2 font-semibold ${item.type === 'receita' ? 'text-green-700' : 'text-red-700'}`}
                >
                  {item.type === 'receita' ? '+' : '−'} {formatCurrency(item.amountCents)}
                </span>
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
          ))}
        </ul>
      )}
    </section>
  )
}

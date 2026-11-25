import { formatCurrency, formatDate } from '../utils/format'
import { itemTitle } from '../utils/ledger'
import type { LedgerItem } from '../utils/ledger'
import { countAlerts } from '../utils/payment'
import type { DueAlerts } from '../utils/payment'

interface Props {
  alerts: DueAlerts
  onMarkPaid: (item: LedgerItem) => void
  // Esconde o aviso até o dia mudar
  onDismiss: () => void
}

interface Group {
  key: keyof DueAlerts
  title: string
  titleClass: string
}

const GROUPS: Group[] = [
  { key: 'overdue', title: 'Vencidas', titleClass: 'text-red-800' },
  { key: 'today', title: 'Vencem hoje', titleClass: 'text-amber-900' },
  { key: 'tomorrow', title: 'Vencem amanhã', titleClass: 'text-slate-800' },
]

// Aviso no topo: despesas pendentes que vencem amanhã, hoje ou que já venceram.
export function DueAlertBanner({ alerts, onMarkPaid, onDismiss }: Props) {
  const total = countAlerts(alerts)
  if (total === 0) return null

  return (
    <section
      aria-label="Contas a vencer"
      className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-slate-800"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">
          <span aria-hidden="true">🔔 </span>
          {total === 1 ? '1 conta precisa de atenção' : `${total} contas precisam de atenção`}
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1 font-medium text-amber-900 hover:bg-amber-100"
        >
          Dispensar por hoje
        </button>
      </div>

      <div className="mt-3 space-y-4">
        {GROUPS.map(({ key, title, titleClass }) => {
          const items = alerts[key]
          if (items.length === 0) return null
          return (
            <div key={key}>
              <h3 className={`mb-1 font-semibold ${titleClass}`}>
                {title} ({items.length})
              </h3>
              <ul className="divide-y divide-amber-200 rounded-lg bg-white">
                {items.map((item) => (
                  <li
                    key={item.key}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{itemTitle(item)}</p>
                      <p className="text-slate-500">
                        {formatDate(item.date)} · {formatCurrency(item.amountCents)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onMarkPaid(item)}
                      aria-label={`Marcar ${itemTitle(item)} como paga`}
                      className="shrink-0 rounded-lg border border-green-700 px-3 py-1 font-medium text-green-800 hover:bg-green-50"
                    >
                      Marcar como paga
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

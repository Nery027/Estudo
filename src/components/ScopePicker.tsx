import type { LedgerItem, Scope } from '../utils/ledger'
import { formatMonth } from '../utils/format'

interface Props {
  item: LedgerItem
  legend: string
  value: Scope
  onChange: (scope: Scope) => void
}

// Pergunta o alcance da ação: só este item, este e os próximos, ou o grupo todo.
export function ScopePicker({ item, legend, value, onChange }: Props) {
  const options: { scope: Scope; label: string }[] =
    item.kind === 'installment' && item.installment
      ? [
          { scope: 'one', label: `Somente esta parcela (${item.installment.number}/${item.installment.total})` },
          { scope: 'following', label: 'Esta e as próximas parcelas' },
          { scope: 'all', label: 'Todas as parcelas da compra' },
        ]
      : [
          { scope: 'one', label: `Somente este mês (${formatMonth(item.month)})` },
          { scope: 'following', label: 'Este mês e os próximos' },
          { scope: 'all', label: 'A recorrência inteira' },
        ]

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium text-slate-700">{legend}</legend>
      {options.map((option) => (
        <label key={option.scope} className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="scope"
            value={option.scope}
            checked={value === option.scope}
            onChange={() => onChange(option.scope)}
            className="mt-0.5"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

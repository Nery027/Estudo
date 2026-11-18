import { formatCurrency } from '../utils/format'

interface Props {
  incomeCents: number
  expenseCents: number
}

// Três cartões: receitas, despesas e saldo do mês.
export function Summary({ incomeCents, expenseCents }: Props) {
  const balance = incomeCents - expenseCents

  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumo do mês">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Receitas</p>
        <p className="mt-1 text-2xl font-semibold text-green-700">{formatCurrency(incomeCents)}</p>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Despesas</p>
        <p className="mt-1 text-2xl font-semibold text-red-700">{formatCurrency(expenseCents)}</p>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Saldo</p>
        <p
          className={`mt-1 text-2xl font-semibold ${balance < 0 ? 'text-red-700' : 'text-slate-900'}`}
        >
          {formatCurrency(balance)}
        </p>
      </div>
    </section>
  )
}

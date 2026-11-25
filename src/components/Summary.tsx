import { formatCurrency } from '../utils/format'

interface Props {
  incomeCents: number
  expenseCents: number
  // Despesas do mês já pagas
  paidCents: number
  // "A pagar": despesas pendentes + vencidas
  pendingCents: number
  // Parte do "A pagar" que já venceu
  overdueCents: number
}

// Cartões do mês: receitas, despesas e saldo; e, abaixo, o que já foi pago e o que falta pagar.
export function Summary({ incomeCents, expenseCents, paidCents, pendingCents, overdueCents }: Props) {
  const balance = incomeCents - expenseCents

  return (
    <div className="space-y-4">
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

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Pagamento das despesas do mês">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pago</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{formatCurrency(paidCents)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">A pagar</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{formatCurrency(pendingCents)}</p>
          {overdueCents > 0 && (
            <p className="mt-1 text-sm text-red-700">
              Inclui {formatCurrency(overdueCents)} vencidos
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

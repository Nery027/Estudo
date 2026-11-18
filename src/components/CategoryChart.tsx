import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '../utils/format'
import type { LedgerItem } from '../utils/ledger'

interface Props {
  // Itens do mês (transações, parcelas e recorrências)
  items: LedgerItem[]
}

const COLORS = [
  '#2563eb',
  '#dc2626',
  '#d97706',
  '#059669',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#64748b',
]

// Gráfico de pizza: quanto foi gasto em cada categoria no mês.
export function CategoryChart({ items }: Props) {
  const totals = new Map<string, number>()
  for (const t of items) {
    if (t.type === 'despesa') {
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amountCents)
    }
  }
  const data = [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Despesas por categoria</h2>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">Sem despesas neste mês.</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius="75%" innerRadius="45%">
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

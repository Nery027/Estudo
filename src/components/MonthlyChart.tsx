import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addMonths, formatCurrency, formatMonthShort } from '../utils/format'
import type { LedgerItem } from '../utils/ledger'

interface Props {
  // Devolve os itens de um mês "aaaa-mm" (já com parcelas e recorrências)
  getItems: (month: string) => LedgerItem[]
  // Último mês mostrado no gráfico (formato "aaaa-mm")
  endMonth: string
}

// Gráfico de barras: receitas x despesas nos últimos 6 meses.
export function MonthlyChart({ getItems, endMonth }: Props) {
  const data = Array.from({ length: 6 }, (_, i) => {
    const key = addMonths(endMonth, i - 5)
    let receitas = 0
    let despesas = 0
    for (const t of getItems(key)) {
      if (t.type === 'receita') receitas += t.amountCents
      else despesas += t.amountCents
    }
    return { mes: formatMonthShort(key), receitas, despesas }
  })

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Receitas x despesas (6 meses)</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" />
            <YAxis
              width={80}
              // Eixo vai pelo menos até R$ 100, para não mostrar centavos quando não há dados
              domain={[0, (max: number) => Math.max(max, 10000)]}
              tickFormatter={(value) => formatCurrency(Number(value)).replace(',00', '')}
            />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="receitas" name="Receitas" fill="#15803d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" name="Despesas" fill="#b91c1c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

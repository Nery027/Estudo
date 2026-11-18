import { useState } from 'react'
import type { FormEvent } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types'
import type { NewEntry, TransactionType } from '../types'
import { formatCurrency, formatDate, parseAmountToCents, todayISO } from '../utils/format'
import { buildInstallmentPlan } from '../utils/schedule'

interface Props {
  onAdd: (entry: NewEntry) => void
}

type RepeatMode = 'none' | 'installments' | 'recurring'

const MIN_INSTALLMENTS = 2
const MAX_INSTALLMENTS = 60

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'

export function TransactionForm({ onAdd }: Props) {
  const [type, setType] = useState<TransactionType>('despesa')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [date, setDate] = useState(todayISO())
  const [repeat, setRepeat] = useState<RepeatMode>('none')
  const [count, setCount] = useState('10')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const categories = type === 'despesa' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const amountLabel =
    repeat === 'installments' ? 'Valor total (R$)' : repeat === 'recurring' ? 'Valor mensal (R$)' : 'Valor (R$)'
  const dateLabel =
    repeat === 'installments' ? 'Data da 1ª parcela' : repeat === 'recurring' ? 'Data de início' : 'Data'

  function changeType(newType: TransactionType) {
    setType(newType)
    // Cada tipo tem sua lista de categorias; volta para a primeira
    setCategory(newType === 'despesa' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0])
  }

  // Prévia das parcelas ("10x de R$ 100,00"), enquanto o usuário digita
  function installmentPreview(): string | null {
    const totalCents = parseAmountToCents(amount)
    const parts = Number(count)
    if (repeat !== 'installments' || totalCents === null || date === '') return null
    if (!Number.isInteger(parts) || parts < MIN_INSTALLMENTS || parts > MAX_INSTALLMENTS) return null
    if (totalCents < parts) return null
    const plan = buildInstallmentPlan(totalCents, parts, date)
    const first = plan[0].amountCents
    const last = plan[parts - 1].amountCents
    const amounts =
      first === last
        ? `${parts}x de ${formatCurrency(first)}`
        : `${parts - 1}x de ${formatCurrency(first)} + 1x de ${formatCurrency(last)}`
    return `${amounts} · de ${formatDate(plan[0].date)} a ${formatDate(plan[parts - 1].date)}`
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    const cents = parseAmountToCents(amount)
    const base = { description: description.trim(), type, category, date }

    if (base.description === '') return setError('Digite uma descrição.')
    if (cents === null) {
      return setError('Digite um valor válido maior que zero, por exemplo: 25,90')
    }
    if (date === '') return setError('Escolha uma data.')

    if (repeat === 'installments') {
      const parts = Number(count)
      if (!Number.isInteger(parts) || parts < MIN_INSTALLMENTS || parts > MAX_INSTALLMENTS) {
        return setError(
          `Digite o número de parcelas, de ${MIN_INSTALLMENTS} a ${MAX_INSTALLMENTS}.`,
        )
      }
      if (cents < parts) {
        return setError('O valor total é pequeno demais para esse número de parcelas.')
      }
      const plan = buildInstallmentPlan(cents, parts, date)
      onAdd({ ...base, mode: 'installments', totalCents: cents, count: parts })
      setSuccess(
        `Compra parcelada criada: ${parts} parcelas, de ${formatDate(plan[0].date)} a ${formatDate(plan[parts - 1].date)}. Use as setas do mês para ver cada parcela.`,
      )
    } else if (repeat === 'recurring') {
      if (endDate !== '' && endDate < date) {
        return setError('A data final não pode ser anterior à data de início.')
      }
      onAdd({ ...base, mode: 'recurring', amountCents: cents, ...(endDate ? { endDate } : {}) })
      setSuccess(
        `Transação fixa criada: aparece todo mês a partir de ${formatDate(date)}${endDate ? `, até ${formatDate(endDate)}` : ', sem data final'}.`,
      )
    } else {
      onAdd({ ...base, mode: 'single', amountCents: cents })
    }

    setDescription('')
    setAmount('')
    setError('')
  }

  const preview = installmentPreview()

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Nova transação</h2>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
        {(['despesa', 'receita'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => changeType(option)}
            aria-pressed={type === option}
            className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize ${
              type === option
                ? option === 'despesa'
                  ? 'border-red-700 bg-red-700 text-white'
                  : 'border-green-700 bg-green-700 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm text-slate-700">
          Descrição
        </label>
        <input
          id="description"
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex.: Mercado"
        />
      </div>

      <div>
        <label htmlFor="repeat" className="mb-1 block text-sm text-slate-700">
          Repetir/Parcelar
        </label>
        <select
          id="repeat"
          className={inputClass}
          value={repeat}
          onChange={(e) => {
            setRepeat(e.target.value as RepeatMode)
            setError('')
            setSuccess('')
          }}
        >
          <option value="none">Não repetir (transação única)</option>
          <option value="installments">Parcelada (ex.: compra em 10x)</option>
          <option value="recurring">Recorrente fixa (todo mês)</option>
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="mb-1 block text-sm text-slate-700">
          {amountLabel}
        </label>
        <input
          id="amount"
          className={inputClass}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Ex.: 25,90"
        />
      </div>

      {repeat === 'installments' && (
        <div>
          <label htmlFor="count" className="mb-1 block text-sm text-slate-700">
            Número de parcelas
          </label>
          <input
            id="count"
            type="number"
            min={MIN_INSTALLMENTS}
            max={MAX_INSTALLMENTS}
            step={1}
            className={inputClass}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            inputMode="numeric"
          />
          {preview && (
            <p className="mt-1 text-sm text-slate-600" aria-live="polite">
              {preview}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-1 block text-sm text-slate-700">
            Categoria
          </label>
          <select
            id="category"
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date" className="mb-1 block text-sm text-slate-700">
            {dateLabel}
          </label>
          <input
            id="date"
            type="date"
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {repeat === 'recurring' && (
        <div>
          <label htmlFor="end-date" className="mb-1 block text-sm text-slate-700">
            Data final (opcional)
          </label>
          <input
            id="end-date"
            type="date"
            className={inputClass}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Deixe em branco para repetir sem data final.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
      >
        Adicionar
      </button>
    </form>
  )
}

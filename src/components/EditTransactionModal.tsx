import { useState } from 'react'
import type { FormEvent } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types'
import { parseAmountToCents } from '../utils/format'
import { itemTitle } from '../utils/ledger'
import type { ItemPatch, LedgerItem, Scope } from '../utils/ledger'
import { Modal } from './Modal'
import { ScopePicker } from './ScopePicker'

interface Props {
  item: LedgerItem
  onSave: (scope: Scope, patch: ItemPatch) => void
  onClose: () => void
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'

// 123456 -> "1234,56" (formato que o campo de valor aceita)
function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function EditTransactionModal({ item, onSave, onClose }: Props) {
  const [description, setDescription] = useState(item.description)
  const [amount, setAmount] = useState(centsToInput(item.amountCents))
  const [category, setCategory] = useState(item.category)
  const [date, setDate] = useState(item.date)
  const [scope, setScope] = useState<Scope>('one')
  const [error, setError] = useState('')

  const isGrouped = item.kind !== 'single'
  const categories = item.type === 'despesa' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const amountLabel =
    item.kind === 'installment'
      ? 'Valor da parcela (R$)'
      : item.kind === 'recurring'
        ? 'Valor mensal (R$)'
        : 'Valor (R$)'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const amountCents = parseAmountToCents(amount)
    if (description.trim() === '') return setError('Digite uma descrição.')
    if (amountCents === null) {
      return setError('Digite um valor válido maior que zero, por exemplo: 25,90')
    }
    if (date === '') return setError('Escolha uma data.')

    // Só envia o que realmente mudou: assim, editar a descrição de "todas as
    // parcelas" não sobrescreve o valor das outras parcelas.
    const patch: ItemPatch = {}
    if (description.trim() !== item.description) patch.description = description.trim()
    if (amountCents !== item.amountCents) patch.amountCents = amountCents
    if (category !== item.category) patch.category = category
    if (!isGrouped && date !== item.date) patch.date = date

    if (Object.keys(patch).length === 0) return onClose()
    onSave(scope, patch)
  }

  return (
    <Modal title="Editar transação" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {isGrouped && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {item.kind === 'installment'
              ? `Compra parcelada: ${itemTitle(item)}`
              : 'Recorrência fixa (todo mês)'}
          </p>
        )}

        <div>
          <label htmlFor="edit-description" className="mb-1 block text-sm text-slate-700">
            Descrição
          </label>
          <input
            id="edit-description"
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="edit-amount" className="mb-1 block text-sm text-slate-700">
            {amountLabel}
          </label>
          <input
            id="edit-amount"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-category" className="mb-1 block text-sm text-slate-700">
              Categoria
            </label>
            <select
              id="edit-category"
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
            <label htmlFor="edit-date" className="mb-1 block text-sm text-slate-700">
              Data
            </label>
            <input
              id="edit-date"
              type="date"
              className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
              value={date}
              disabled={isGrouped}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {isGrouped && (
          <>
            <p className="text-xs text-slate-500">
              A data de parcelas e recorrências não muda, para manter o calendário.
              {item.kind === 'installment' &&
                ' Ao alterar o valor, todas as parcelas escolhidas ficam com o novo valor.'}
            </p>
            <ScopePicker item={item} legend="O que alterar?" value={scope} onChange={setScope} />
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
          >
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  )
}

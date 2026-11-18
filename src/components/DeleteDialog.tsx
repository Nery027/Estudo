import { useState } from 'react'
import { formatCurrency } from '../utils/format'
import { itemTitle } from '../utils/ledger'
import type { LedgerItem, Scope } from '../utils/ledger'
import { Modal } from './Modal'
import { ScopePicker } from './ScopePicker'

interface Props {
  item: LedgerItem
  onConfirm: (scope: Scope) => void
  onClose: () => void
}

// Pergunta antes de apagar. Em parcelas e recorrências, também pergunta o alcance.
export function DeleteDialog({ item, onConfirm, onClose }: Props) {
  // Começa na opção mais segura: só este item
  const [scope, setScope] = useState<Scope>('one')
  const isGrouped = item.kind !== 'single'

  return (
    <Modal title="Excluir transação" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-700">
        Excluir <strong>{itemTitle(item)}</strong> ({formatCurrency(item.amountCents)})? Essa ação
        não pode ser desfeita.
      </p>

      {isGrouped && (
        <div className="mb-4">
          <ScopePicker item={item} legend="O que excluir?" value={scope} onChange={setScope} />
        </div>
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
          type="button"
          onClick={() => onConfirm(scope)}
          className="rounded-lg bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800"
        >
          Excluir
        </button>
      </div>
    </Modal>
  )
}

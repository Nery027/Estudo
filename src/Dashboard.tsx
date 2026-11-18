import { useState } from 'react'
import type { AuthResult } from './auth'
import { Avatar } from './components/Avatar'
import { CategoryChart } from './components/CategoryChart'
import { DeleteDialog } from './components/DeleteDialog'
import { EditTransactionModal } from './components/EditTransactionModal'
import { ProfileModal } from './components/ProfileModal'
import { MonthlyChart } from './components/MonthlyChart'
import { Summary } from './components/Summary'
import { TransactionForm } from './components/TransactionForm'
import { TransactionList } from './components/TransactionList'
import { useTransactions } from './hooks/useTransactions'
import type { PublicUser } from './types'
import { addMonths, formatMonth, monthKey, todayISO } from './utils/format'
import type { LedgerItem } from './utils/ledger'

interface Props {
  user: PublicUser
  onLogout: () => void
  onSavePhoto: (photo: string | null) => AuthResult
}

// A tela principal do controle financeiro (só aparece para quem está logado).
export default function Dashboard({ user, onLogout, onSavePhoto }: Props) {
  const { getItems, addEntry, removeItem, updateItem } = useTransactions(user.id)
  const [month, setMonth] = useState(monthKey(todayISO()))
  const [profileOpen, setProfileOpen] = useState(false)
  const [editing, setEditing] = useState<LedgerItem | null>(null)
  const [deleting, setDeleting] = useState<LedgerItem | null>(null)

  const monthLabel = formatMonth(month)

  // Tudo do mês escolhido: transações, parcelas e recorrências
  const monthItems = getItems(month)

  let incomeCents = 0
  let expenseCents = 0
  for (const t of monthItems) {
    if (t.type === 'receita') incomeCents += t.amountCents
    else expenseCents += t.amountCents
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-blue-800 text-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">Controle Financeiro</h1>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                aria-label="Meu perfil"
                title="Meu perfil"
                className="rounded-full ring-2 ring-white/60 hover:ring-white"
              >
                <Avatar name={user.name} photo={user.photo} />
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-white/40 px-3 py-1 text-sm font-medium hover:bg-blue-700"
              >
                Sair
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-between">
            <p className="min-w-0 truncate text-sm">
              Olá, <strong className="font-semibold">{user.name}</strong>
              {' · '}
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="underline hover:text-blue-100"
              >
                Meu perfil
              </button>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonth(addMonths(month, -1))}
                aria-label="Mês anterior"
                className="rounded-lg px-3 py-1 hover:bg-blue-700"
              >
                ←
              </button>
              <span className="min-w-40 text-center font-medium">
                {/* Só a primeira letra maiúscula: "Novembro de 2026" */}
                {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
              </span>
              <button
                type="button"
                onClick={() => setMonth(addMonths(month, 1))}
                aria-label="Próximo mês"
                className="rounded-lg px-3 py-1 hover:bg-blue-700"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <Summary incomeCents={incomeCents} expenseCents={expenseCents} />

        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <TransactionForm onAdd={addEntry} />
          <TransactionList items={monthItems} onEdit={setEditing} onDelete={setDeleting} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <CategoryChart items={monthItems} />
          <MonthlyChart getItems={getItems} endMonth={month} />
        </div>
      </main>

      {editing && (
        <EditTransactionModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={(scope, patch) => {
            updateItem(editing, scope, patch)
            setEditing(null)
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          item={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={(scope) => {
            removeItem(deleting, scope)
            setDeleting(null)
          }}
        />
      )}

      {profileOpen && (
        <ProfileModal
          user={user}
          onSavePhoto={onSavePhoto}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  )
}

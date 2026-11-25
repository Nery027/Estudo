import { useState } from 'react'
import type { AuthResult } from './auth'
import { Avatar } from './components/Avatar'
import { CategoryChart } from './components/CategoryChart'
import { DeleteDialog } from './components/DeleteDialog'
import { DueAlertBanner } from './components/DueAlertBanner'
import { EditTransactionModal } from './components/EditTransactionModal'
import { ImportLocalDataBanner } from './components/ImportLocalDataBanner'
import { NotificationPrompt } from './components/NotificationPrompt'
import { ProfileModal } from './components/ProfileModal'
import { MonthlyChart } from './components/MonthlyChart'
import { Summary } from './components/Summary'
import { TransactionForm } from './components/TransactionForm'
import { TransactionList } from './components/TransactionList'
import { useDueNotifications, useNotificationPermission } from './hooks/useDueNotifications'
import { useToday } from './hooks/useToday'
import { useTransactions } from './hooks/useTransactions'
import { getAlertDismissedDate, setAlertDismissedDate } from './storage'
import type { PublicUser } from './types'
import { addMonths, formatMonth, monthKey } from './utils/format'
import type { LedgerItem } from './utils/ledger'
import { collectDueAlerts, monthPaymentTotals } from './utils/payment'
import type { DueAlerts } from './utils/payment'

const NO_ALERTS: DueAlerts = { overdue: [], today: [], tomorrow: [] }

interface Props {
  user: PublicUser
  onLogout: () => void
  onSavePhoto: (photo: string | null) => Promise<AuthResult>
}

// A tela principal do controle financeiro (só aparece para quem está logado).
export default function Dashboard({ user, onLogout, onSavePhoto }: Props) {
  const {
    status,
    syncError,
    dismissError,
    reload,
    getItems,
    addEntry,
    removeItem,
    updateItem,
    markPaid,
  } = useTransactions(user.id)
  // "Hoje" em São Paulo (se atualiza sozinho na virada do dia)
  const today = useToday()
  const [month, setMonth] = useState(() => monthKey(today))
  const [profileOpen, setProfileOpen] = useState(false)
  const [editing, setEditing] = useState<LedgerItem | null>(null)
  const [deleting, setDeleting] = useState<LedgerItem | null>(null)
  const [dismissedDate, setDismissedDate] = useState(() => getAlertDismissedDate(user.id))
  const { permission, enable: enableNotifications } = useNotificationPermission()

  const monthLabel = formatMonth(month)

  // Tudo do mês escolhido: transações, parcelas e recorrências
  const monthItems = getItems(month)
  const totals = monthPaymentTotals(monthItems, today)

  // Aviso de vencimentos: contas pendentes que vencem amanhã, hoje ou já venceram
  const alerts = status === 'ready' ? collectDueAlerts(getItems, today) : NO_ALERTS
  const dismissedToday = dismissedDate === today
  useDueNotifications({ userId: user.id, alerts, today, permission, dismissedToday })

  function dismissAlerts() {
    setAlertDismissedDate(user.id, today)
    setDismissedDate(today)
  }

  // Um clique: paga (com a data de hoje) ou volta para pendente
  function togglePaid(item: LedgerItem, paid: boolean) {
    markPaid(item, paid ? today : null)
  }

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
        {status === 'loading' && (
          <p role="status" className="rounded-xl bg-white p-5 text-center text-slate-600 shadow-sm">
            Carregando seus dados...
          </p>
        )}

        {status === 'error' && (
          <div role="alert" className="rounded-xl bg-white p-5 text-center shadow-sm">
            <p className="mb-3 text-red-700">
              Não foi possível carregar seus dados. Verifique sua conexão e se as tabelas do
              Supabase foram criadas.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {syncError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{syncError}</p>
            <button
              type="button"
              onClick={dismissError}
              className="shrink-0 font-medium underline hover:text-red-900"
            >
              Fechar
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            {!dismissedToday && (
              <DueAlertBanner
                alerts={alerts}
                onMarkPaid={(item) => togglePaid(item, true)}
                onDismiss={dismissAlerts}
              />
            )}

            <NotificationPrompt permission={permission} onEnable={enableNotifications} />

            <ImportLocalDataBanner user={user} onSavePhoto={onSavePhoto} onImported={reload} />

            <Summary
              incomeCents={incomeCents}
              expenseCents={expenseCents}
              paidCents={totals.paidCents}
              pendingCents={totals.pendingCents}
              overdueCents={totals.overdueCents}
            />

            <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
              <TransactionForm onAdd={addEntry} />
              <TransactionList
                items={monthItems}
                today={today}
                onEdit={setEditing}
                onDelete={setDeleting}
                onTogglePaid={togglePaid}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <CategoryChart items={monthItems} />
              <MonthlyChart getItems={getItems} endMonth={month} />
            </div>
          </>
        )}
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

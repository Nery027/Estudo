import type { NotificationState } from '../hooks/useDueNotifications'

interface Props {
  permission: NotificationState
  onEnable: () => void
}

// Convite para ativar as notificações do navegador. Só pede a permissão
// quando a pessoa clica no botão.
export function NotificationPrompt({ permission, onEnable }: Props) {
  if (permission === 'unsupported' || permission === 'granted') return null

  if (permission === 'denied') {
    return (
      <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        As notificações estão bloqueadas neste navegador. Para receber os avisos, libere
        "Notificações" nas configurações do site.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
      <p>
        <span aria-hidden="true">🔔 </span>
        Quer ser avisado das contas que vencem? As notificações aparecem só com o app aberto.
      </p>
      <button
        type="button"
        onClick={onEnable}
        className="shrink-0 rounded-lg border border-blue-700 px-3 py-1 font-medium text-blue-800 hover:bg-blue-50"
      >
        Ativar notificações
      </button>
    </div>
  )
}

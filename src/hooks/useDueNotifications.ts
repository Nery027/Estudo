import { useEffect, useState } from 'react'
import { getAlertNotifiedDate, setAlertNotifiedDate } from '../storage'
import { buildNotificationText } from '../utils/payment'
import type { DueAlerts } from '../utils/payment'

export type NotificationState = NotificationPermission | 'unsupported'

function currentPermission(): NotificationState {
  return typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission
    : 'unsupported'
}

// Estado da permissão de notificações do navegador. Só pede a permissão quando
// a pessoa clica no botão (`enable`): nunca automaticamente.
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationState>(currentPermission)

  async function enable() {
    if (permission === 'unsupported') return
    try {
      setPermission(await Notification.requestPermission())
    } catch {
      setPermission(currentPermission())
    }
  }

  return { permission, enable }
}

// Mostra UMA notificação por dia com o resumo dos vencimentos, enquanto o app
// estiver aberto. Respeita a dispensa do dia.
// Observação: navegadores de celular costumam não permitir `new Notification`
// sem um app instalado (PWA); nesse caso o aviso simplesmente não aparece.
export function useDueNotifications(options: {
  userId: string
  alerts: DueAlerts
  today: string
  permission: NotificationState
  dismissedToday: boolean
}) {
  const { userId, alerts, today, permission, dismissedToday } = options
  const text = buildNotificationText(alerts)
  const title = text?.title
  const body = text?.body

  useEffect(() => {
    if (permission !== 'granted' || dismissedToday || !title || !body) return
    if (getAlertNotifiedDate(userId) === today) return
    try {
      new Notification(title, { body, tag: 'controle-financeiro-vencimentos' })
      setAlertNotifiedDate(userId, today)
    } catch {
      // Sem suporte neste aparelho (ex.: celular sem app instalado)
    }
  }, [userId, today, permission, dismissedToday, title, body])
}

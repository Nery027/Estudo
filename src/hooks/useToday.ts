import { useEffect, useState } from 'react'
import { todayInSaoPaulo } from '../utils/dates'

// "Hoje" em São Paulo, atualizado sozinho. Se o app ficar aberto durante a
// virada do dia (ou o celular voltar do bloqueio no dia seguinte), a data
// muda e os status/avisos são recalculados.
export function useToday(): string {
  const [today, setToday] = useState(() => todayInSaoPaulo())

  useEffect(() => {
    function refresh() {
      setToday(todayInSaoPaulo())
    }
    const timer = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return today
}

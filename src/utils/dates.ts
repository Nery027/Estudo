// Datas puras (sem tela e sem localStorage).

const TIME_ZONE = 'America/Sao_Paulo'

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Data de HOJE em São Paulo, no formato aaaa-mm-dd.
// Não usa UTC nem o fuso do aparelho: às 22h em São Paulo ainda é "hoje",
// mesmo que em UTC já seja amanhã. O parâmetro `now` existe para os testes.
export function todayInSaoPaulo(now: Date = new Date()): string {
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

// Soma (ou subtrai) dias de uma data aaaa-mm-dd. Conta de calendário pura:
// passa de mês e de ano sozinha (31/12 + 1 = 01/01) e conhece ano bissexto.
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + days))
  const y = result.getUTCFullYear()
  const m = String(result.getUTCMonth() + 1).padStart(2, '0')
  const d = String(result.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

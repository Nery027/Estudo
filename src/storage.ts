// Único lugar do app que lê e grava no localStorage.
//
// Desde que o app usa o Supabase, os dados de verdade ficam na nuvem. O
// localStorage serve só para: (1) ler os dados ANTIGOS deste navegador, para
// importá-los uma vez; (2) guardar marcações pequenas (o que já foi importado
// e uma foto de cadastro à espera do primeiro login).
// A sessão de login é guardada pela própria biblioteca do Supabase.
import type { Recurrence, Transaction, User } from './types'

const USERS_KEY = 'financeiro:users'
const IMPORTED_PREFIX = 'financeiro:imported:'
const PENDING_PHOTO_PREFIX = 'financeiro:pending-photo:'

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Dados corrompidos ou localStorage indisponível
    return null
  }
}

function isInstallmentInfo(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const i = value as Record<string, unknown>
  return (
    typeof i.groupId === 'string' && typeof i.number === 'number' && typeof i.total === 'number'
  )
}

function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.description === 'string' &&
    typeof t.amountCents === 'number' &&
    (t.type === 'receita' || t.type === 'despesa') &&
    typeof t.category === 'string' &&
    typeof t.date === 'string' &&
    (t.installment === undefined || isInstallmentInfo(t.installment))
  )
}

function isRecurrence(value: unknown): value is Recurrence {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.description === 'string' &&
    typeof r.amountCents === 'number' &&
    (r.type === 'receita' || r.type === 'despesa') &&
    typeof r.category === 'string' &&
    typeof r.startDate === 'string' &&
    typeof r.dayOfMonth === 'number' &&
    (r.endDate === undefined || typeof r.endDate === 'string') &&
    typeof r.exceptions === 'object' &&
    r.exceptions !== null
  )
}

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false
  const u = value as Record<string, unknown>
  return (
    typeof u.id === 'string' &&
    typeof u.name === 'string' &&
    typeof u.email === 'string' &&
    typeof u.salt === 'string' &&
    typeof u.passwordHash === 'string' &&
    (u.photo === undefined || typeof u.photo === 'string')
  )
}

// ---------- Dados antigos deste navegador (só leitura) ----------

export interface LocalAccount {
  id: string
  name: string
  email: string
  photo?: string
  transactions: Transaction[]
  recurrences: Recurrence[]
  imported: boolean
}

// Contas locais antigas deste navegador, com os dados de cada uma.
export function loadLocalAccounts(): LocalAccount[] {
  const users = readJson(USERS_KEY)
  if (!Array.isArray(users)) return []

  return users.filter(isUser).map((user) => {
    const transactions = readJson(`financeiro:transactions:${user.id}`)
    const recurrences = readJson(`financeiro:recurrences:${user.id}`)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      photo: user.photo,
      transactions: Array.isArray(transactions) ? transactions.filter(isTransaction) : [],
      recurrences: Array.isArray(recurrences) ? recurrences.filter(isRecurrence) : [],
      imported: localStorage.getItem(IMPORTED_PREFIX + user.id) !== null,
    }
  })
}

// Marca uma conta local como já importada (some o botão de importar).
export function markLocalAccountImported(localUserId: string, cloudUserId: string): void {
  try {
    localStorage.setItem(IMPORTED_PREFIX + localUserId, cloudUserId)
  } catch {
    // sem problema: o botão só continua aparecendo (importar de novo não duplica)
  }
}

// ---------- Foto escolhida no cadastro, à espera do primeiro login ----------

function pendingPhotoKey(email: string): string {
  return PENDING_PHOTO_PREFIX + email.trim().toLowerCase()
}

export function setPendingPhoto(email: string, photo: string): void {
  try {
    localStorage.setItem(pendingPhotoKey(email), photo)
  } catch {
    // sem espaço: a pessoa pode colocar a foto depois, em "Meu perfil"
  }
}

export function getPendingPhoto(email: string): string | null {
  try {
    return localStorage.getItem(pendingPhotoKey(email))
  } catch {
    return null
  }
}

export function clearPendingPhoto(email: string): void {
  try {
    localStorage.removeItem(pendingPhotoKey(email))
  } catch {
    // nada a fazer
  }
}

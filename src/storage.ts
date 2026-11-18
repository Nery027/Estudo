// Único lugar do app que lê e grava no localStorage.
import type { Recurrence, Transaction, User } from './types'

const USERS_KEY = 'financeiro:users'
const SESSION_KEY = 'financeiro:session'
// Chave antiga (antes do login existir): todas as transações juntas
const LEGACY_TRANSACTIONS_KEY = 'financeiro:transactions'

// Cada usuário tem a própria lista de transações
function transactionsKey(userId: string): string {
  return `financeiro:transactions:${userId}`
}

// Recorrências de cada usuário ficam numa chave própria
function recurrencesKey(userId: string): string {
  return `financeiro:recurrences:${userId}`
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Dados corrompidos ou localStorage indisponível
    return null
  }
}

// Retorna false se não conseguiu salvar (sem espaço, modo privado etc.)
function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
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

// ---------- Transações (por usuário) ----------

export function loadTransactions(userId: string): Transaction[] {
  const data = readJson(transactionsKey(userId))
  // Ignora itens inválidos em vez de quebrar o app inteiro
  return Array.isArray(data) ? data.filter(isTransaction) : []
}

export function saveTransactions(userId: string, transactions: Transaction[]): void {
  writeJson(transactionsKey(userId), transactions)
}

export function loadRecurrences(userId: string): Recurrence[] {
  const data = readJson(recurrencesKey(userId))
  return Array.isArray(data) ? data.filter(isRecurrence) : []
}

export function saveRecurrences(userId: string, recurrences: Recurrence[]): void {
  writeJson(recurrencesKey(userId), recurrences)
}

// Passa as transações da chave antiga para o usuário informado (uma única vez).
export function migrateLegacyTransactions(userId: string): void {
  const legacy = readJson(LEGACY_TRANSACTIONS_KEY)
  if (!Array.isArray(legacy)) return
  writeJson(transactionsKey(userId), legacy.filter(isTransaction))
  try {
    localStorage.removeItem(LEGACY_TRANSACTIONS_KEY)
  } catch {
    // sem problema: só não limpou a chave antiga
  }
}

// ---------- Usuários ----------

export function loadUsers(): User[] {
  const data = readJson(USERS_KEY)
  return Array.isArray(data) ? data.filter(isUser) : []
}

// Retorna false se não conseguiu salvar
export function saveUsers(users: User[]): boolean {
  return writeJson(USERS_KEY, users)
}

// ---------- Sessão (quem está logado) ----------

export function getSessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function setSessionUserId(userId: string): void {
  try {
    localStorage.setItem(SESSION_KEY, userId)
  } catch {
    // sem problema: o login só não sobrevive ao recarregar
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // nada a fazer
  }
}

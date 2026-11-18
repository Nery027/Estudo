// Cadastro, login e sessão. Tudo local (localStorage), sem servidor.
// Importante: isso NÃO é segurança de verdade contra quem tem acesso ao
// computador (os dados ficam no navegador). Serve para separar usuários.
import {
  clearSession,
  getSessionUserId,
  loadUsers,
  migrateLegacyTransactions,
  saveUsers,
  setSessionUserId,
} from './storage'
import type { PublicUser, User } from './types'

export type AuthResult = { ok: true; user: PublicUser } | { ok: false; error: string }

const MIN_PASSWORD_LENGTH = 6
const PBKDF2_ITERATIONS = 100_000

// ---------- Hash da senha ----------

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function generateSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
}

// PBKDF2 com SHA-256: repete o cálculo 100 mil vezes, o que deixa
// tentativas de adivinhar a senha muito mais lentas que um SHA-256 simples.
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  )
  return toHex(bits)
}

// crypto.subtle só existe em localhost ou HTTPS
const HASH_ERROR =
  'Não foi possível proteger a senha neste navegador. Acesse o app por localhost ou HTTPS.'

// ---------- Validações ----------

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

function toPublic(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, photo: user.photo }
}

const SAVE_ERROR =
  'Não foi possível salvar no navegador (talvez sem espaço). Tente uma foto menor ou libere espaço.'

// ---------- Ações ----------

export async function registerUser(
  name: string,
  email: string,
  password: string,
  photo: string | null = null,
): Promise<AuthResult> {
  const cleanName = name.trim()
  const cleanEmail = email.trim().toLowerCase()

  if (cleanName.length < 2) return { ok: false, error: 'Digite seu nome (mínimo 2 letras).' }
  if (cleanEmail === '') return { ok: false, error: 'Digite seu e-mail.' }
  if (!isValidEmail(cleanEmail)) {
    return { ok: false, error: 'E-mail inválido. Use um formato como nome@exemplo.com.' }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` }
  }

  const users = loadUsers()
  if (users.some((u) => u.email === cleanEmail)) {
    return { ok: false, error: 'Já existe uma conta com este e-mail. Tente entrar.' }
  }

  try {
    const salt = generateSalt()
    const user: User = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      salt,
      passwordHash: await hashPassword(password, salt),
      ...(photo ? { photo } : {}),
    }
    if (!saveUsers([...users, user])) return { ok: false, error: SAVE_ERROR }
    // A primeira conta do navegador herda as transações de antes do login existir
    if (users.length === 0) migrateLegacyTransactions(user.id)
    setSessionUserId(user.id)
    return { ok: true, user: toPublic(user) }
  } catch {
    return { ok: false, error: HASH_ERROR }
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase()

  if (cleanEmail === '') return { ok: false, error: 'Digite seu e-mail.' }
  if (!isValidEmail(cleanEmail)) {
    return { ok: false, error: 'E-mail inválido. Use um formato como nome@exemplo.com.' }
  }
  if (password === '') return { ok: false, error: 'Digite sua senha.' }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` }
  }

  const user = loadUsers().find((u) => u.email === cleanEmail)
  try {
    // Mesma mensagem para "e-mail não existe" e "senha errada",
    // para não revelar quais e-mails têm conta.
    if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
      return { ok: false, error: 'E-mail ou senha incorretos.' }
    }
  } catch {
    return { ok: false, error: HASH_ERROR }
  }

  setSessionUserId(user.id)
  return { ok: true, user: toPublic(user) }
}

// Troca a foto do usuário (ou remove, com null).
export function updateUserPhoto(userId: string, photo: string | null): AuthResult {
  const users = loadUsers()
  const index = users.findIndex((u) => u.id === userId)
  if (index === -1) return { ok: false, error: 'Conta não encontrada. Entre novamente.' }

  const { photo: _oldPhoto, ...rest } = users[index]
  const updated: User = photo ? { ...rest, photo } : rest
  const newUsers = [...users]
  newUsers[index] = updated

  if (!saveUsers(newUsers)) return { ok: false, error: SAVE_ERROR }
  return { ok: true, user: toPublic(updated) }
}

export function logoutUser(): void {
  clearSession()
}

// Usuário da sessão atual (ou null). Usado ao abrir/recarregar a página.
export function getCurrentUser(): PublicUser | null {
  const id = getSessionUserId()
  if (!id) return null
  const user = loadUsers().find((u) => u.id === id)
  return user ? toPublic(user) : null
}

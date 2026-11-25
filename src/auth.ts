// Cadastro, login e saída usando o Supabase Auth (e-mail e senha).
// Quem guarda e protege a senha é o Supabase: o app nunca vê nem guarda o hash.
import { clearPendingPhoto, setPendingPhoto } from './storage'
import { supabase } from './supabase'
import { isLinkExpiredError, translateAuthError } from './utils/authErrors'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from './utils/password'
import { buildRedirectUrl } from './utils/recovery'

// needsConfirmation: o Supabase mandou um e-mail de confirmação e a pessoa
// ainda precisa clicar no link antes de entrar.
// linkExpired: o link de recuperação não vale mais (a tela oferece pedir outro).
export type AuthResult =
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; error: string; linkExpired?: boolean }

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

const INVALID_EMAIL = 'E-mail inválido. Use um formato como nome@exemplo.com.'

export async function signUpUser(
  name: string,
  email: string,
  password: string,
  photo: string | null,
): Promise<AuthResult> {
  const cleanName = name.trim()
  const cleanEmail = email.trim().toLowerCase()

  if (cleanName.length < 2) return { ok: false, error: 'Digite seu nome (mínimo 2 letras).' }
  if (cleanEmail === '') return { ok: false, error: 'Digite seu e-mail.' }
  if (!isValidEmail(cleanEmail)) return { ok: false, error: INVALID_EMAIL }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` }
  }

  // A foto só pode ser gravada no perfil depois do primeiro login (com a sessão
  // aberta). Guardamos aqui e o app envia assim que a pessoa entrar.
  if (photo) setPendingPhoto(cleanEmail, photo)

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      // O nome vai junto: o banco usa isso para criar o perfil automaticamente
      options: { data: { name: cleanName } },
    })
    if (error) {
      clearPendingPhoto(cleanEmail)
      return { ok: false, error: translateAuthError(error, 'signUp') }
    }
    // Com confirmação de e-mail ligada, um e-mail já cadastrado não dá erro:
    // o Supabase devolve um usuário "vazio" (sem identidades) para não revelar quem tem conta.
    if (data.user && data.user.identities?.length === 0) {
      clearPendingPhoto(cleanEmail)
      return { ok: false, error: translateAuthError({ code: 'user_already_exists' }, 'signUp') }
    }
    return { ok: true, needsConfirmation: data.session === null }
  } catch (e) {
    clearPendingPhoto(cleanEmail)
    return { ok: false, error: translateAuthError(e as Error, 'signUp') }
  }
}

export async function signInUser(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase()

  if (cleanEmail === '') return { ok: false, error: 'Digite seu e-mail.' }
  if (!isValidEmail(cleanEmail)) return { ok: false, error: INVALID_EMAIL }
  if (password === '') return { ok: false, error: 'Digite sua senha.' }

  try {
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) return { ok: false, error: translateAuthError(error, 'signIn') }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: translateAuthError(e as Error, 'signIn') }
  }
}

// Pede ao Supabase o e-mail com o link de recuperação. O link leva de volta a
// este mesmo site (localhost em desenvolvimento, GitHub Pages no site publicado).
// Em caso de sucesso a tela mostra SEMPRE a mesma mensagem: o Supabase não
// avisa se o e-mail tem conta, e o app também não revela isso.
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase()
  if (cleanEmail === '') return { ok: false, error: 'Digite seu e-mail.' }
  if (!isValidEmail(cleanEmail)) return { ok: false, error: INVALID_EMAIL }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: buildRedirectUrl(window.location.origin, import.meta.env.BASE_URL),
    })
    if (error) return { ok: false, error: translateAuthError(error, 'resetRequest') }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: translateAuthError(e as Error, 'resetRequest') }
  }
}

// Define a nova senha (a pessoa já está com a sessão de recuperação aberta
// pelo link do e-mail).
export async function updatePasswordUser(
  password: string,
  confirmation: string,
): Promise<AuthResult> {
  const problem = validateNewPassword(password, confirmation)
  if (problem) return { ok: false, error: problem }

  try {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return {
        ok: false,
        error: translateAuthError(error, 'updatePassword'),
        linkExpired: isLinkExpiredError(error),
      }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: translateAuthError(e as Error, 'updatePassword') }
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await supabase.auth.signOut()
  } catch {
    // Mesmo sem internet a sessão local é encerrada pela própria biblioteca
  }
}

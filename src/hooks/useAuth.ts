import { useEffect, useState } from 'react'
import {
  requestPasswordReset,
  signInUser,
  signOutUser,
  signUpUser,
  updatePasswordUser,
} from '../auth'
import type { AuthResult } from '../auth'
import { fetchProfile, saveProfilePhoto } from '../cloud'
import { clearPendingPhoto, getPendingPhoto } from '../storage'
import { initialUrlAuth, supabase, supabaseConfigured } from '../supabase'
import type { PublicUser } from '../types'
import { translateLinkError } from '../utils/authErrors'

interface SessionUser {
  id: string
  email: string
  metaName: string // nome informado no cadastro (guardado na conta)
}

interface LoadedProfile {
  userId: string
  name: string
  photo: string | null
}

// Tira da barra de endereço o que veio do link do e-mail, para que recarregar
// a página não "use" o mesmo link de novo.
function cleanUrl() {
  window.history.replaceState(null, '', window.location.pathname)
}

// Quem está logado. O Supabase guarda a sessão e a restaura ao recarregar a página.
export function useAuth() {
  // undefined = ainda descobrindo se há sessão; null = ninguém logado
  const [session, setSession] = useState<SessionUser | null | undefined>(
    supabaseConfigured ? undefined : null,
  )
  const [profile, setProfile] = useState<LoadedProfile | null>(null)
  // true enquanto a pessoa está criando a nova senha (veio do link do e-mail)
  const [recovering, setRecovering] = useState(initialUrlAuth.isRecovery)
  // Mensagem de link com erro (expirado, já usado...), mostrada no "Esqueci minha senha"
  const [linkError, setLinkError] = useState(() =>
    initialUrlAuth.error
      ? translateLinkError(initialUrlAuth.error.code, initialUrlAuth.error.description)
      : '',
  )

  // 1) Acompanha entrar/sair. Aqui só guardamos os dados básicos da sessão:
  //    chamar o Supabase de dentro deste callback pode travar a biblioteca.
  useEffect(() => {
    if (!supabaseConfigured) return
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecovering(true)
        cleanUrl()
      } else if (event === 'SIGNED_OUT') {
        setRecovering(false)
      }
      const authUser = newSession?.user
      setSession((previous) => {
        if (!authUser) return null
        const metaName = authUser.user_metadata?.name
        const next: SessionUser = {
          id: authUser.id,
          email: authUser.email ?? '',
          metaName: typeof metaName === 'string' ? metaName : '',
        }
        const same =
          previous &&
          previous.id === next.id &&
          previous.email === next.email &&
          previous.metaName === next.metaName
        return same ? previous : next
      })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // 2) Quando alguém entra, carrega o perfil (nome e foto) e envia a foto de
  //    cadastro que estava esperando o primeiro login.
  useEffect(() => {
    if (!session) return
    const current = session
    let cancelled = false

    async function loadProfile() {
      let name = current.metaName
      let photo: string | null = null
      try {
        const pending = getPendingPhoto(current.email)
        if (pending) {
          await saveProfilePhoto(current.id, pending)
          clearPendingPhoto(current.email)
        }
        const row = await fetchProfile(current.id)
        if (row) {
          name = row.name || name
          photo = row.photo
        }
      } catch {
        // Sem conexão ou erro: segue com o nome do cadastro e sem foto por enquanto
      }
      if (!cancelled) {
        setProfile({
          userId: current.id,
          name: name || current.email.split('@')[0],
          photo,
        })
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [session])

  const profileReady = session && profile && profile.userId === session.id
  const loading = session === undefined || (session !== null && !profileReady)

  const user: PublicUser | null =
    session && profile && profile.userId === session.id
      ? {
          id: session.id,
          email: session.email,
          name: profile.name,
          photo: profile.photo ?? undefined,
        }
      : null

  async function updatePhoto(photo: string | null): Promise<AuthResult> {
    if (!user) return { ok: false, error: 'Você não está logado.' }
    try {
      await saveProfilePhoto(user.id, photo)
    } catch {
      return {
        ok: false,
        error: 'Não foi possível salvar a foto. Verifique sua conexão e tente novamente.',
      }
    }
    setProfile((current) =>
      current && current.userId === user.id ? { ...current, photo } : current,
    )
    return { ok: true }
  }

  // ---------- Recuperação de senha ----------

  // Nova senha definida: a pessoa segue para o Dashboard
  function finishRecovery() {
    cleanUrl()
    setRecovering(false)
  }

  // Desiste da nova senha: encerra a sessão aberta pelo link e volta ao login
  async function cancelRecovery() {
    await signOutUser()
    cleanUrl()
    setRecovering(false)
  }

  // Link expirado: volta ao "Esqueci minha senha" com o aviso
  async function requestAnotherLink() {
    // O aviso vem ANTES de encerrar a sessão: ao sair, a tela de login já abre
    // e precisa saber que deve começar no "Esqueci minha senha".
    setLinkError(translateLinkError('otp_expired'))
    await signOutUser()
    cleanUrl()
    setRecovering(false)
  }

  return {
    user,
    loading,
    recovering,
    linkError,
    clearLinkError: () => setLinkError(''),
    login: signInUser,
    register: signUpUser,
    requestReset: requestPasswordReset,
    setNewPassword: updatePasswordUser,
    finishRecovery,
    cancelRecovery,
    requestAnotherLink,
    updatePhoto,
    logout: signOutUser,
  }
}

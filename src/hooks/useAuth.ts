import { useState } from 'react'
import { getCurrentUser, loginUser, logoutUser, registerUser, updateUserPhoto } from '../auth'
import type { AuthResult } from '../auth'
import type { PublicUser } from '../types'

// Guarda quem está logado. Ao recarregar a página, recupera a sessão salva.
export function useAuth() {
  const [user, setUser] = useState<PublicUser | null>(getCurrentUser)

  async function login(email: string, password: string): Promise<AuthResult> {
    const result = await loginUser(email, password)
    if (result.ok) setUser(result.user)
    return result
  }

  async function register(
    name: string,
    email: string,
    password: string,
    photo: string | null,
  ): Promise<AuthResult> {
    const result = await registerUser(name, email, password, photo)
    if (result.ok) setUser(result.user)
    return result
  }

  function updatePhoto(photo: string | null): AuthResult {
    if (!user) return { ok: false, error: 'Você não está logado.' }
    const result = updateUserPhoto(user.id, photo)
    if (result.ok) setUser(result.user)
    return result
  }

  function logout() {
    logoutUser()
    setUser(null)
  }

  return { user, login, register, updatePhoto, logout }
}

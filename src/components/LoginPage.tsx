import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthResult } from '../auth'
import { PhotoPicker } from './PhotoPicker'

interface Props {
  onLogin: (email: string, password: string) => Promise<AuthResult>
  onRegister: (
    name: string,
    email: string,
    password: string,
    photo: string | null,
  ) => Promise<AuthResult>
  onRequestReset: (email: string) => Promise<AuthResult>
  // Aviso de link do e-mail expirado/inválido: abre direto o "Esqueci minha senha"
  linkError?: string
  onClearLinkError?: () => void
}

type Mode = 'login' | 'register' | 'forgot'

// Mensagem fixa: igual exista a conta ou não (não revela quais e-mails têm conta)
const RESET_SENT_MESSAGE = 'Se este e-mail estiver cadastrado, você receberá um link em instantes.'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'

// Tela mostrada quando ninguém está logado: entrar, criar conta ou recuperar a senha.
export function LoginPage({ onLogin, onRegister, onRequestReset, linkError, onClearLinkError }: Props) {
  const [mode, setMode] = useState<Mode>(linkError ? 'forgot' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'

  function changeMode(newMode: Mode) {
    setMode(newMode)
    setError('')
    setInfo('')
    onClearLinkError?.()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    if (isForgot) {
      onClearLinkError?.()
      const reset = await onRequestReset(email)
      setLoading(false)
      if (reset.ok) setInfo(RESET_SENT_MESSAGE)
      else setError(reset.error)
      return
    }

    const result = isRegister
      ? await onRegister(name, email, password, photo)
      : await onLogin(email, password)
    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }
    // Conta criada, mas o Supabase pediu confirmação por e-mail: volta para "Entrar"
    if (result.needsConfirmation) {
      setInfo(
        `Enviamos um link de confirmação para ${email.trim()}. Confirme seu e-mail e depois entre.`,
      )
      setMode('login')
      setName('')
      setPassword('')
      setPhoto(null)
      setLoading(false)
    }
    // Se entrou de verdade, o App troca de tela sozinho
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <header className="bg-blue-800 text-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-bold">Controle Financeiro</h1>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm">
          {!isForgot && (
            <div className="mb-5 grid grid-cols-2 gap-2" role="group" aria-label="Escolha uma opção">
              {(
                [
                  ['login', 'Entrar'],
                  ['register', 'Criar conta'],
                ] as const
              ).map(([option, label]) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeMode(option)}
                  aria-pressed={mode === option}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    mode === option
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            {isForgot ? 'Recuperar senha' : isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            {isForgot
              ? 'Digite seu e-mail e enviaremos um link para você criar uma nova senha.'
              : isRegister
                ? 'Preencha os dados para começar a controlar suas finanças.'
                : 'Entre para ver suas finanças.'}
          </p>

          {isForgot && linkError && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {linkError}
            </p>
          )}

          {/* noValidate: as mensagens de erro são nossas, em português */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="name" className="mb-1 block text-sm text-slate-700">
                  Nome
                </label>
                <input
                  id="name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-slate-700">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="nome@exemplo.com"
              />
            </div>

            {!isForgot && (
              <div>
                <label htmlFor="password" className="mb-1 block text-sm text-slate-700">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder="Mínimo 6 caracteres"
                />
                {!isRegister && (
                  <p className="mt-1 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => changeMode('forgot')}
                      className="font-medium text-blue-700 underline hover:text-blue-800"
                    >
                      Esqueci minha senha
                    </button>
                  </p>
                )}
              </div>
            )}

            {isRegister && (
              <div>
                <p className="mb-2 text-sm text-slate-700">Foto de perfil (opcional)</p>
                <PhotoPicker name={name} photo={photo} onChange={setPhoto} />
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            {info && (
              <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading
                ? 'Aguarde...'
                : isForgot
                  ? 'Enviar link de recuperação'
                  : isRegister
                    ? 'Criar conta'
                    : 'Entrar'}
            </button>
          </form>

          {isForgot ? (
            <p className="mt-4 text-center text-sm text-slate-600">
              <button
                type="button"
                onClick={() => changeMode('login')}
                className="font-medium text-blue-700 underline hover:text-blue-800"
              >
                Voltar para o login
              </button>
            </p>
          ) : (
            <p className="mt-4 text-center text-sm text-slate-600">
              {isRegister ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
              <button
                type="button"
                onClick={() => changeMode(isRegister ? 'login' : 'register')}
                className="font-medium text-blue-700 underline hover:text-blue-800"
              >
                {isRegister ? 'Entrar' : 'Criar conta'}
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

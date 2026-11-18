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
}

type Mode = 'login' | 'register'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'

// Tela mostrada quando ninguém está logado: entrar ou criar conta.
export function LoginPage({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  function changeMode(newMode: Mode) {
    setMode(newMode)
    setError('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const result = isRegister
      ? await onRegister(name, email, password, photo)
      : await onLogin(email, password)
    // Se deu certo, o App troca de tela sozinho; só precisamos tratar o erro
    if (!result.ok) {
      setError(result.error)
      setLoading(false)
    }
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

          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            {isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            {isRegister
              ? 'Preencha os dados para começar a controlar suas finanças.'
              : 'Entre para ver suas finanças.'}
          </p>

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
            </div>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

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
        </div>
      </main>
    </div>
  )
}

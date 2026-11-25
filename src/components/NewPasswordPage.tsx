import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthResult } from '../auth'

interface Props {
  onSubmit: (password: string, confirmation: string) => Promise<AuthResult>
  // Sucesso: segue para o Dashboard
  onDone: () => void
  // Desistir: encerra a sessão do link e volta ao login
  onCancel: () => Promise<void>
  // Link vencido: volta ao "Esqueci minha senha" para pedir outro
  onRequestAnotherLink: () => Promise<void>
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'

// Tela "Criar nova senha": aparece quando a pessoa abre o link do e-mail.
export function NewPasswordPage({ onSubmit, onDone, onCancel, onRequestAnotherLink }: Props) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [linkExpired, setLinkExpired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const result = await onSubmit(password, confirmation)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      setLinkExpired(Boolean(result.linkExpired))
      return
    }
    setPassword('')
    setConfirmation('')
    setSuccess(true)
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
          {success ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Senha alterada!</h2>
              <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                Sua nova senha já está valendo. Use-a nas próximas vezes que entrar.
              </p>
              <button
                type="button"
                onClick={onDone}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
              >
                Ir para o app
              </button>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-semibold text-slate-900">Criar nova senha</h2>
              <p className="mb-4 text-sm text-slate-500">
                Escolha uma senha nova, com no mínimo 6 caracteres.
              </p>

              {/* noValidate: as mensagens de erro são nossas, em português */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="mb-1 block text-sm text-slate-700">
                    Nova senha
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="mb-1 block text-sm text-slate-700">
                    Repita a nova senha
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    className={inputClass}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Digite a mesma senha"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-red-700">
                    {error}
                  </p>
                )}

                {linkExpired ? (
                  <button
                    type="button"
                    onClick={() => void onRequestAnotherLink()}
                    className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
                  >
                    Pedir um novo link
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    {loading ? 'Aguarde...' : 'Salvar nova senha'}
                  </button>
                )}
              </form>

              <p className="mt-4 text-center text-sm text-slate-600">
                <button
                  type="button"
                  onClick={() => void onCancel()}
                  disabled={loading}
                  className="font-medium text-blue-700 underline hover:text-blue-800 disabled:opacity-60"
                >
                  Cancelar e voltar ao login
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

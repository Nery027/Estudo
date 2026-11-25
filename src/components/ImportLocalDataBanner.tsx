import { useState } from 'react'
import type { AuthResult } from '../auth'
import { importLedger } from '../cloud'
import { loadLocalAccounts, markLocalAccountImported } from '../storage'
import type { LocalAccount } from '../storage'
import type { PublicUser } from '../types'
import { remapForImport } from '../utils/migration'

interface Props {
  user: PublicUser
  onSavePhoto: (photo: string | null) => Promise<AuthResult>
  // Recarrega as transações da nuvem depois de importar
  onImported: () => Promise<void>
}

function describeCounts(account: LocalAccount): string {
  const parts: string[] = []
  if (account.transactions.length > 0) {
    parts.push(`${account.transactions.length} transaç${account.transactions.length === 1 ? 'ão' : 'ões'}`)
  }
  if (account.recurrences.length > 0) {
    parts.push(
      `${account.recurrences.length} recorrência${account.recurrences.length === 1 ? '' : 's'}`,
    )
  }
  return parts.join(' e ')
}

// Importação ÚNICA dos dados antigos que ainda estão neste navegador (do tempo
// em que o app guardava tudo só no aparelho) para a conta na nuvem.
export function ImportLocalDataBanner({ user, onSavePhoto, onImported }: Props) {
  // Só contas antigas que ainda têm dados e ainda não foram importadas
  const [accounts, setAccounts] = useState<LocalAccount[]>(() =>
    loadLocalAccounts().filter(
      (a) => !a.imported && a.transactions.length + a.recurrences.length > 0,
    ),
  )
  const [selectedId, setSelectedId] = useState(() => {
    const candidates = loadLocalAccounts().filter(
      (a) => !a.imported && a.transactions.length + a.recurrences.length > 0,
    )
    // Se o e-mail antigo for o mesmo da conta nova, já vem escolhido
    const sameEmail = candidates.find((a) => a.email.toLowerCase() === user.email.toLowerCase())
    return (sameEmail ?? candidates[0])?.id ?? ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || (accounts.length === 0 && !done)) return null

  async function handleImport() {
    const account = accounts.find((a) => a.id === selectedId)
    if (!account || busy) return
    setBusy(true)
    setError('')
    try {
      // Ids novos (calculados): importar de novo nunca duplica
      const data = await remapForImport(
        { transactions: account.transactions, recurrences: account.recurrences },
        user.id,
      )
      await importLedger(user.id, data)
      // Se a conta nova ainda não tem foto, aproveita a da conta antiga
      if (account.photo && !user.photo) await onSavePhoto(account.photo)
      markLocalAccountImported(account.id, user.id)
      await onImported()
      setAccounts((current) => current.filter((a) => a.id !== account.id))
      setDone(`Pronto! Importamos ${describeCounts(account)} para a sua conta na nuvem.`)
    } catch {
      setError(
        'Não foi possível importar agora. Nada foi duplicado: confira a conexão e tente de novo.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-label="Importar dados deste navegador"
      className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-800"
    >
      {done && (
        <p role="status" className="font-medium text-green-800">
          {done}
        </p>
      )}

      {accounts.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-slate-900">
            Encontramos dados antigos neste navegador
          </h2>
          <p className="mt-1 text-slate-700">
            Estes dados estão salvos só neste aparelho. Importe para a nuvem uma única vez para
            vê-los em qualquer lugar. Os dados deste navegador não são apagados.
          </p>

          <div className="mt-3 space-y-2">
            {accounts.map((account) => (
              <label key={account.id} className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="local-account"
                  value={account.id}
                  checked={selectedId === account.id}
                  onChange={() => setSelectedId(account.id)}
                  className="mt-0.5"
                />
                <span>
                  <strong>{account.name}</strong> ({account.email}): {describeCounts(account)}
                </span>
              </label>
            ))}
          </div>

          {error && (
            <p role="alert" className="mt-3 text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={busy || selectedId === ''}
              className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {busy ? 'Importando...' : 'Importar para a nuvem'}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              disabled={busy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Agora não
            </button>
          </div>
        </>
      )}
    </section>
  )
}

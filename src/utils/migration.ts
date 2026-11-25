// Preparação da importação dos dados antigos (localStorage) para a nuvem.
import type { Recurrence, Transaction } from '../types'

export interface ImportData {
  transactions: Transaction[]
  recurrences: Recurrence[]
}

// Cria um identificador (formato UUID) CALCULADO a partir do usuário da nuvem e
// de uma chave do item antigo. O mesmo par sempre dá o mesmo resultado, então:
//  - importar duas vezes não duplica (o banco só atualiza a mesma linha);
//  - dois usuários diferentes nunca ficam com o mesmo identificador.
export async function deriveId(cloudUserId: string, localKey: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${cloudUserId}:${localKey}`)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const id = hash.slice(0, 16)
  id[6] = (id[6] & 0x0f) | 0x50 // marca como UUID versão 5
  id[8] = (id[8] & 0x3f) | 0x80 // marca a variante padrão
  const hex = [...id].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Troca os identificadores antigos pelos novos, mantendo tudo o mais igual:
// valores em centavos, datas, categorias, exceções... E mantém as parcelas de
// uma mesma compra juntas (mesmo grupo antes = mesmo grupo depois).
export async function remapForImport(data: ImportData, cloudUserId: string): Promise<ImportData> {
  const transactions = await Promise.all(
    data.transactions.map(async (t): Promise<Transaction> => {
      const mapped: Transaction = { ...t, id: await deriveId(cloudUserId, `tx:${t.id}`) }
      if (t.installment) {
        mapped.installment = {
          ...t.installment,
          groupId: await deriveId(cloudUserId, `group:${t.installment.groupId}`),
        }
      }
      return mapped
    }),
  )

  const recurrences = await Promise.all(
    data.recurrences.map(
      async (r): Promise<Recurrence> => ({
        ...r,
        id: await deriveId(cloudUserId, `rec:${r.id}`),
      }),
    ),
  )

  return { transactions, recurrences }
}

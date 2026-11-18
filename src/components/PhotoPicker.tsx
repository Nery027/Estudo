import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { processImageFile } from '../utils/image'
import { Avatar } from './Avatar'

interface Props {
  // Nome usado nas iniciais quando não há foto
  name: string
  // Foto atual da prévia (null = sem foto)
  photo: string | null
  onChange: (photo: string | null) => void
}

const buttonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'

// Escolher uma imagem do computador, ver a prévia, trocar ou remover.
export function PhotoPicker({ name, photo, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Limpa o campo para poder escolher o mesmo arquivo de novo depois
    event.target.value = ''
    if (!file) return

    setError('')
    setProcessing(true)
    try {
      onChange(await processImageFile(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível usar esta imagem.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar name={name || '?'} photo={photo} size="xl" />

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={processing}
          onClick={() => inputRef.current?.click()}
        >
          {processing ? 'Processando...' : photo ? 'Trocar imagem' : 'Escolher imagem'}
        </button>
        {photo && (
          <button
            type="button"
            className={`${buttonClass} hover:text-red-700`}
            disabled={processing}
            onClick={() => {
              setError('')
              onChange(null)
            }}
          >
            Remover foto
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
        aria-label="Escolher foto de perfil"
      />

      <p className="text-center text-xs text-slate-500">JPG, PNG ou WebP, até 2 MB.</p>

      {error && (
        <p role="alert" className="text-center text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

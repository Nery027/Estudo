import { useState } from 'react'
import type { AuthResult } from '../auth'
import type { PublicUser } from '../types'
import { Modal } from './Modal'
import { PhotoPicker } from './PhotoPicker'

interface Props {
  user: PublicUser
  onSavePhoto: (photo: string | null) => AuthResult
  onClose: () => void
}

// Janela "Meu perfil": a foto escolhida só é salva ao clicar em Salvar.
export function ProfileModal({ user, onSavePhoto, onClose }: Props) {
  const [photo, setPhoto] = useState<string | null>(user.photo ?? null)
  const [error, setError] = useState('')

  const changed = photo !== (user.photo ?? null)

  function handleSave() {
    const result = onSavePhoto(photo)
    if (result.ok) onClose()
    else setError(result.error)
  }

  return (
    <Modal title="Meu perfil" onClose={onClose}>
      <div className="mb-5">
        <PhotoPicker
          name={user.name}
          photo={photo}
          onChange={(newPhoto) => {
            setError('')
            setPhoto(newPhoto)
          }}
        />
      </div>

      <div className="mb-5 text-center">
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-slate-500">{user.email}</p>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-center text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!changed}
          className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          Salvar
        </button>
      </div>
    </Modal>
  )
}

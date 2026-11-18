interface Props {
  name: string
  photo?: string | null
  size?: 'sm' | 'xl'
}

const SIZE_CLASSES = {
  sm: 'h-9 w-9 text-sm',
  xl: 'h-28 w-28 text-3xl',
}

// "Ana Maria Souza" -> "AS"; "Bruno" -> "B"
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

// Foto redonda do usuário; sem foto, um círculo com as iniciais do nome.
export function Avatar({ name, photo, size = 'sm' }: Props) {
  const sizeClass = SIZE_CLASSES[size]

  if (photo) {
    return (
      <img
        src={photo}
        alt={`Foto de ${name}`}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={`Iniciais de ${name}`}
      className={`${sizeClass} flex shrink-0 select-none items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-800`}
    >
      {getInitials(name)}
    </span>
  )
}

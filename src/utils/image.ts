// Validação e redução de imagens (foto de perfil).

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2 MB
const MAX_SIDE = 256 // pixels

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível ler esta imagem. Tente outro arquivo.'))
    img.src = url
  })
}

// Recebe o arquivo escolhido e devolve a foto pronta para salvar (texto data URL).
// Lança um Error com mensagem em português se o arquivo não for aceito.
//
// A foto é mostrada em círculo, então recortamos o centro em formato quadrado
// e reduzimos para no máximo 256x256 (imagens menores não são ampliadas).
export async function processImageFile(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Formato não aceito. Escolha uma imagem JPG, PNG ou WebP.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('A imagem é muito grande. O limite é 2 MB.')
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const size = Math.min(MAX_SIDE, side)
    const sourceX = (img.naturalWidth - side) / 2
    const sourceY = (img.naturalHeight - side) / 2

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível processar a imagem neste navegador.')

    // Fundo branco: PNG/WebP transparentes ficariam pretos ao virar JPEG
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, size, size)
    context.drawImage(img, sourceX, sourceY, side, side, 0, 0, size, size)

    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

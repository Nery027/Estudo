// Peças puras da recuperação de senha (sem rede e sem tela, fáceis de testar).

export interface UrlAuthInfo {
  // true quando o endereço veio de um link de "recuperar senha" válido
  isRecovery: boolean
  // preenchido quando o link do e-mail deu erro (expirado, já usado...)
  error: { code: string; description: string } | null
}

// Lê o endereço da página (a parte depois do # e depois do ?) e descobre se
// ele veio de um link de recuperação ou de um link com erro.
// Exemplo de link com erro:
//   #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
export function parseAuthUrl(hash: string, search: string): UrlAuthInfo {
  const fromHash = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const fromSearch = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const read = (key: string) => fromHash.get(key) ?? fromSearch.get(key)

  const errorCode = read('error_code')
  const errorName = read('error')
  const error =
    errorCode || errorName
      ? {
          code: errorCode ?? errorName ?? '',
          description: read('error_description') ?? '',
        }
      : null

  // Só vale como recuperação se o link trouxe a chave de acesso junto
  const isRecovery = !error && fromHash.get('type') === 'recovery' && fromHash.has('access_token')

  return { isRecovery, error }
}

// Endereço para onde o link do e-mail leva de volta, respeitando o "base" do Vite:
//   desenvolvimento: http://localhost:5173/
//   GitHub Pages:    https://nery027.github.io/Estudo/
export function buildRedirectUrl(origin: string, baseUrl: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '')
  const path = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`
  return `${cleanOrigin}${path.endsWith('/') ? path : `${path}/`}`
}

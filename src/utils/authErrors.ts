// Traduz os erros do Supabase Auth para mensagens claras em português.

interface AuthErrorLike {
  code?: string
  message?: string
  status?: number
  name?: string
}

// signIn/signUp: entrar e criar conta
// resetRequest: pedir o link de recuperação
// updatePassword: criar a nova senha
export type AuthContext = 'signIn' | 'signUp' | 'resetRequest' | 'updatePassword'

const RATE_LIMIT = 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.'
const RESET_RATE_LIMIT =
  'Muitos e-mails de recuperação foram pedidos em pouco tempo. O envio de e-mails tem um limite baixo: aguarde alguns minutos e tente de novo.'
const NETWORK = 'Sem conexão com a internet ou com o servidor. Verifique sua rede e tente de novo.'
const EXISTS = 'Já existe uma conta com este e-mail. Tente entrar.'
const CREDENTIALS = 'E-mail ou senha incorretos.'
const NOT_CONFIRMED =
  'Confirme seu e-mail antes de entrar. Procure o link de confirmação na caixa de entrada (e no spam).'
const LINK_EXPIRED =
  'Este link de recuperação expirou ou já foi usado. Peça um novo link para continuar.'
const LINK_INVALID = 'Este link de recuperação não é válido. Peça um novo link para continuar.'
const SAME_PASSWORD = 'A nova senha precisa ser diferente da senha atual.'
const WEAK_PASSWORD = 'A senha é muito fraca. Use no mínimo 6 caracteres.'

// Erros que significam "o link não vale mais, peça outro"
export function isLinkExpiredError(error: AuthErrorLike | null): boolean {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()
  return (
    code === 'otp_expired' ||
    code === 'session_not_found' ||
    code === 'session_expired' ||
    code === 'not_authenticated' ||
    code === 'bad_jwt' ||
    message.includes('auth session missing') ||
    message.includes('jwt expired') ||
    message.includes('invalid or has expired') ||
    message.includes('invalid jwt')
  )
}

// "For security purposes, you can only request this after 45 seconds." -> 45
function secondsToWait(message: string): number | null {
  const match = /after (\d+) seconds?/.exec(message)
  return match ? Number(match[1]) : null
}

// Erro que vem NO ENDEREÇO da página quando o link do e-mail não funciona
export function translateLinkError(code: string, description = ''): string {
  const text = `${code} ${description}`.toLowerCase()
  if (text.includes('expired') || text.includes('otp_expired') || text.includes('access_denied')) {
    return LINK_EXPIRED
  }
  return LINK_INVALID
}

export function translateAuthError(error: AuthErrorLike | null, context: AuthContext): string {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  // Na criação da nova senha, sessão ausente/vencida = link expirado
  if (context === 'updatePassword' && isLinkExpiredError(error)) return LINK_EXPIRED
  if (code === 'same_password' || message.includes('different from the old password')) {
    return SAME_PASSWORD
  }

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return CREDENTIALS
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return NOT_CONFIRMED
  }
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already registered')
  ) {
    return EXISTS
  }
  if (code === 'weak_password' || message.includes('password should be at least')) {
    return WEAK_PASSWORD
  }
  if (
    code === 'email_address_invalid' ||
    (message.includes('email address') && message.includes('invalid'))
  ) {
    return 'Este e-mail não foi aceito. Confira se está escrito corretamente.'
  }
  if (code === 'signup_disabled') {
    return 'O cadastro de novas contas está desativado neste app.'
  }
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    error?.status === 429 ||
    message.includes('rate limit') ||
    message.includes('you can only request this after')
  ) {
    if (context === 'resetRequest') {
      const seconds = secondsToWait(message)
      return seconds
        ? `Por segurança, aguarde ${seconds} segundos antes de pedir outro link.`
        : RESET_RATE_LIMIT
    }
    return RATE_LIMIT
  }
  if (
    error?.name === 'AuthRetryableFetchError' ||
    error?.status === 0 ||
    message.includes('failed to fetch') ||
    message.includes('network')
  ) {
    return NETWORK
  }

  switch (context) {
    case 'signUp':
      return 'Não foi possível criar a conta. Tente novamente.'
    case 'resetRequest':
      return 'Não foi possível enviar o link agora. Tente novamente em instantes.'
    case 'updatePassword':
      return 'Não foi possível alterar a senha. Tente novamente.'
    default:
      return 'Não foi possível entrar. Tente novamente.'
  }
}

import { describe, expect, it } from 'vitest'
import { isLinkExpiredError, translateAuthError, translateLinkError } from './authErrors'

describe('recuperação de senha: pedir o link', () => {
  it('limite de e-mails sem tempo informado: aviso amigável', () => {
    const text = translateAuthError({ code: 'over_email_send_rate_limit' }, 'resetRequest')
    expect(text).toContain('Muitos e-mails de recuperação')
    expect(text).toContain('aguarde alguns minutos')
  })

  it('limite com tempo informado pelo Supabase: diz quantos segundos esperar', () => {
    const text = translateAuthError(
      {
        code: 'over_email_send_rate_limit',
        message: 'For security purposes, you can only request this after 45 seconds.',
        status: 429,
      },
      'resetRequest',
    )
    expect(text).toBe('Por segurança, aguarde 45 segundos antes de pedir outro link.')
  })

  it('o tempo aparece mesmo sem o código do erro (só pela mensagem)', () => {
    const text = translateAuthError(
      { message: 'For security purposes, you can only request this after 12 seconds.' },
      'resetRequest',
    )
    expect(text).toContain('12 segundos')
  })

  it('status 429 também é tratado como limite', () => {
    expect(translateAuthError({ status: 429 }, 'resetRequest')).toContain('Muitos e-mails')
  })

  it('e-mail recusado, sem internet e erro desconhecido', () => {
    expect(translateAuthError({ code: 'email_address_invalid' }, 'resetRequest')).toContain(
      'e-mail não foi aceito',
    )
    expect(translateAuthError({ message: 'Failed to fetch' }, 'resetRequest')).toContain(
      'Sem conexão',
    )
    expect(translateAuthError({ code: 'algo_novo' }, 'resetRequest')).toBe(
      'Não foi possível enviar o link agora. Tente novamente em instantes.',
    )
  })

  it('no login e no cadastro o limite continua com a mensagem de sempre', () => {
    expect(translateAuthError({ code: 'over_email_send_rate_limit' }, 'signUp')).toContain(
      'Muitas tentativas',
    )
  })
})

describe('recuperação de senha: criar a nova senha', () => {
  it('senha igual à atual', () => {
    expect(translateAuthError({ code: 'same_password' }, 'updatePassword')).toBe(
      'A nova senha precisa ser diferente da senha atual.',
    )
    expect(
      translateAuthError(
        { message: 'New password should be different from the old password.' },
        'updatePassword',
      ),
    ).toContain('diferente da senha atual')
  })

  it('senha fraca', () => {
    expect(translateAuthError({ code: 'weak_password' }, 'updatePassword')).toContain('muito fraca')
  })

  it('sem sessão (link já usado ou vencido) vira "link expirado"', () => {
    for (const error of [
      { message: 'Auth session missing!' },
      { code: 'session_not_found' },
      { code: 'bad_jwt' },
      { message: 'JWT expired' },
    ]) {
      expect(translateAuthError(error, 'updatePassword')).toContain('expirou ou já foi usado')
    }
  })

  it('sem internet e erro desconhecido', () => {
    expect(translateAuthError({ name: 'AuthRetryableFetchError', status: 0 }, 'updatePassword')).toContain(
      'Sem conexão',
    )
    expect(translateAuthError({ code: 'algo_novo' }, 'updatePassword')).toBe(
      'Não foi possível alterar a senha. Tente novamente.',
    )
  })

  it('nunca mostra texto técnico em inglês', () => {
    const text = translateAuthError(
      { code: 'xyz', message: 'Some internal Supabase failure' },
      'updatePassword',
    )
    expect(text).not.toMatch(/supabase|internal|failure/i)
  })
})

describe('isLinkExpiredError (o link não vale mais?)', () => {
  it('reconhece os erros de link vencido ou sessão ausente', () => {
    expect(isLinkExpiredError({ code: 'otp_expired' })).toBe(true)
    expect(isLinkExpiredError({ message: 'Auth session missing!' })).toBe(true)
    expect(isLinkExpiredError({ message: 'Email link is invalid or has expired' })).toBe(true)
  })

  it('não confunde com outros erros', () => {
    expect(isLinkExpiredError({ code: 'weak_password' })).toBe(false)
    expect(isLinkExpiredError({ code: 'same_password' })).toBe(false)
    expect(isLinkExpiredError(null)).toBe(false)
  })
})

describe('translateLinkError (erro que veio no endereço da página)', () => {
  it('link expirado ou já usado', () => {
    expect(translateLinkError('otp_expired', 'Email link is invalid or has expired')).toContain(
      'expirou ou já foi usado',
    )
    expect(translateLinkError('access_denied')).toContain('expirou ou já foi usado')
  })

  it('outro erro de link: mensagem de link inválido, sempre pedindo um novo', () => {
    const text = translateLinkError('algo_estranho', 'alguma coisa')
    expect(text).toContain('não é válido')
    expect(text).toContain('Peça um novo link')
  })
})

describe('translateAuthError (erros do login em português)', () => {
  it('senha ou e-mail errados', () => {
    expect(translateAuthError({ code: 'invalid_credentials' }, 'signIn')).toBe('E-mail ou senha incorretos.')
    expect(translateAuthError({ message: 'Invalid login credentials' }, 'signIn')).toBe(
      'E-mail ou senha incorretos.',
    )
  })

  it('e-mail ainda não confirmado', () => {
    expect(translateAuthError({ code: 'email_not_confirmed' }, 'signIn')).toContain('Confirme seu e-mail')
  })

  it('e-mail já cadastrado', () => {
    for (const error of [
      { code: 'user_already_exists' },
      { code: 'email_exists' },
      { message: 'User already registered' },
    ]) {
      expect(translateAuthError(error, 'signUp')).toContain('Já existe uma conta')
    }
  })

  it('senha fraca', () => {
    expect(translateAuthError({ code: 'weak_password' }, 'signUp')).toContain('senha')
  })

  it('e-mail recusado', () => {
    expect(translateAuthError({ code: 'email_address_invalid' }, 'signUp')).toContain('e-mail não foi aceito')
  })

  it('limite de tentativas', () => {
    expect(translateAuthError({ code: 'over_email_send_rate_limit' }, 'signUp')).toContain('Muitas tentativas')
    expect(translateAuthError({ status: 429 }, 'signIn')).toContain('Muitas tentativas')
  })

  it('sem internet', () => {
    expect(translateAuthError({ name: 'AuthRetryableFetchError', status: 0 }, 'signIn')).toContain('Sem conexão')
    expect(translateAuthError({ message: 'Failed to fetch' }, 'signUp')).toContain('Sem conexão')
  })

  it('erro desconhecido: mensagem genérica de acordo com a ação', () => {
    expect(translateAuthError({ code: 'algo_novo' }, 'signIn')).toBe('Não foi possível entrar. Tente novamente.')
    expect(translateAuthError(null, 'signUp')).toBe('Não foi possível criar a conta. Tente novamente.')
  })

  it('nunca mostra o texto técnico em inglês ao usuário', () => {
    const text = translateAuthError({ code: 'xyz', message: 'Some internal Supabase failure' }, 'signIn')
    expect(text).not.toContain('Supabase')
    expect(text).not.toContain('internal')
  })
})

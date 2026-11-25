import { describe, expect, it } from 'vitest'
import { buildRedirectUrl, parseAuthUrl } from './recovery'

describe('buildRedirectUrl (para onde o link do e-mail volta)', () => {
  it('desenvolvimento: localhost com base "/"', () => {
    expect(buildRedirectUrl('http://localhost:5173', '/')).toBe('http://localhost:5173/')
  })

  it('GitHub Pages: respeita o base "/Estudo/"', () => {
    expect(buildRedirectUrl('https://nery027.github.io', '/Estudo/')).toBe(
      'https://nery027.github.io/Estudo/',
    )
  })

  it('base sem a barra final ganha a barra', () => {
    expect(buildRedirectUrl('https://nery027.github.io', '/Estudo')).toBe(
      'https://nery027.github.io/Estudo/',
    )
  })

  it('base sem a barra inicial também funciona', () => {
    expect(buildRedirectUrl('https://nery027.github.io', 'Estudo/')).toBe(
      'https://nery027.github.io/Estudo/',
    )
  })

  it('origem com barra sobrando não duplica barras', () => {
    expect(buildRedirectUrl('http://localhost:5173/', '/')).toBe('http://localhost:5173/')
  })
})

describe('parseAuthUrl (o que o link do e-mail trouxe)', () => {
  it('endereço normal: nada de recuperação e nenhum erro', () => {
    expect(parseAuthUrl('', '')).toEqual({ isRecovery: false, error: null })
  })

  it('link de recuperação válido (token no # e type=recovery)', () => {
    const hash = '#access_token=abc.def.ghi&expires_in=3600&refresh_token=xyz&token_type=bearer&type=recovery'
    expect(parseAuthUrl(hash, '')).toEqual({ isRecovery: true, error: null })
  })

  it('type=recovery sem o token NÃO conta como recuperação', () => {
    expect(parseAuthUrl('#type=recovery', '').isRecovery).toBe(false)
  })

  it('link de confirmação de cadastro (type=signup) não é recuperação', () => {
    const hash = '#access_token=abc&refresh_token=xyz&type=signup'
    expect(parseAuthUrl(hash, '').isRecovery).toBe(false)
  })

  it('link expirado: lê código e descrição do erro', () => {
    const hash =
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    expect(parseAuthUrl(hash, '')).toEqual({
      isRecovery: false,
      error: { code: 'otp_expired', description: 'Email link is invalid or has expired' },
    })
  })

  it('erro sem error_code usa o nome do erro como código', () => {
    expect(parseAuthUrl('#error=access_denied', '').error).toEqual({
      code: 'access_denied',
      description: '',
    })
  })

  it('erro vindo na parte "?" do endereço também é lido', () => {
    const search = '?error=access_denied&error_code=otp_expired&error_description=expired'
    expect(parseAuthUrl('', search).error?.code).toBe('otp_expired')
  })

  it('se há erro, nunca conta como recuperação', () => {
    const hash = '#access_token=abc&type=recovery&error=access_denied&error_code=otp_expired'
    expect(parseAuthUrl(hash, '').isRecovery).toBe(false)
  })

  it('aceita o hash com ou sem o # na frente', () => {
    expect(parseAuthUrl('error_code=otp_expired', '').error?.code).toBe('otp_expired')
  })
})

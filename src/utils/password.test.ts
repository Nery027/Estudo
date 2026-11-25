import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from './password'

describe('validateNewPassword (nova senha e confirmação)', () => {
  it('aceita senha de 6 caracteres igual nos dois campos', () => {
    expect(validateNewPassword('abc123', 'abc123')).toBeNull()
  })

  it('aceita senhas longas, com símbolos e acentos', () => {
    const senha = 'Minha senha é bem longa! #2026 ção'
    expect(validateNewPassword(senha, senha)).toBeNull()
  })

  it('o mínimo é 6 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6)
    expect(validateNewPassword('12345', '12345')).toBe(
      'A nova senha precisa ter no mínimo 6 caracteres.',
    )
    expect(validateNewPassword('123456', '123456')).toBeNull()
  })

  it('recusa senha vazia', () => {
    expect(validateNewPassword('', '')).toBe('Digite a nova senha.')
  })

  it('recusa senha só com espaços', () => {
    expect(validateNewPassword('      ', '      ')).toBe('A senha não pode ter só espaços.')
  })

  it('pede a confirmação quando ela está vazia', () => {
    expect(validateNewPassword('abc123', '')).toBe('Repita a nova senha para confirmar.')
  })

  it('recusa quando as senhas não são iguais', () => {
    expect(validateNewPassword('abc123', 'abc124')).toBe(
      'As senhas não são iguais. Digite a mesma senha nos dois campos.',
    )
  })

  it('diferença só de maiúscula/minúscula conta como senha diferente', () => {
    expect(validateNewPassword('Abc123', 'abc123')).not.toBeNull()
  })

  it('o erro de tamanho aparece antes do erro de confirmação', () => {
    expect(validateNewPassword('abc', 'xyz')).toBe(
      'A nova senha precisa ter no mínimo 6 caracteres.',
    )
  })

  it('espaço no começo ou no fim faz parte da senha', () => {
    expect(validateNewPassword(' abc123', 'abc123')).not.toBeNull()
    expect(validateNewPassword(' abc123 ', ' abc123 ')).toBeNull()
  })
})

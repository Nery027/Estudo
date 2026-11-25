// Regras de senha usadas no cadastro e na criação de nova senha.

export const MIN_PASSWORD_LENGTH = 6

// Confere a nova senha e a confirmação. Devolve a mensagem de erro em
// português, ou null se estiver tudo certo.
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password === '') return 'Digite a nova senha.'
  if (password.trim() === '') return 'A senha não pode ter só espaços.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A nova senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (confirmation === '') return 'Repita a nova senha para confirmar.'
  if (password !== confirmation) {
    return 'As senhas não são iguais. Digite a mesma senha nos dois campos.'
  }
  return null
}

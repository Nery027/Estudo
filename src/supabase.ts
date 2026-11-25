// Cliente do Supabase: o "telefone" que o app usa para falar com a nuvem.
import { createClient } from '@supabase/supabase-js'
import { parseAuthUrl } from './utils/recovery'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// false se o .env.local (ou os Secrets do GitHub) não foi preenchido.
// O App usa isso para mostrar um aviso claro em vez de quebrar.
export const supabaseConfigured = Boolean(url && anonKey)

// Lemos o endereço da página ANTES de criar o cliente, porque ele pode trazer o
// resultado do link do e-mail (recuperação de senha ou erro de link expirado).
export const initialUrlAuth = parseAuthUrl(window.location.hash, window.location.search)

// Link com erro: já guardamos o que precisamos, então limpamos o endereço para
// a mensagem não voltar toda vez que a página for recarregada.
if (initialUrlAuth.error) {
  window.history.replaceState(null, '', window.location.pathname)
}

// Valores de mentira quando não configurado, só para o createClient não dar erro
// ao importar o arquivo. Nesse caso o App nem chega a usar o cliente.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'nao-configurado', {
  auth: {
    // "implicit": o link do e-mail funciona em QUALQUER aparelho (pedir a
    // recuperação no PC e abrir o e-mail no celular). O outro modo (PKCE) só
    // funcionaria no mesmo navegador que pediu o link.
    flowType: 'implicit',
  },
})

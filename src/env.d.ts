/// <reference types="vite/client" />

// Variáveis de ambiente do app (definidas em .env.local ou nos Secrets do GitHub)
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

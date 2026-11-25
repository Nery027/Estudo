// Mostrada quando as chaves do Supabase não foram configuradas (em vez de quebrar).
export function ConfigMissingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-900">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">App ainda não conectado ao Supabase</h1>
        <p className="mt-2 text-sm text-slate-700">
          Faltam a URL e a chave do seu projeto Supabase.
        </p>

        <h2 className="mt-4 text-sm font-semibold">No seu computador</h2>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Abra o arquivo <code className="rounded bg-slate-100 px-1">.env.local</code> na pasta do
            projeto.
          </li>
          <li>
            Preencha <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> e{' '}
            <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code>.
          </li>
          <li>
            Pare o servidor (<code className="rounded bg-slate-100 px-1">Ctrl + C</code>) e rode de
            novo <code className="rounded bg-slate-100 px-1">npm run dev</code>.
          </li>
        </ol>

        <h2 className="mt-4 text-sm font-semibold">No site publicado (GitHub)</h2>
        <p className="mt-1 text-sm text-slate-700">
          Cadastre os mesmos dois valores em Settings → Secrets and variables → Actions, com os
          nomes acima, e publique de novo.
        </p>
      </div>
    </div>
  )
}

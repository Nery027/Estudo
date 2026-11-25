# Controle Financeiro Pessoal

App web de controle financeiro pessoal. O usuário é **iniciante em programação**.

## Regras de comunicação (para o Claude)

- Explique tudo em linguagem simples, passo a passo, sem jargão (ou explique o termo quando usar).
- Sempre diga **exatamente** quais comandos o usuário deve rodar, cada um em seu próprio bloco de código, e o que cada um faz.
- Antes de escrever código, explique brevemente o que será feito e por quê.
- Faça mudanças pequenas e incrementais; confirme que funciona antes de avançar.
- Não adicione bibliotecas fora da stack sem perguntar.

## Stack

- React + Vite + TypeScript
- Tailwind CSS (estilização)
- Recharts (gráficos)
- **Supabase** (`@supabase/supabase-js`): login (Supabase Auth, e-mail e senha) e banco de dados na nuvem (Postgres com RLS). Os dados sincronizam entre aparelhos. Não há servidor próprio: o app é um site estático que fala direto com o Supabase.
- O `localStorage` não guarda mais os dados do app. Serve só para ler dados antigos (importação única) e marcações pequenas; a sessão de login é guardada pela própria biblioteca do Supabase.

## Idioma e formato

- Interface 100% em **português do Brasil**.
- Moeda: **R$**, formatada com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Ex.: `R$ 1.234,56`.
- Datas no formato `dd/mm/aaaa`, usando `pt-BR`.
- Nomes de código (variáveis, funções, arquivos) em inglês; textos exibidos ao usuário em português.

## Login, contas e nuvem (Supabase)

- Ao abrir o app sem usuário logado, mostrar **somente** a tela de login (`LoginPage`); logado, mostrar o `Dashboard`. Sem as chaves do Supabase, mostrar `ConfigMissingScreen` (nunca quebrar).
- Cadastro: nome, e-mail e senha. Login: e-mail e senha. Tudo via **Supabase Auth** (`src/auth.ts`); o app nunca guarda nem vê hash de senha. Mensagens de erro sempre em português (`src/utils/authErrors.ts`); nunca mostrar texto técnico em inglês.
- Validações no app: e-mail válido (minúsculas) e senha com no mínimo 6 caracteres. Login errado sempre diz "E-mail ou senha incorretos.".
- Se o projeto Supabase exigir confirmação por e-mail, o app avisa para confirmar e volta para "Entrar" (funciona com a confirmação ligada ou desligada).
- Sessão: guardada pela biblioteca do Supabase e restaurada ao recarregar. O botão **Sair** encerra a sessão.
- **Tabelas** (`supabase/schema.sql`, rodar no SQL Editor; pode rodar de novo sem apagar dados): `profiles` (nome e foto), `transactions` (inclui parcelas), `recurrences`. Dinheiro em colunas **inteiras de centavos** (`amount_cents`).
- **RLS ligada** nas três tabelas: cada usuário só lê e grava as próprias linhas (`auth.uid()`). O perfil é criado por um gatilho no cadastro (o nome vai em `options.data`).
- Acesso ao banco só em `src/cloud.ts`; conversão linha↔objeto em `src/utils/rows.ts`. A tela atualiza na hora e as diferenças (`src/utils/ledgerDiff.ts`) vão ao banco numa fila; se falhar, avisa e recarrega da nuvem. Ao voltar para a aba, recarrega (sem tempo real). Última alteração vence.
- Leituras em páginas de 1.000 linhas (limite do Supabase).
- **Variáveis de ambiente:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local` (fora do Git, pois `*.local` é ignorado). `.env.example` é o modelo, sem segredos. A chave anon é pública por natureza (vai dentro do site); a proteção é a RLS. **Nunca** usar a chave `service_role` no app.
- **Foto de perfil** (opcional, coluna `profiles.photo`): só JPG, PNG ou WebP de até 2 MB. Antes de salvar, recortar o centro em quadrado e reduzir para no máximo 256x256 (JPEG), em `src/utils/image.ts`. Guardada como data URL. A foto escolhida no cadastro espera o primeiro login (`storage.ts`) e é enviada quando a pessoa entra.
- A foto sempre mostra prévia antes de confirmar. Dá para trocar e remover. Sem foto, mostrar círculo com as iniciais (`Avatar`).
- **Importação única** dos dados antigos do navegador (`ImportLocalDataBanner`): ids novos **calculados** (`src/utils/migration.ts`), então importar de novo nunca duplica; não apaga os dados locais; a senha antiga não migra (a pessoa cria a conta na nuvem). Contas locais antigas ficam em `financeiro:users` (só leitura).
- O app agora exige internet para carregar os dados.

### Recuperação de senha

- Na tela de login, o link **"Esqueci minha senha"** abre o modo `forgot` do `LoginPage` (campo de e-mail + "Enviar link de recuperação"). Chama `resetPasswordForEmail` (`requestPasswordReset` em `src/auth.ts`) com `redirectTo = buildRedirectUrl(window.location.origin, import.meta.env.BASE_URL)` (`src/utils/recovery.ts`): `http://localhost:5173/` em desenvolvimento e `https://nery027.github.io/Estudo/` no site publicado. Se o `base` do Vite mudar, o `redirectTo` acompanha sozinho.
- Em caso de sucesso, **sempre** a mesma mensagem: "Se este e-mail estiver cadastrado, você receberá um link em instantes." (nunca revelar se o e-mail existe). Só mostram erro: e-mail vazio/inválido, sem conexão e limite de envios.
- O cliente usa `flowType: 'implicit'` (`src/supabase.ts`) de propósito: o link funciona em outro aparelho (pedir no PC, abrir no celular). PKCE só funcionaria no mesmo navegador. Não trocar sem rever isso.
- O endereço da página é lido **antes** de criar o cliente (`initialUrlAuth`): `type=recovery` + `access_token` no `#` = link de recuperação; `error_code` = link com erro. Erro no endereço é limpo da barra (`history.replaceState`) para não voltar ao recarregar.
- Evento `PASSWORD_RECOVERY` (ou o endereço) liga `recovering` em `useAuth`; o `App` mostra `NewPasswordPage` **antes** do Dashboard (o link abre uma sessão, mas a senha ainda não foi escolhida). Senha nova + confirmação, mínimo 6 caracteres (`validateNewPassword`, `src/utils/password.ts`), chama `updateUser` (`updatePasswordUser`). Sucesso: aviso "Senha alterada!" e botão "Ir para o app".
- Link expirado/inválido: `LoginPage` abre direto em `forgot` com o aviso (`linkError`); na tela de nova senha, o botão "Pedir um novo link" faz o mesmo. Em `requestAnotherLink`, o aviso é guardado **antes** do `signOut` (senão o login nasce no modo errado).
- Traduções em `src/utils/authErrors.ts` (contextos `resetRequest` e `updatePassword`, `translateLinkError`, `isLinkExpiredError`). Limite de e-mails do Supabase: se a mensagem trouxer "after N seconds", mostra "aguarde N segundos"; senão, aviso para aguardar alguns minutos.
- Limitação conhecida do Supabase: o limite de 1 pedido por minuto vale por e-mail existente, então quem tentar muitas vezes pode inferir se o e-mail tem conta. O app em si nunca afirma isso.
- Painel do Supabase: Authentication → URL Configuration (Site URL e Redirect URLs com `https://nery027.github.io/Estudo/` e `http://localhost:5173/`) e o modelo "Reset Password" (Authentication → Emails) com `{{ .ConfirmationURL }}`.

## Parcelas e recorrências

- Formulário tem o campo **Repetir/Parcelar**: transação única, **parcelada** ou **recorrente fixa**.
- **Parcelada:** valor total + nº de parcelas (2 a 60) + data da 1ª parcela. O valor é dividido em centavos: cada parcela recebe o valor arredondado para baixo e a **última absorve a diferença** (100,00 em 3x = 33,33 + 33,33 + 33,34). Cria-se uma transação real por parcela, ligadas por `installment.groupId`. Título exibido: "Compra X (3/10)" (`itemTitle`).
- **Recorrente fixa:** guarda só a regra (`Recurrence`): valor mensal, início, fim opcional. As ocorrências são calculadas ao navegar pelos meses (nunca criar transações infinitas).
- **Dia 31:** o dia original fica guardado (`dayOfMonth`) e cada mês usa `min(dia, último dia do mês)`: 31/01 → 28/02 → 31/03. Nunca "encadear" a partir da data anterior já ajustada.
- **Editar/excluir** parcelas e recorrências sempre pergunta o alcance: *somente esta*, *esta e as próximas* ou *o grupo inteiro* (`Scope`). Excluir sempre pede confirmação. Em parcelas/recorrências a **data não é editável** (só em transação simples); só os campos alterados são aplicados.
- Recorrência "esta e as próximas": a regra antiga termina no mês anterior e uma nova começa no mês editado. "Somente este mês" vira uma exceção (`exceptions[aaaa-mm]`).
- Lista marca parcelas (💳 Parcelada) e recorrências (🔁 Recorrente).
- Recorrências ficam na tabela `recurrences` (por usuário, protegida por RLS).
- A lógica fica em `src/utils/schedule.ts` e `src/utils/ledger.ts` (funções puras, sem tela). Toda mudança nelas exige rodar `npm test`.

## Testes

- Vitest. Rodar com `npm test` (testes ao lado do código, em `*.test.ts`).
- Cobrem: divisão em centavos, meses de 28/29/30/31 dias, virada de ano, recorrências, criar/editar/excluir em cada alcance, conversão linha↔objeto (centavos inteiros), diff para o banco, preparação da importação, tradução de erros do login e da recuperação de senha, validação da nova senha, leitura do endereço do link e montagem do `redirectTo`.
- A parte que fala com o Supabase de verdade (`cloud.ts`, `auth.ts`, hooks) **não tem teste automático**: testar à mão contra um projeto real.

## Hospedagem (GitHub Pages)

- O app é um site estático: `npm run build` gera a pasta `dist`, publicada pelo GitHub Pages em `https://nery027.github.io/Estudo/`.
- `vite.config.ts` usa `base: '/Estudo/'` **só no build** (o `npm run dev` continua em `localhost:5173`). Se o repositório tiver outro nome, trocar `REPO_NAME` lá.
- Publicação automática: `.github/workflows/deploy.yml` roda `npm ci`, `npm test` e `npm run build` a cada push na `main`, e só publica se tudo passar.
- O build precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`: cadastrar como **Secrets** do repositório (Settings → Secrets and variables → Actions) com esses mesmos nomes. O workflow já os repassa ao `npm run build`. Sem eles, o site publicado mostra o aviso de "não conectado".
- No Supabase (Authentication → URL Configuration), a **Site URL** e as **Redirect URLs** devem incluir `https://nery027.github.io/Estudo/` e `http://localhost:5173`.
- Os dados ficam na nuvem (Supabase): celular e computador **sincronizam** pela mesma conta.
- O endereço do site é público, mas cada pessoa só enxerga os dados da própria conta (RLS).
- Projetos gratuitos do Supabase são pausados após cerca de uma semana sem uso (os dados não se perdem, mas é preciso reativar no painel).

## Regras de código

- TypeScript estrito: evitar `any`.
- Componentes funcionais React com hooks.
- Valores monetários guardados como **número inteiro em centavos** para evitar erros de arredondamento; converter só na hora de exibir.
- Todo acesso ao localStorage passa por um único módulo (`src/storage.ts`), com tratamento de erro caso os dados estejam corrompidos, e com chaves prefixadas (`financeiro:`). Todo acesso ao banco passa por `src/cloud.ts`.
- Lógica de parcelas, recorrências, diff e migração fica em funções puras (`src/utils/`), sem rede e sem tela, com testes.
- Estilos com classes do Tailwind; evitar CSS customizado.
- Interface responsiva (funcionar bem em celular e computador) e acessível (labels em campos, contraste adequado).
- Comentários curtos em português explicando o "porquê" quando não for óbvio.

## Estrutura planejada

```
src/
  components/   # peças reutilizáveis da interface
  pages/        # telas
  hooks/        # hooks personalizados
  types.ts      # tipos (ex.: Transaction)
  storage.ts    # leitura/gravação no localStorage
  utils/        # formatação de moeda/data, cálculos
```

## Comandos do projeto

```bash
npm install      # instala as dependências
npm run dev      # roda o app localmente (http://localhost:5173)
npm run build    # gera a versão final e checa erros de TypeScript
npm test         # roda os testes automáticos (Vitest)
```

## Status

- [x] Decisões e regras definidas (este arquivo)
- [x] Criar o projeto com Vite
- [x] Configurar Tailwind (v4, plugin `@tailwindcss/vite`) e instalar Recharts
- [x] Construir a primeira versão do app (adicionar/excluir transações, resumo do mês, navegação entre meses, gráfico de pizza por categoria, gráfico de barras de 6 meses)
- [x] Tela de login/cadastro local, sessão persistente, botão Sair, transações separadas por usuário
- [x] Foto de perfil (cadastro e "Meu perfil"), avatar redondo no cabeçalho
- [x] Despesas parceladas e recorrentes, com testes automáticos
- [x] Sincronização entre aparelhos com Supabase (Auth + tabelas com RLS + importação única dos dados locais)
- [x] Recuperação de senha por e-mail (Supabase Auth)
- [ ] Ideias futuras: atualização em tempo real entre aparelhos, PWA/offline,  editar transação, exportar/importar dados (backup), metas por categoria

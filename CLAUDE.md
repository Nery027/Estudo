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
- Dados salvos no **localStorage** do navegador (sem backend, sem banco de dados; o login é só local, veja a seção "Login e contas")

## Idioma e formato

- Interface 100% em **português do Brasil**.
- Moeda: **R$**, formatada com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Ex.: `R$ 1.234,56`.
- Datas no formato `dd/mm/aaaa`, usando `pt-BR`.
- Nomes de código (variáveis, funções, arquivos) em inglês; textos exibidos ao usuário em português.

## Login e contas (tudo local, sem servidor)

- Ao abrir o app sem usuário logado, mostrar **somente** a tela de login (`LoginPage`); logado, mostrar o `Dashboard`.
- Cadastro: nome, e-mail e senha. Login: e-mail e senha. Mensagens de erro em português.
- Validações: e-mail válido (guardado em minúsculas, único por conta) e senha com no mínimo 6 caracteres.
- **Nunca** guardar senha em texto puro. Usar Web Crypto (PBKDF2 com SHA-256) com salt aleatório por usuário; guardar só `salt` e `passwordHash`.
- Login com erro sempre diz "E-mail ou senha incorretos." (não revelar se o e-mail existe).
- Sessão = id do usuário logado em `financeiro:session`; o botão **Sair** apaga essa chave.
- Cada usuário só vê as próprias transações: chave `financeiro:transactions:<userId>`.
- Toda a lógica de contas fica em `src/auth.ts`; todo acesso ao localStorage continua só em `src/storage.ts`.
- **Foto de perfil** (opcional, campo `photo` do usuário): só JPG, PNG ou WebP de até 2 MB. Antes de salvar, recortar o centro em quadrado e reduzir para no máximo 256x256 (JPEG), em `src/utils/image.ts`. Guardada como data URL no próprio registro do usuário.
- A foto sempre mostra prévia antes de confirmar (no cadastro, ao criar a conta; em "Meu perfil", ao clicar em Salvar). Dá para trocar e remover. Sem foto, mostrar círculo com as iniciais (`Avatar`).
- Se o localStorage recusar a gravação (sem espaço), avisar o usuário em vez de fingir que salvou.
- Aviso: isso separa usuários, mas **não é segurança real** (os dados ficam no navegador). Segurança de verdade exigiria um servidor.
- Web Crypto só funciona em `localhost` ou HTTPS.

## Parcelas e recorrências

- Formulário tem o campo **Repetir/Parcelar**: transação única, **parcelada** ou **recorrente fixa**.
- **Parcelada:** valor total + nº de parcelas (2 a 60) + data da 1ª parcela. O valor é dividido em centavos: cada parcela recebe o valor arredondado para baixo e a **última absorve a diferença** (100,00 em 3x = 33,33 + 33,33 + 33,34). Cria-se uma transação real por parcela, ligadas por `installment.groupId`. Título exibido: "Compra X (3/10)" (`itemTitle`).
- **Recorrente fixa:** guarda só a regra (`Recurrence`): valor mensal, início, fim opcional. As ocorrências são calculadas ao navegar pelos meses (nunca criar transações infinitas).
- **Dia 31:** o dia original fica guardado (`dayOfMonth`) e cada mês usa `min(dia, último dia do mês)`: 31/01 → 28/02 → 31/03. Nunca "encadear" a partir da data anterior já ajustada.
- **Editar/excluir** parcelas e recorrências sempre pergunta o alcance: *somente esta*, *esta e as próximas* ou *o grupo inteiro* (`Scope`). Excluir sempre pede confirmação. Em parcelas/recorrências a **data não é editável** (só em transação simples); só os campos alterados são aplicados.
- Recorrência "esta e as próximas": a regra antiga termina no mês anterior e uma nova começa no mês editado. "Somente este mês" vira uma exceção (`exceptions[aaaa-mm]`).
- Lista marca parcelas (💳 Parcelada) e recorrências (🔁 Recorrente).
- Recorrências ficam em `financeiro:recurrences:<userId>` (por usuário).
- A lógica fica em `src/utils/schedule.ts` e `src/utils/ledger.ts` (funções puras, sem tela). Toda mudança nelas exige rodar `npm test`.

## Testes

- Vitest. Rodar com `npm test` (testes ao lado do código, em `*.test.ts`).
- Cobrem: divisão em centavos, meses de 28/29/30/31 dias, virada de ano, recorrências, criar/editar/excluir em cada alcance.

## Hospedagem (GitHub Pages)

- O app é um site estático: `npm run build` gera a pasta `dist`, publicada pelo GitHub Pages em `https://nery027.github.io/Estudo/`.
- `vite.config.ts` usa `base: '/Estudo/'` **só no build** (o `npm run dev` continua em `localhost:5173`). Se o repositório tiver outro nome, trocar `REPO_NAME` lá.
- Publicação automática: `.github/workflows/deploy.yml` roda `npm ci`, `npm test` e `npm run build` a cada push na `main`, e só publica se tudo passar.
- Os dados continuam no navegador de cada aparelho (localStorage): celular e computador **não sincronizam**. Sem backup, limpar os dados do navegador apaga tudo.
- O endereço é público, mas cada pessoa só vê os dados do próprio navegador.

## Regras de código

- TypeScript estrito: evitar `any`.
- Componentes funcionais React com hooks.
- Valores monetários guardados como **número inteiro em centavos** para evitar erros de arredondamento; converter só na hora de exibir.
- Todo acesso ao localStorage passa por um único módulo (ex.: `src/storage.ts`), com tratamento de erro caso os dados estejam corrompidos.
- Usar chave com prefixo para o localStorage (ex.: `financeiro:`).
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
- [ ] Ideias futuras: editar transação, exportar/importar dados (backup), metas por categoria

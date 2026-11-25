-- =====================================================================
-- Controle Financeiro: tabelas e regras de segurança (RLS)
--
-- Como usar: no painel do Supabase abra "SQL Editor" > "New query",
-- cole TUDO isto e clique em "Run".
-- Pode rodar de novo sem problema: não apaga dados já salvos.
--
-- Regra de ouro: dinheiro é guardado em CENTAVOS (número inteiro).
-- R$ 12,50 = 1250.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) PERFIL (nome e foto), uma linha por usuário
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  -- Foto pequena (256x256, JPEG) guardada como texto (data URL)
  photo text,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2) TRANSAÇÕES (inclui as parcelas de compras parceladas)
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  -- Dono da transação. Se não for informado, vira o usuário logado.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null,
  amount_cents integer not null check (amount_cents > 0),
  type text not null check (type in ('receita', 'despesa')),
  category text not null,
  date date not null,
  -- Preenchidos só nas parcelas: mesmo grupo = mesma compra
  installment_group_id uuid,
  installment_number integer,
  installment_total integer,
  created_at timestamptz not null default now(),
  -- Ou os três campos de parcela estão vazios, ou os três estão preenchidos
  constraint transactions_installment_check check (
    (installment_group_id is null and installment_number is null and installment_total is null)
    or
    (installment_group_id is not null
      and installment_number is not null
      and installment_total is not null
      and installment_number >= 1
      and installment_number <= installment_total)
  )
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date);


-- ---------------------------------------------------------------------
-- 3) RECORRÊNCIAS (aluguel, assinaturas...): guarda só a regra
-- ---------------------------------------------------------------------
create table if not exists public.recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null,
  amount_cents integer not null check (amount_cents > 0),
  type text not null check (type in ('receita', 'despesa')),
  category text not null,
  start_date date not null,
  -- Dia "de verdade" (ex.: 31). Meses curtos usam o último dia do mês.
  day_of_month smallint not null check (day_of_month between 1 and 31),
  end_date date, -- vazio = sem data final
  -- Mudanças só de um mês, ex.: {"2026-03": {"deleted": true}}
  exceptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint recurrences_end_after_start check (end_date is null or end_date >= start_date)
);

create index if not exists recurrences_user_idx
  on public.recurrences (user_id);


-- ---------------------------------------------------------------------
-- 4) SEGURANÇA (RLS): cada usuário só enxerga e mexe nos PRÓPRIOS dados
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.recurrences enable row level security;

-- Permissões básicas de tabela para quem está logado. A RLS (abaixo) é o que
-- limita cada pessoa às suas próprias linhas. Visitantes sem login ("anon") não têm acesso.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.recurrences to authenticated;

-- profiles: a linha do usuário é a que tem o mesmo id dele
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- transactions: só as linhas com user_id igual ao do usuário logado
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- recurrences: mesma regra
drop policy if exists "recurrences_select_own" on public.recurrences;
create policy "recurrences_select_own" on public.recurrences
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "recurrences_insert_own" on public.recurrences;
create policy "recurrences_insert_own" on public.recurrences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "recurrences_update_own" on public.recurrences;
create policy "recurrences_update_own" on public.recurrences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "recurrences_delete_own" on public.recurrences;
create policy "recurrences_delete_own" on public.recurrences
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------
-- 5) PERFIL AUTOMÁTICO: ao criar uma conta, cria a linha em "profiles"
--    com o nome informado no cadastro.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Esta função só deve rodar pelo gatilho abaixo, nunca chamada de fora
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 6) CONFERÊNCIA: deve mostrar as 3 tabelas com rls_ligada = true
-- ---------------------------------------------------------------------
select tablename as tabela, rowsecurity as rls_ligada
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'transactions', 'recurrences')
order by tablename;

-- =====================================================================
-- Meu Bolso · ATUALIZAÇÃO: parcelas, gasto fixo pago e limites por categoria
-- Rode uma vez no Supabase > SQL Editor > New query > Run.
-- (Editar, busca e evolução usam as tabelas que já existem.)
-- =====================================================================

-- ---------- Compras parceladas ----------
-- Cada parcela é um gasto normal, com a data no mês da sua fatura.
-- As parcelas de uma mesma compra têm o mesmo installment_group.
alter table public.daily_expenses add column if not exists installment_group uuid;
alter table public.daily_expenses add column if not exists installment_no int;
alter table public.daily_expenses add column if not exists installment_total int;
do $$ begin
  alter table public.daily_expenses add constraint daily_expenses_installment_check
    check (
      (installment_group is null and installment_no is null and installment_total is null)
      or (installment_group is not null and installment_total between 2 and 48 and installment_no between 1 and installment_total)
    );
exception when duplicate_object then null; end $$;
create index if not exists daily_expenses_installment_idx on public.daily_expenses (installment_group);

-- ---------- Gasto fixo pago ----------
-- Uma linha = aquele gasto fixo foi pago naquele mês/fatura ("period" = dia 1 do mês).
create table if not exists public.fixed_payments (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fixed_id uuid not null references public.fixed_expenses on delete cascade,
  period date not null check (extract(day from period) = 1),
  paid_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  created_at timestamptz not null default now(),
  primary key (fixed_id, period)
);
create index if not exists fixed_payments_user_idx on public.fixed_payments (user_id, period);

-- ---------- Limite por categoria ----------
create table if not exists public.category_budgets (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category text not null check (length(trim(category)) between 1 and 60),
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, category)
);

-- ---------- Permissões: cada um mexe só no seu; admin pode ler ----------
alter table public.fixed_payments enable row level security;
alter table public.category_budgets enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fixed_payments', 'category_budgets'] loop
    execute format('drop policy if exists "ver: dono ou admin" on public.%I', t);
    execute format('drop policy if exists "criar: dono" on public.%I', t);
    execute format('drop policy if exists "editar: dono" on public.%I', t);
    execute format('drop policy if exists "apagar: dono" on public.%I', t);
    execute format('create policy "ver: dono ou admin" on public.%I for select to authenticated using (user_id = auth.uid() or public.is_admin())', t);
    execute format('create policy "criar: dono" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "editar: dono" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "apagar: dono" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Só dá para marcar como pago um gasto fixo que é seu.
drop policy if exists "criar: dono" on public.fixed_payments;
create policy "criar: dono" on public.fixed_payments for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.fixed_expenses f where f.id = fixed_id and f.user_id = auth.uid()));

grant select, insert, update, delete on public.fixed_payments, public.category_budgets to authenticated;

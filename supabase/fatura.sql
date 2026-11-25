-- =====================================================================
-- Meu Bolso · ATUALIZAÇÃO: organizar por fatura do cartão (opcional por pessoa)
-- Rode uma vez no Supabase > SQL Editor > New query > Run.
-- =====================================================================

-- Dia de fechamento padrão da fatura. Vazio (null) = app mês a mês, como antes.
alter table public.profiles
  add column if not exists billing_close_day int check (billing_close_day between 1 and 31);

-- A pessoa só pode mudar o PRÓPRIO dia de fechamento (e nada mais do perfil).
create or replace function public.set_billing_close_day(dia int)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro';
  end if;
  if dia is not null and (dia < 1 or dia > 31) then
    raise exception 'Dia de fechamento inválido';
  end if;
  update public.profiles set billing_close_day = dia where id = auth.uid();
end;
$$;
revoke execute on function public.set_billing_close_day(int) from public, anon;
grant execute on function public.set_billing_close_day(int) to authenticated;

-- Data REAL em que uma fatura fechou, quando foi diferente do dia padrão.
-- "month" identifica a fatura (dia 1 do mês em que ela fecha).
create table if not exists public.invoice_closings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month date not null check (extract(day from month) = 1),
  close_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, month),
  check (close_date between month - 20 and (month + interval '1 month')::date + 19)
);

alter table public.invoice_closings enable row level security;

drop policy if exists "fatura: ver dono ou admin" on public.invoice_closings;
drop policy if exists "fatura: criar" on public.invoice_closings;
drop policy if exists "fatura: editar" on public.invoice_closings;
drop policy if exists "fatura: apagar" on public.invoice_closings;
create policy "fatura: ver dono ou admin" on public.invoice_closings
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "fatura: criar" on public.invoice_closings
  for insert to authenticated with check (user_id = auth.uid());
create policy "fatura: editar" on public.invoice_closings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "fatura: apagar" on public.invoice_closings
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.invoice_closings to authenticated;

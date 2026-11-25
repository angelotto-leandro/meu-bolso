-- =====================================================================
-- Meu Bolso · banco de dados (Supabase)
-- Cole TUDO no Supabase > SQL Editor > New query e clique em "Run".
-- Pode rodar só uma vez num projeto novo.
-- =====================================================================

-- ---------- Perfis (equivalente ao "User" do Base44) ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- A PRIMEIRA pessoa que criar conta vira admin. As outras entram como "user".
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when exists (select 1 from public.profiles) then 'user' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Tabelas ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.daily_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  category text,
  payment_method text not null check (payment_method in ('debito', 'credito', 'pix', 'dinheiro')),
  description text,
  created_at timestamptz not null default now()
);

create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text,
  due_day int not null check (due_day between 1 and 31),
  payment_method text check (payment_method in ('debito', 'credito', 'pix', 'dinheiro')),
  -- Primeiro e último mês em que o gasto conta (sempre o dia 1 do mês).
  start_month date not null default date_trunc('month', current_date)::date,
  end_month date,
  created_at timestamptz not null default now(),
  check (end_month is null or end_month >= start_month)
);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  source text not null check (source in ('salario', 'vale', 'freelancer', 'presente', 'outro')),
  date date not null,
  description text,
  created_at timestamptz not null default now()
);

create index on public.categories (user_id);
create index on public.daily_expenses (user_id, date);
create index on public.fixed_expenses (user_id);
create index on public.incomes (user_id, date);

-- ---------- Permissões (RLS) ----------
-- Cada pessoa vê e altera só o que criou. O admin consegue LER tudo.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.daily_expenses enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.incomes enable row level security;

create policy "perfil: ver o próprio ou admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "categorias: ver as próprias" on public.categories
  for select to authenticated using (user_id = auth.uid());
create policy "categorias: criar" on public.categories
  for insert to authenticated with check (user_id = auth.uid());
create policy "categorias: apagar" on public.categories
  for delete to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['daily_expenses', 'fixed_expenses', 'incomes'] loop
    execute format('create policy "ver: dono ou admin" on public.%I for select to authenticated using (user_id = auth.uid() or public.is_admin())', t);
    execute format('create policy "criar: dono" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "editar: dono" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "apagar: dono" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

grant select on public.profiles to authenticated;
grant select, insert, delete on public.categories to authenticated;
grant select, insert, update, delete on public.daily_expenses, public.fixed_expenses, public.incomes to authenticated;

-- ---------- Atalho do iPhone (Toque Atrás) ----------
-- Cada pessoa gera um código pessoal no app. Só o "hash" do código fica salvo.
create table public.shortcut_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now()
);
alter table public.shortcut_tokens enable row level security; -- sem políticas: ninguém lê direto

create function public.generate_shortcut_token()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare t text;
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro';
  end if;
  t := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.shortcut_tokens (user_id, token_hash)
  values (auth.uid(), sha256(convert_to(t, 'UTF8')))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now();
  return t;
end;
$$;

create function public.has_shortcut_token()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shortcut_tokens where user_id = auth.uid());
$$;

create function public.shortcut_user(p_token text)
returns uuid language sql stable security definer set search_path = '' as $$
  select user_id from public.shortcut_tokens
  where token_hash = sha256(convert_to(coalesce(trim(p_token), ''), 'UTF8'));
$$;

-- Lista de categorias que aparece no Atalho (padrão + as da pessoa).
create function public.atalho_categorias(token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := public.shortcut_user(token);
  padrao text[] := array['Alimentação', 'Transporte', 'Mercado', 'Lazer', 'Casa', 'Saúde', 'Educação', 'Serviços', 'Outros'];
begin
  if uid is null then
    return jsonb_build_array('⚠️ Código inválido: gere outro no app');
  end if;
  return (
    select jsonb_agg(n order by ord, n)
    from (
      select n, 0 as ord from unnest(padrao) with ordinality as p(n, i)
      union
      select c.name, 1 from public.categories c
      where c.user_id = uid and lower(c.name) <> all (select lower(x) from unnest(padrao) x)
    ) s
  );
end;
$$;

-- Lança um gasto vindo do Atalho. Sempre devolve uma mensagem de texto.
create function public.atalho_lancar(
  token text,
  valor text,
  data text default null,
  categoria text default null,
  pagamento text default null,
  descricao text default null
)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := public.shortcut_user(token);
  v_valor numeric;
  v_data date;
  v_txt text;
  v_pag text;
  v_cat text;
begin
  if uid is null then
    return '❌ Código do atalho inválido. Gere um novo no app (menu > Atalho do iPhone).';
  end if;

  -- Valor: aceita "25,90", "25.90", "R$ 1.234,56"
  v_txt := regexp_replace(coalesce(atalho_lancar.valor, ''), '[^0-9,.\-]', '', 'g');
  if v_txt like '%,%' then
    v_txt := replace(replace(v_txt, '.', ''), ',', '.');
  end if;
  begin
    v_valor := round(v_txt::numeric, 2);
  exception when others then
    return '❌ Valor inválido: ' || coalesce(atalho_lancar.valor, '(vazio)');
  end;
  if v_valor is null or v_valor <= 0 or v_valor >= 1000000000 then
    return '❌ Valor inválido: ' || coalesce(atalho_lancar.valor, '(vazio)');
  end if;

  -- Data: aceita "2026-11-23" ou "23/11/2026"; vazio = hoje
  v_txt := trim(coalesce(atalho_lancar.data, ''));
  begin
    if v_txt = '' then
      v_data := (now() at time zone 'America/Sao_Paulo')::date;
    elsif v_txt ~ '^\d{4}-\d{2}-\d{2}' then
      v_data := to_date(left(v_txt, 10), 'YYYY-MM-DD');
    elsif v_txt ~ '^\d{1,2}/\d{1,2}/\d{4}' then
      v_data := to_date(substring(v_txt from '^\d{1,2}/\d{1,2}/\d{4}'), 'DD/MM/YYYY');
    else
      return '❌ Data inválida: ' || v_txt || ' (use o formato aaaa-MM-dd no atalho)';
    end if;
  exception when others then
    return '❌ Data inválida: ' || v_txt;
  end;

  -- Forma de pagamento
  v_pag := translate(lower(trim(coalesce(atalho_lancar.pagamento, ''))), 'áàâãéêíóôõúç', 'aaaaeeiooouc');
  if v_pag not in ('debito', 'credito', 'pix', 'dinheiro') then
    return '❌ Forma de pagamento inválida: ' || coalesce(atalho_lancar.pagamento, '(vazio)');
  end if;

  -- Categoria
  v_cat := nullif(trim(coalesce(atalho_lancar.categoria, '')), '');
  if v_cat is null then
    v_cat := 'Outros';
  elsif v_cat like '⚠️%' then
    return '❌ Código do atalho inválido. Gere um novo no app.';
  end if;

  insert into public.daily_expenses (user_id, amount, date, category, payment_method, description)
  values (uid, v_valor, v_data, left(v_cat, 60), v_pag,
          nullif(left(trim(coalesce(atalho_lancar.descricao, '')), 200), ''));

  -- R$ no formato brasileiro: 1.234,56
  v_txt := translate(to_char(v_valor, 'FM999,999,990.00'), ',.', '.,');
  return '✅ R$ ' || v_txt || ' em ' || v_cat || ' (' || to_char(v_data, 'DD/MM') || ')';
end;
$$;

-- Quem pode chamar cada função
revoke execute on function public.shortcut_user(text) from public, anon, authenticated;
revoke execute on function public.generate_shortcut_token() from public, anon;
revoke execute on function public.has_shortcut_token() from public, anon;
grant execute on function public.generate_shortcut_token() to authenticated;
grant execute on function public.has_shortcut_token() to authenticated;
grant execute on function public.atalho_categorias(text) to anon, authenticated;
grant execute on function public.atalho_lancar(text, text, text, text, text, text) to anon, authenticated;

-- ---------- Atalho simplificado (mesmo conteúdo de supabase/atalho_simples.sql) ----------
-- Converte o valor: "25,90", "25.90", "1.234,56", "1,234.56", "R$ 10".
create or replace function public.atalho_parse_valor(p text)
returns numeric language plpgsql immutable set search_path = '' as $$
declare
  v text := regexp_replace(coalesce(p, ''), '[^0-9,.\-]', '', 'g');
  last_comma int;
  last_dot int;
begin
  last_comma := length(v) - strpos(reverse(v), ',') + 1;
  last_dot := length(v) - strpos(reverse(v), '.') + 1;
  if strpos(v, ',') > 0 and strpos(v, '.') > 0 then
    if last_comma > last_dot then
      v := replace(replace(v, '.', ''), ',', '.');      -- 1.234,56
    else
      v := replace(v, ',', '');                          -- 1,234.56
    end if;
  elsif strpos(v, ',') > 0 then
    v := replace(v, ',', '.');                           -- 25,90
  elsif v ~ '^\d{1,3}(\.\d{3})+$' then
    v := replace(v, '.', '');                            -- 1.234 (milhar)
  end if;
  return round(v::numeric, 2);
exception when others then
  return null;
end;
$$;

-- Converte a data em qualquer formato comum que o iPhone mande; vazio = hoje.
-- Ex.: "2026-11-23", "23/11/2026", "23 de nov. de 2026 14:32", "Nov 23, 2026".
create or replace function public.atalho_parse_data(p text)
returns date language plpgsql stable set search_path = '' as $$
declare
  v text := translate(lower(trim(coalesce(p, ''))), 'áàâãéêíóôõúç', 'aaaaeeiooouc');
  m text[];
  meses text[] := array['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  months text[] := array['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  mes int;
  ano int;
begin
  if v = '' then
    return (now() at time zone 'America/Sao_Paulo')::date;
  end if;

  m := regexp_match(v, '(\d{4})-(\d{1,2})-(\d{1,2})');
  if m is not null then
    return make_date(m[1]::int, m[2]::int, m[3]::int);
  end if;

  m := regexp_match(v, '(\d{1,2})/(\d{1,2})/(\d{2,4})');
  if m is not null then
    ano := m[3]::int;
    if ano < 100 then ano := ano + 2000; end if;
    return make_date(ano, m[2]::int, m[1]::int);
  end if;

  -- "23 de nov. de 2026" / "23 de novembro de 2026" / "23 nov 2026"
  m := regexp_match(v, '(\d{1,2})\s+(?:de\s+)?([a-z]{3})[a-z]*\.?\s+(?:de\s+)?(\d{4})');
  if m is not null then
    mes := coalesce(array_position(meses, m[2]), array_position(months, m[2]));
    if mes is not null then
      return make_date(m[3]::int, mes, m[1]::int);
    end if;
  end if;

  -- "nov 23, 2026" (iPhone em inglês)
  m := regexp_match(v, '([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})');
  if m is not null then
    mes := coalesce(array_position(months, m[1]), array_position(meses, m[1]));
    if mes is not null then
      return make_date(m[3]::int, mes, m[2]::int);
    end if;
  end if;

  return null;
exception when others then
  return null;
end;
$$;

-- Categorias da pessoa (padrão + as dela), usadas no Atalho.
create or replace function public.atalho_lista_categorias(uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with padrao(n, ord) as (
    select n, i from unnest(array['Alimentação', 'Transporte', 'Mercado', 'Lazer', 'Casa', 'Saúde', 'Educação', 'Serviços', 'Outros']) with ordinality as p(n, i)
  )
  select jsonb_agg(n order by grp, ord, n) from (
    select n, 0 as grp, ord from padrao
    union all
    select c.name, 1, 0 from public.categories c
    where c.user_id = uid and lower(c.name) not in (select lower(n) from padrao)
  ) s;
$$;

-- ENDEREÇO ÚNICO do Atalho.
--  * Sem "item": devolve a lista de opções (categorias para gasto, origens para ganho).
--  * Com "item", "valor" e "data": lança e devolve a mensagem para a notificação.
-- "tipo" é o que a pessoa escolheu na primeira lista: "Gasto no Pix", "Gasto no Débito",
-- "Gasto no Crédito", "Gasto em Dinheiro" ou "Ganho".
create or replace function public.atalho(
  token text,
  tipo text,
  item text default null,
  valor text default null,
  data text default null,
  descricao text default null
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := public.shortcut_user(token);
  t text := translate(lower(coalesce(atalho.tipo, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc');
  is_ganho boolean := t like '%ganho%' or t like '%receita%';
  pag text;
  v_valor numeric;
  v_data date;
  v_item text := nullif(trim(coalesce(atalho.item, '')), '');
  v_origem text;
  v_label text;
  v_txt text;
begin
  if uid is null then
    if v_item is null then
      return jsonb_build_array('⚠️ Código inválido: gere outro no app');
    end if;
    return to_jsonb('❌ Código do atalho inválido. Gere um novo no app (menu > Atalho do iPhone).'::text);
  end if;

  pag := case
    when t like '%pix%' then 'pix'
    when t like '%debito%' then 'debito'
    when t like '%credito%' then 'credito'
    when t like '%dinheiro%' then 'dinheiro'
  end;

  -- 1ª chamada: só a lista de opções
  if v_item is null then
    if is_ganho then
      return jsonb_build_array('Salário', 'Vale', 'Freelancer', 'Presente', 'Outro');
    end if;
    return public.atalho_lista_categorias(uid);
  end if;

  if v_item like '⚠️%' then
    return to_jsonb('❌ Código do atalho inválido. Gere um novo no app.'::text);
  end if;
  if not is_ganho and pag is null then
    return to_jsonb(('❌ Tipo não reconhecido: "' || coalesce(atalho.tipo, '') || '". Use Gasto no Pix, Gasto no Débito, Gasto no Crédito, Gasto em Dinheiro ou Ganho.')::text);
  end if;

  v_valor := public.atalho_parse_valor(atalho.valor);
  if v_valor is null or v_valor <= 0 or v_valor >= 1000000000 then
    return to_jsonb(('❌ Valor inválido: ' || coalesce(atalho.valor, '(vazio)'))::text);
  end if;

  v_data := public.atalho_parse_data(atalho.data);
  if v_data is null then
    return to_jsonb(('❌ Data não reconhecida: ' || coalesce(atalho.data, '(vazio)'))::text);
  end if;

  v_txt := translate(to_char(v_valor, 'FM999,999,990.00'), ',.', '.,');

  if is_ganho then
    v_origem := translate(lower(v_item), 'áàâãéêíóôõúç', 'aaaaeeiooouc');
    v_origem := case
      when v_origem like 'salario%' then 'salario'
      when v_origem like 'vale%' then 'vale'
      when v_origem like 'freela%' then 'freelancer'
      when v_origem like 'presente%' then 'presente'
      else 'outro'
    end;
    v_label := case v_origem when 'salario' then 'Salário' when 'vale' then 'Vale' when 'freelancer' then 'Freelancer'
                             when 'presente' then 'Presente' else 'Outro' end;
    insert into public.incomes (user_id, amount, source, date, description)
    values (uid, v_valor, v_origem, v_data, nullif(left(trim(coalesce(atalho.descricao, '')), 200), ''));
    return to_jsonb(('✅ Ganho de R$ ' || v_txt || ' (' || v_label || ', ' || to_char(v_data, 'DD/MM') || ')')::text);
  end if;

  insert into public.daily_expenses (user_id, amount, date, category, payment_method, description)
  values (uid, v_valor, v_data, left(v_item, 60), pag, nullif(left(trim(coalesce(atalho.descricao, '')), 200), ''));
  return to_jsonb(('✅ Gasto de R$ ' || v_txt || ' em ' || v_item || ' (' || to_char(v_data, 'DD/MM') || ')')::text);
end;
$$;

revoke execute on function public.atalho_parse_valor(text) from public, anon, authenticated;
revoke execute on function public.atalho_parse_data(text) from public, anon, authenticated;
revoke execute on function public.atalho_lista_categorias(uuid) from public, anon, authenticated;
grant execute on function public.atalho(text, text, text, text, text, text) to anon, authenticated;

-- ---------- Fatura do cartão (mesmo conteúdo de supabase/fatura.sql) ----------
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

-- ---------- Parcelas, gasto fixo pago e limites (mesmo conteúdo de supabase/novidades.sql) ----------
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

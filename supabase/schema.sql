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

-- ---------- Atalho: lançar GANHOS (mesmo conteúdo de supabase/atalho_ganho.sql) ----------
-- Converte o valor digitado: aceita "25,90", "25.90", "R$ 1.234,56".
create or replace function public.atalho_parse_valor(p text)
returns numeric language plpgsql immutable set search_path = '' as $$
declare v text := regexp_replace(coalesce(p, ''), '[^0-9,.\-]', '', 'g');
begin
  if v like '%,%' then
    v := replace(replace(v, '.', ''), ',', '.');
  end if;
  return round(v::numeric, 2);
exception when others then
  return null;
end;
$$;

-- Converte a data: aceita "2026-11-23" ou "23/11/2026"; vazio = hoje (horário de Brasília).
create or replace function public.atalho_parse_data(p text)
returns date language plpgsql stable set search_path = '' as $$
declare v text := trim(coalesce(p, ''));
begin
  if v = '' then
    return (now() at time zone 'America/Sao_Paulo')::date;
  elsif v ~ '^\d{4}-\d{2}-\d{2}' then
    return to_date(left(v, 10), 'YYYY-MM-DD');
  elsif v ~ '^\d{1,2}/\d{1,2}/\d{4}' then
    return to_date(substring(v from '^\d{1,2}/\d{1,2}/\d{4}'), 'DD/MM/YYYY');
  end if;
  return null;
exception when others then
  return null;
end;
$$;

-- Lança um GANHO vindo do Atalho. Sempre devolve uma mensagem de texto.
create or replace function public.atalho_ganho(
  token text,
  valor text,
  data text default null,
  origem text default null,
  descricao text default null
)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := public.shortcut_user(token);
  v_valor numeric := public.atalho_parse_valor(atalho_ganho.valor);
  v_data date := public.atalho_parse_data(atalho_ganho.data);
  v_origem text := translate(lower(trim(coalesce(atalho_ganho.origem, ''))), 'áàâãéêíóôõúç', 'aaaaeeiooouc');
  v_label text;
  v_txt text;
begin
  if uid is null then
    return '❌ Código do atalho inválido. Gere um novo no app (menu > Atalho do iPhone).';
  end if;
  if v_valor is null or v_valor <= 0 or v_valor >= 1000000000 then
    return '❌ Valor inválido: ' || coalesce(atalho_ganho.valor, '(vazio)');
  end if;
  if v_data is null then
    return '❌ Data inválida: ' || coalesce(atalho_ganho.data, '') || ' (use o formato aaaa-MM-dd no atalho)';
  end if;

  v_origem := case
    when v_origem = '' or v_origem like 'outro%' then 'outro'
    when v_origem like 'salario%' then 'salario'
    when v_origem like 'vale%' then 'vale'
    when v_origem like 'freela%' then 'freelancer'
    when v_origem like 'presente%' then 'presente'
    else null
  end;
  if v_origem is null then
    return '❌ Origem inválida: ' || atalho_ganho.origem || ' (use Salário, Vale, Freelancer, Presente ou Outro)';
  end if;
  v_label := case v_origem when 'salario' then 'Salário' when 'vale' then 'Vale' when 'freelancer' then 'Freelancer'
                           when 'presente' then 'Presente' else 'Outro' end;

  insert into public.incomes (user_id, amount, source, date, description)
  values (uid, v_valor, v_origem, v_data, nullif(left(trim(coalesce(atalho_ganho.descricao, '')), 200), ''));

  v_txt := translate(to_char(v_valor, 'FM999,999,990.00'), ',.', '.,');
  return '✅ Ganho de R$ ' || v_txt || ' (' || v_label || ', ' || to_char(v_data, 'DD/MM') || ')';
end;
$$;

revoke execute on function public.atalho_parse_valor(text) from public, anon, authenticated;
revoke execute on function public.atalho_parse_data(text) from public, anon, authenticated;
grant execute on function public.atalho_ganho(text, text, text, text, text) to anon, authenticated;

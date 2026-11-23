-- =====================================================================
-- Meu Bolso · ATUALIZAÇÃO: Atalho do iPhone simplificado (gasto ou ganho)
-- Rode uma vez no Supabase > SQL Editor > New query > Run.
-- Pode rodar mesmo que já tenha rodado o atalho_ganho.sql antes.
-- =====================================================================

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

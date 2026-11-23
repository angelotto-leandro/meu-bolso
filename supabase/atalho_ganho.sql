-- =====================================================================
-- Meu Bolso · ATUALIZAÇÃO: lançar GANHOS pelo Atalho do iPhone
-- Rode uma vez no Supabase > SQL Editor > New query > Run.
-- (Quem instalar do zero com o schema.sql já recebe isto.)
-- =====================================================================

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

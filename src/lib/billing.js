import { fmtDate, parseDate, monthStart, monthEnd, monthLabel } from '@/lib/format';

// ---------------------------------------------------------------------------
// Períodos do app.
// - Sem dia de fechamento: mês a mês (dia 1 ao último dia).
// - Com dia de fechamento: por fatura. A fatura "M" é a que FECHA no mês M.
//   Regra do cartão: compras feitas NO DIA do fechamento já entram na fatura seguinte.
//   Ex.: fecha dia 16 -> fatura de novembro = 16/out até 15/nov.
// "overrides" = { 'AAAA-MM-01': 'AAAA-MM-DD' } com as datas reais de fechamento,
// para os meses em que o banco fechou antes ou depois do dia padrão.
// ---------------------------------------------------------------------------

const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Data em que a fatura M fecha.
export function closingDate(monthDate, closeDay, overrides = {}) {
  const key = monthStart(monthDate);
  if (overrides[key]) return parseDate(overrides[key]);
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(closeDay, last));
}

// Fatura (mês M) em que cai uma data.
export function invoiceMonthFor(date, closeDay, overrides = {}) {
  let m = firstOfMonth(date);
  for (let i = 0; i < 3 && date >= closingDate(m, closeDay, overrides); i++) m = addMonths(m, 1);
  for (let i = 0; i < 3 && date < closingDate(addMonths(m, -1), closeDay, overrides); i++) m = addMonths(m, -1);
  return m;
}

const shortDay = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('. de ', '/').replace(' de ', '/').replace('.', '');
const shortMonthYear = (d) =>
  d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('. de ', '/').replace(' de ', '/').replace('.', '');

// Descreve o período que o app mostra para "monthDate".
export function getPeriod(monthDate, closeDay, overrides = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!closeDay) {
    return {
      mode: 'month',
      start: monthStart(monthDate),
      end: monthEnd(monthDate),
      label: monthLabel(monthDate),
      shortLabel: monthLabel(monthDate),
      noun: 'mês',
    };
  }

  const startD = closingDate(addMonths(monthDate, -1), closeDay, overrides);
  const closeD = closingDate(monthDate, closeDay, overrides);
  const endD = addDays(closeD, -1);
  const status = today < startD ? 'futura' : today >= closeD ? 'fechada' : 'aberta';
  const nome = shortMonthYear(monthDate);

  return {
    mode: 'invoice',
    start: fmtDate(startD),
    end: fmtDate(endD),
    closeDate: fmtDate(closeD),
    prevCloseDate: fmtDate(startD),
    nextCloseDate: fmtDate(closingDate(addMonths(monthDate, 1), closeDay, overrides)),
    isOverride: Boolean(overrides[monthStart(monthDate)]),
    status,
    label: `Fatura ${nome}`,
    shortLabel: `Fatura ${nome}`,
    range: `${shortDay(startD)} → ${shortDay(endD)}`,
    closeLabel: shortDay(closeD),
    noun: 'fatura',
  };
}

// Todos os dias do período, em ordem.
export function periodDays(period) {
  const days = [];
  let d = parseDate(period.start);
  const end = parseDate(period.end);
  while (d <= end && days.length < 62) {
    days.push(fmtDate(d));
    d = addDays(d, 1);
  }
  return days;
}

// Período inicial: o que contém hoje.
export function currentPeriodMonth(closeDay, overrides = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return closeDay ? invoiceMonthFor(today, closeDay, overrides) : firstOfMonth(today);
}

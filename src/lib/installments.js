import { fmtDate, parseDate, monthLabel } from '@/lib/format';
import { getPeriod, invoiceMonthFor } from '@/lib/billing';

// Mesma data N meses depois (31/jan + 1 mês = 28/fev).
export function addMonthsKeepDay(dateStr, n) {
  const d = parseDate(dateStr);
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return fmtDate(new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last)));
}

// Divide o total em N parcelas em centavos; a diferença do arredondamento vai na 1ª.
export function splitInstallments(total, n) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const rest = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? rest : 0)) / 100);
}

// Nome do período (fatura ou mês) em que uma data cai.
export function periodNameFor(dateStr, billing) {
  const d = parseDate(dateStr);
  if (billing?.closeDay) return getPeriod(invoiceMonthFor(d, billing.closeDay, billing.overrides), billing.closeDay, billing.overrides).label;
  return monthLabel(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function newGroupId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

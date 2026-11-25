import { fmtDate, formatBRL } from '@/lib/format';

// Data de vencimento de um gasto fixo no mês de referência (dia ajustado ao tamanho do mês).
export function fixedDueDate(expense, monthDate) {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(expense.due_day || 1, last));
}

const shortDate = (s) => {
  const [, m, d] = s.split('-');
  return `${d}/${m}`;
};

// Texto e tom da situação: pago, vencido, vence hoje/em breve, ou só o dia.
export function fixedStatus(expense, monthDate, paidOn) {
  if (paidOn) return { text: `Dia ${expense.due_day} · pago em ${shortDate(paidOn)}`, tone: 'paid' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = fixedDueDate(expense, monthDate);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { text: `Dia ${expense.due_day} · venceu há ${-days} ${-days === 1 ? 'dia' : 'dias'}`, tone: 'late' };
  if (days === 0) return { text: `Dia ${expense.due_day} · vence hoje`, tone: 'soon' };
  if (days <= 7) return { text: `Dia ${expense.due_day} · vence em ${days} ${days === 1 ? 'dia' : 'dias'}`, tone: 'soon' };
  return { text: `Dia ${expense.due_day}`, tone: 'normal' };
}

export function fixedTotals(fixedExpenses, paidMap) {
  let paid = 0;
  let open = 0;
  for (const e of fixedExpenses) {
    if (paidMap[e.id]) paid += Number(e.amount || 0);
    else open += Number(e.amount || 0);
  }
  return { paid, open, label: `Pago ${formatBRL(paid)} · falta ${formatBRL(open)}` };
}

export const todayStr = () => fmtDate(new Date());

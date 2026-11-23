export const formatBRL = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);

export const formatBRLShort = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1000) {
    return 'R$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v / 1000) + 'k';
  }
  return formatBRL(v);
};

// Aceita "25,90", "25.90" e "1.234,56" (teclado do iPhone em português usa vírgula).
export const parseAmount = (str) => {
  let s = String(str ?? '').replace(/[^0-9,.-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

export const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseDate = (str) => {
  const [y, m, dd] = str.split('-').map(Number);
  return new Date(y, m - 1, dd);
};

export const monthStart = (d) => fmtDate(new Date(d.getFullYear(), d.getMonth(), 1));
export const monthEnd = (d) => fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const monthLabel = (d) => cap(d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));

export const monthLabelShort = (d) =>
  d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

// "2026-11-01" -> "nov/2026"
export const monthOfLabel = (str) => {
  const d = parseDate(str);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('. de ', '/').replace(' de ', '/').replace('.', '');
};

export const dayLabel = (str) => {
  const d = parseDate(str);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export const weekdayLabel = (str) => {
  const d = parseDate(str);
  return d.toLocaleDateString('pt-BR', { weekday: 'short' });
};

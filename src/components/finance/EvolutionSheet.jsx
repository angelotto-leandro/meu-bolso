import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { supabase, unwrap } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatBRL, monthStart } from '@/lib/format';
import { getPeriod } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const shortK = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(v)));

// Gasto fixo conta no período se começou até aquele mês e não terminou antes dele.
const fixedActive = (f, key) => f.start_month <= key && (!f.end_month || f.end_month >= key);

export default function EvolutionSheet({ open, onOpenChange, monthDate, billing }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !user?.id || !monthDate) return;
    setData(null);
    setError('');
    const closeDay = billing?.closeDay;
    const ov = billing?.overrides || {};
    const months = [-5, -4, -3, -2, -1, 0].map((n) => addMonths(monthDate, n));
    const periods = months.map((m) => ({ m, key: monthStart(m), ...getPeriod(m, closeDay, ov) }));
    const future = [1, 2, 3].map((n) => addMonths(monthDate, n)).map((m) => ({ m, ...getPeriod(m, closeDay, ov) }));

    (async () => {
      try {
        const [daily, fixed, parcels] = await Promise.all([
          unwrap(supabase.from('daily_expenses').select('amount, date, category').eq('user_id', user.id).gte('date', periods[0].start).lte('date', periods[5].end)),
          unwrap(supabase.from('fixed_expenses').select('amount, category, start_month, end_month').eq('user_id', user.id)),
          supabase.from('daily_expenses').select('amount, date').eq('user_id', user.id).not('installment_group', 'is', null)
            .gte('date', future[0].start).lte('date', future[2].end).then((r) => r.data || []),
        ]);
        const bars = periods.map((p) => {
          const byCat = {};
          let total = 0;
          for (const e of daily) {
            if (e.date >= p.start && e.date <= p.end) {
              total += Number(e.amount);
              byCat[e.category || 'Outros'] = (byCat[e.category || 'Outros'] || 0) + Number(e.amount);
            }
          }
          for (const f of fixed) {
            if (fixedActive(f, p.key)) {
              total += Number(f.amount);
              const c = f.category || 'Gastos fixos';
              byCat[c] = (byCat[c] || 0) + Number(f.amount);
            }
          }
          return { label: MONTHS[p.m.getMonth()], name: p.label, total, byCat };
        });
        const committed = future.map((p) => ({
          name: p.label,
          total: parcels.filter((e) => e.date >= p.start && e.date <= p.end).reduce((s, e) => s + Number(e.amount), 0),
        }));
        setData({ bars, committed });
      } catch (e) {
        setError(e.message || 'Não foi possível carregar.');
      }
    })();
  }, [open, user?.id, monthDate, billing?.closeDay, billing?.overrides]);

  const isInvoice = !!billing?.closeDay;
  const noun = isInvoice ? 'fatura' : 'mês';
  let body = null;

  if (data) {
    const { bars, committed } = data;
    const cur = bars[5];
    const prev = bars[4];
    const max = Math.max(...bars.map((b) => b.total), 1);
    const withData = bars.filter((b) => b.total > 0);
    const avg = withData.length ? withData.reduce((s, b) => s + b.total, 0) / withData.length : 0;
    const top = bars.reduce((a, b) => (b.total > a.total ? b : a), bars[0]);
    const diffPct = prev.total > 0 ? ((cur.total - prev.total) / prev.total) * 100 : null;
    const cats = new Set([...Object.keys(cur.byCat), ...Object.keys(prev.byCat)]);
    const changes = [...cats]
      .map((c) => ({ c, before: prev.byCat[c] || 0, now: cur.byCat[c] || 0 }))
      .map((x) => ({ ...x, diff: x.now - x.before }))
      .filter((x) => Math.abs(x.diff) >= 0.01)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 5);
    const anyCommitted = committed.some((c) => c.total > 0);

    body = (
      <>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Gastos por {noun}</span>
            {diffPct !== null && (
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', diffPct > 0 ? 'bg-expense-soft text-expense' : 'bg-brand-soft text-brand')}>
                {diffPct > 0 ? '↑' : '↓'} {Math.abs(Math.round(diffPct))}% vs {prev.label}
              </span>
            )}
          </div>
          <div className="flex items-end gap-2 h-40 pt-3">
            {bars.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full min-w-0">
                <span className="text-[10px] font-semibold text-foreground tnum">{b.total ? shortK(b.total) : '–'}</span>
                <div className={cn('w-full rounded-t-md rounded-b-sm', i === 5 ? 'bg-brand' : 'bg-secondary')} style={{ height: `${Math.max(3, (b.total / max) * 100)}%` }} title={`${b.name}: ${formatBRL(b.total)}`} />
                <span className={cn('text-[10px]', i === 5 ? 'text-brand font-semibold' : 'text-muted-foreground')}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="label-eyebrow text-muted-foreground pt-2">O que mudou desde {isInvoice ? 'a fatura anterior' : 'o mês anterior'}</p>
        {changes.length === 0 && <p className="text-sm text-muted-foreground">Sem diferenças por categoria.</p>}
        {changes.map((x) => (
          <div key={x.c} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{x.c}</p>
              <p className="text-[11px] text-muted-foreground tnum">{formatBRL(x.before)} → {formatBRL(x.now)}</p>
            </div>
            <span className={cn('tnum text-sm font-semibold shrink-0', x.diff > 0 ? 'text-expense' : 'text-brand')}>
              {x.diff > 0 ? '↑' : '↓'} {formatBRL(Math.abs(x.diff))}
            </span>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Média ({withData.length} {withData.length === 1 ? noun : isInvoice ? 'faturas' : 'meses'} com gastos)</span><b className="tnum">{formatBRL(avg)}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Maior gasto</span><b className="tnum">{top.name} · {formatBRL(top.total)}</b></div>
        </div>

        {anyCommitted && (
          <>
            <p className="label-eyebrow text-muted-foreground pt-2">Já comprometido em parcelas</p>
            <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-1.5">
              {committed.map((c) => (
                <div key={c.name} className="flex justify-between"><span>{c.name}</span><b className="tnum">{formatBRL(c.total)}</b></div>
              ))}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn('p-0 flex flex-col', isMobile ? 'max-h-[92vh] rounded-t-2xl' : 'w-full sm:max-w-md')}>
        <SheetHeader className="p-4 pb-3 pr-12 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base font-display">Evolução</SheetTitle>
          <SheetDescription className="text-xs">{isInvoice ? 'Últimas 6 faturas' : 'Últimos 6 meses'} até {monthDate ? getPeriod(monthDate, billing?.closeDay, billing?.overrides || {}).label : ''}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 pb-safe">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!data && !error && (
            <div className="py-12 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
          )}
          {body}
        </div>
      </SheetContent>
    </Sheet>
  );
}

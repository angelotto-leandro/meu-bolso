import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { formatBRL, dayLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PaymentBadge, InstallmentTag } from '@/components/finance/PaymentBadge';
import { sourceMeta } from '@/components/finance/IncomeManager';
import PaidToggle from '@/components/finance/PaidToggle';
import { fixedStatus, fixedTotals } from '@/lib/fixed';

const META = {
  diarios: { title: 'Extrato de gastos diários', empty: 'Nenhum gasto diário neste período.' },
  fixas: { title: 'Despesas fixas', empty: 'Nenhuma despesa fixa neste período.' },
  receitas: { title: 'Receitas', empty: 'Nenhuma receita neste período.' },
};

export default function StatementSheet({
  open, onOpenChange, type, period, monthDate,
  dailyExpenses = [], fixedExpenses = [], incomes = [],
  paidMap = {}, togglePaid, onEdit,
}) {
  const meta = META[type] || META.diarios;

  const { items, total } = useMemo(() => {
    if (type === 'fixas') {
      const items = [...fixedExpenses].sort((a, b) => (a.due_day || 0) - (b.due_day || 0));
      return { items, total: items.reduce((s, e) => s + Number(e.amount || 0), 0) };
    }
    if (type === 'receitas') {
      const items = [...incomes].sort((a, b) => (a.date < b.date ? 1 : -1));
      return { items, total: items.reduce((s, e) => s + Number(e.amount || 0), 0) };
    }
    const items = [...dailyExpenses].sort((a, b) => (a.date < b.date ? 1 : -1));
    return { items, total: items.reduce((s, e) => s + Number(e.amount || 0), 0) };
  }, [type, dailyExpenses, fixedExpenses, incomes]);

  const isIncome = type === 'receitas';
  const isFixed = type === 'fixas';
  const totals = isFixed ? fixedTotals(fixedExpenses, paidMap) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 pr-12 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base font-display">{meta.title}</SheetTitle>
          <div className="flex items-center justify-between">
            <SheetDescription className="text-xs">{period.label}{period.range ? ` · ${period.range}` : ''}</SheetDescription>
            <span className={cn('tnum font-display font-bold', isIncome ? 'text-brand' : 'text-expense')}>{formatBRL(total)}</span>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isFixed && items.length > 0 && togglePaid && (
            <div className="rounded-xl border border-border bg-card p-3 mb-1">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Pago</span><b className="tnum text-brand">{formatBRL(totals.paid)}</b></div>
              <div className="flex justify-between text-xs mt-1"><span className="text-muted-foreground">Falta pagar</span><b className="tnum">{formatBRL(totals.open)}</b></div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-2">
                <div className="h-full bg-brand rounded-full" style={{ width: `${total ? (totals.paid / total) * 100 : 0}%` }} />
              </div>
            </div>
          )}
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{meta.empty}</p>}
          {items.map((e) => {
            const src = isIncome ? sourceMeta(e.source) : null;
            const st = isFixed ? fixedStatus(e, monthDate, paidMap[e.id]) : null;
            const paid = isFixed && !!paidMap[e.id];
            const editable = !isFixed && onEdit;
            return (
              <div
                key={e.id}
                onClick={editable ? () => onEdit({ kind: isIncome ? 'income' : 'expense', row: e }) : undefined}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border bg-card p-3',
                  st?.tone === 'late' ? 'border-expense-border' : 'border-border',
                  editable && 'cursor-pointer hover:border-brand/40 transition-colors'
                )}
              >
                {isFixed && togglePaid && <PaidToggle paid={paid} late={st.tone === 'late'} name={e.name} onToggle={() => togglePaid(e.id)} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {src && <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0', src.color)}>{src.label}</span>}
                    <span className="text-sm font-medium text-foreground truncate">{e.description || e.name || e.category || (isIncome ? 'Receita' : 'Gasto')}</span>
                    {!isIncome && <PaymentBadge method={e.payment_method} />}
                    <InstallmentTag entry={e} />
                  </div>
                  <p className={cn('text-xs mt-0.5', st?.tone === 'late' ? 'text-expense' : st?.tone === 'paid' ? 'text-brand' : 'text-muted-foreground')}>
                    {isFixed ? st.text : dayLabel(e.date)}
                    {!isIncome && e.category && (e.description || e.name) ? ` · ${e.category}` : ''}
                  </p>
                </div>
                <span className={cn('tnum text-sm font-semibold shrink-0', isIncome ? 'text-brand' : paid ? 'text-muted-foreground line-through' : 'text-expense')}>
                  {isIncome ? '+' : '-'} {formatBRL(e.amount)}
                </span>
              </div>
            );
          })}
          {!isFixed && onEdit && items.length > 0 && <p className="text-[11px] text-muted-foreground text-center pt-2">Toque num lançamento para editar.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

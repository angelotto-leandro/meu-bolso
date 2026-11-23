import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { formatBRL, monthLabel, dayLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PaymentBadge } from '@/components/finance/PaymentBadge';
import { sourceMeta } from '@/components/finance/IncomeManager';

const META = {
  diarios: { title: 'Extrato de gastos diários', empty: 'Nenhum gasto diário neste mês.' },
  fixas: { title: 'Despesas fixas', empty: 'Nenhuma despesa fixa neste mês.' },
  receitas: { title: 'Receitas do mês', empty: 'Nenhuma receita neste mês.' },
};

export default function StatementSheet({ open, onOpenChange, type, monthDate, dailyExpenses = [], fixedExpenses = [], incomes = [] }) {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 pr-12 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base font-display">{meta.title}</SheetTitle>
          <div className="flex items-center justify-between">
            <SheetDescription className="text-xs">{monthLabel(monthDate)}</SheetDescription>
            <span className={cn('tnum font-display font-bold', isIncome ? 'text-[#059669]' : 'text-rose-600')}>{formatBRL(total)}</span>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{meta.empty}</p>}
          {items.map((e) => {
            const src = type === 'receitas' ? sourceMeta(e.source) : null;
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {src && <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0', src.color)}>{src.label}</span>}
                    <span className="text-sm font-medium text-foreground truncate">{e.description || e.name || e.category || (isIncome ? 'Receita' : 'Gasto')}</span>
                    {type !== 'receitas' && <PaymentBadge method={e.payment_method} />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {type === 'fixas' ? `Todo dia ${e.due_day}` : dayLabel(e.date)}
                    {type !== 'receitas' && e.category && (e.description || e.name) ? ` · ${e.category}` : ''}
                  </p>
                </div>
                <span className={cn('tnum text-sm font-semibold shrink-0', isIncome ? 'text-[#059669]' : 'text-rose-600')}>
                  {isIncome ? '+' : '-'} {formatBRL(e.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

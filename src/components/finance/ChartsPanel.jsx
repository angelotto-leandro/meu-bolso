import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBRL, monthLabel } from '@/lib/format';
import { sourceMeta } from '@/components/finance/IncomeManager';
import { cn } from '@/lib/utils';

const EXPENSE_COLORS = ['#059669', '#3B82F6', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B'];
const INCOME_COLORS = ['#059669', '#06B6D4', '#8B5CF6', '#F59E0B', '#64748B'];

function BreakdownChart({ title, data, colors, emptyMessage, totalClass }) {
  const grandTotal = data.reduce((s, t) => s + t.total, 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="label-eyebrow text-muted-foreground">{title}</p>
        <span className="tnum text-xs font-semibold text-foreground">{formatBRL(grandTotal)}</span>
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{emptyMessage}</p>
      ) : (
        <>
          <div className="h-44 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="total" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2} strokeWidth={0}>
                  {data.map((t, i) => (
                    <Cell key={t.name} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5">
            {data.map((t, i) => {
              const pct = grandTotal > 0 ? (t.total / grandTotal) * 100 : 0;
              return (
                <div key={t.name}>
                  <div className="flex items-center justify-between gap-2 text-sm mb-1">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="truncate font-medium text-foreground">{t.name}</span>
                    </span>
                    <span className="tnum font-semibold text-foreground shrink-0">{formatBRL(t.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden ml-[18px]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }} />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
              <span className="font-display font-semibold text-foreground">Total</span>
              <span className={cn('tnum font-display font-bold', totalClass)}>{formatBRL(grandTotal)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ChartsPanel({ dailyExpenses, fixedExpenses, incomes, monthDate }) {
  const month = monthLabel(monthDate);

  const expenseTotals = useMemo(() => {
    const m = {};
    dailyExpenses.forEach((e) => {
      const c = e.category || 'Outros';
      m[c] = (m[c] || 0) + Number(e.amount || 0);
    });
    fixedExpenses.forEach((e) => {
      const c = e.category || 'Gastos fixos';
      m[c] = (m[c] || 0) + Number(e.amount || 0);
    });
    return Object.entries(m).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [dailyExpenses, fixedExpenses]);

  const incomeTotals = useMemo(() => {
    const m = {};
    incomes.forEach((e) => {
      const c = sourceMeta(e.source).label;
      m[c] = (m[c] || 0) + Number(e.amount || 0);
    });
    return Object.entries(m).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [incomes]);

  return (
    <div className="space-y-6">
      <BreakdownChart title="Gastos" data={expenseTotals} colors={EXPENSE_COLORS} emptyMessage={`Nenhum gasto em ${month}.`} totalClass="text-rose-600" />
      <div className="border-t border-border" />
      <BreakdownChart title="Ganhos" data={incomeTotals} colors={INCOME_COLORS} emptyMessage={`Nenhum ganho em ${month}.`} totalClass="text-[#059669]" />
    </div>
  );
}

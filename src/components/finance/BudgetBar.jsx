import React from 'react';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

const BAR = { ok: 'bg-brand', near: 'bg-[#F59E0B]', over: 'bg-expense' };
const TEXT = { ok: 'text-muted-foreground', near: 'text-[#B45309] dark:text-[#FBBF24]', over: 'text-expense' };

export function budgetNote(row) {
  if (row.tone === 'over') return `Passou ${formatBRL(row.spent - row.limit)} do limite`;
  return `${Math.round(row.pct)}% usado · restam ${formatBRL(row.limit - row.spent)}`;
}

// Uma linha de limite: nome, gasto / limite, barra e situação.
export default function BudgetBar({ row, compact, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-card',
        compact ? 'p-2.5' : 'p-3',
        row.tone === 'over' ? 'border-expense-border' : 'border-border',
        onClick && 'cursor-pointer hover:border-brand/40 transition-colors'
      )}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-foreground truncate">{row.category}</span>
        <span className="tnum shrink-0">
          <b className={row.tone === 'over' ? 'text-expense' : 'text-foreground'}>{formatBRL(row.spent)}</b>
          <span className="text-muted-foreground text-xs"> / {formatBRL(row.limit)}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-2">
        <div className={cn('h-full rounded-full', BAR[row.tone])} style={{ width: `${Math.min(100, row.pct)}%` }} />
      </div>
      {!compact && <p className={cn('text-[11px] mt-1.5', TEXT[row.tone])}>{budgetNote(row)}</p>}
    </div>
  );
}

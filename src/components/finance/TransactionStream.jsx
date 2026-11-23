import React from 'react';
import { PaymentBadge } from '@/components/finance/PaymentBadge';
import ConfirmDelete from '@/components/finance/ConfirmDelete';
import { formatBRL, dayLabel, weekdayLabel } from '@/lib/format';
import { Trash2, FilterX, Inbox } from 'lucide-react';

export default function TransactionStream({ dailyExpenses, selectedDate, onClearFilter, onDelete }) {
  const filtered = selectedDate ? dailyExpenses.filter((e) => e.date === selectedDate) : dailyExpenses;
  const sorted = [...filtered].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const groups = {};
  sorted.forEach((e) => {
    (groups[e.date] = groups[e.date] || []).push(e);
  });
  const dates = Object.keys(groups);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="font-display font-semibold text-foreground">Gastos diários</h3>
        {selectedDate && (
          <button onClick={onClearFilter} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <FilterX className="w-3.5 h-3.5" /> {dayLabel(selectedDate)} · limpar
          </button>
        )}
      </div>
      <div className="divide-y divide-border">
        {dates.length === 0 && (
          <div className="px-4 py-10 flex flex-col items-center gap-2 text-muted-foreground">
            <Inbox className="w-7 h-7 opacity-50" />
            <p className="text-sm">Nenhum lançamento neste período.</p>
          </div>
        )}
        {dates.map((date) => (
          <div key={date} className="px-4 py-2.5">
            <div className="mb-1">
              <span className="label-eyebrow text-muted-foreground capitalize">{weekdayLabel(date)} · {dayLabel(date)}</span>
            </div>
            <div className="space-y-0.5">
              {groups[date].map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{e.description || e.category || 'Gasto'}</span>
                      <PaymentBadge method={e.payment_method} />
                    </div>
                    {e.category && e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.category}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="tnum text-sm font-semibold text-rose-600">- {formatBRL(e.amount)}</span>
                    <ConfirmDelete
                      title="Excluir este gasto?"
                      description={`${e.description || e.category || 'Gasto'} · ${formatBRL(e.amount)} · ${dayLabel(e.date)}`}
                      onConfirm={() => onDelete(e.id)}
                    >
                      <button className="p-1 text-muted-foreground/60 hover:text-rose-500 transition-colors" aria-label="Excluir gasto">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </ConfirmDelete>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

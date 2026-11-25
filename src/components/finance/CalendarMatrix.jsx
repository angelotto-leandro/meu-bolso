import React from 'react';
import { cn } from '@/lib/utils';
import { fmtDate, parseDate } from '@/lib/format';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function heatLevel(total) {
  if (total <= 0) return 0;
  if (total < 80) return 1;
  if (total < 250) return 2;
  return 3;
}

const dotSize = { 1: 'w-1 h-1', 2: 'w-1.5 h-1.5', 3: 'w-2 h-2' };
const dotOpacity = { 1: 'opacity-40', 2: 'opacity-70', 3: 'opacity-100' };

// days = lista 'AAAA-MM-DD' do período (mês ou fatura)
export default function CalendarMatrix({ days, dailyExpenses, selectedDate, onSelectDate }) {
  const today = fmtDate(new Date());
  const startWeekday = days.length ? parseDate(days[0]).getDay() : 0;
  const crossesMonth = days.length > 0 && days[0].slice(0, 7) !== days[days.length - 1].slice(0, 7);

  const spendByDay = {};
  dailyExpenses.forEach((e) => {
    spendByDay[e.date] = (spendByDay[e.date] || 0) + Number(e.amount || 0);
  });

  const cells = [...Array(startWeekday).fill(null), ...days];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center label-eyebrow text-muted-foreground py-1.5">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((ds, i) => {
          if (ds === null) return <div key={i} />;
          const d = parseDate(ds);
          const spend = spendByDay[ds] || 0;
          const level = heatLevel(spend);
          const isSelected = selectedDate === ds;
          const isToday = today === ds;
          const showMonth = crossesMonth && (ds === days[0] || d.getDate() === 1);
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(isSelected ? null : ds)}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-colors',
                isSelected
                  ? 'bg-brand text-on-brand shadow-sm'
                  : isToday
                    ? 'bg-brand-soft text-brand ring-1 ring-brand/30'
                    : 'hover:bg-secondary text-foreground'
              )}
            >
              <span className="text-xs font-medium">
                {d.getDate()}
                {showMonth && <span className="ml-0.5 text-[10px] opacity-60">/{MONTHS[d.getMonth()]}</span>}
              </span>
              {level > 0 && (
                <span className={cn('rounded-full', isSelected ? 'bg-on-brand' : 'bg-brand', dotSize[level], !isSelected && dotOpacity[level])} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

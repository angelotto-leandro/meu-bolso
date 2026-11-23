import React from 'react';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/format';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function heatLevel(total) {
  if (total <= 0) return 0;
  if (total < 80) return 1;
  if (total < 250) return 2;
  return 3;
}

const dotSize = { 1: 'w-1 h-1', 2: 'w-1.5 h-1.5', 3: 'w-2 h-2' };
const dotOpacity = { 1: 'opacity-40', 2: 'opacity-70', 3: 'opacity-100' };

export default function CalendarMatrix({ monthDate, dailyExpenses, selectedDate, onSelectDate }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const today = fmtDate(new Date());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const spendByDay = {};
  dailyExpenses.forEach((e) => {
    spendByDay[e.date] = (spendByDay[e.date] || 0) + Number(e.amount || 0);
  });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center label-eyebrow text-muted-foreground py-1.5">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const ds = fmtDate(new Date(year, month, d));
          const spend = spendByDay[ds] || 0;
          const level = heatLevel(spend);
          const isSelected = selectedDate === ds;
          const isToday = today === ds;
          return (
            <button
              key={i}
              onClick={() => onSelectDate(isSelected ? null : ds)}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-colors',
                isSelected
                  ? 'bg-[#059669] text-white shadow-sm'
                  : isToday
                    ? 'bg-[#ECFDF5] text-[#059669] ring-1 ring-[#059669]/30'
                    : 'hover:bg-secondary text-foreground'
              )}
            >
              <span className="text-xs font-medium">{d}</span>
              {level > 0 && (
                <span className={cn('rounded-full', isSelected ? 'bg-white' : 'bg-[#059669]', dotSize[level], !isSelected && dotOpacity[level])} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import DailyExpenseForm from './DailyExpenseForm';
import FixedExpenseManager from './FixedExpenseManager';
import IncomeManager from './IncomeManager';
import { ReceiptText, Wallet } from 'lucide-react';

export default function EntryTabs({ fixedExpenses, incomes, onSaved, defaultDate, monthDate, periodLabel, paidMap, togglePaid, onEdit, customCategories = [] }) {
  const [tab, setTab] = useState('daily');
  return (
    <div className="space-y-3">
      <div className="flex p-1 gap-1 rounded-xl bg-secondary/60">
        <button
          onClick={() => setTab('daily')}
          className={cn('flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors', tab === 'daily' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          <ReceiptText className="w-4 h-4" /> Gasto Diário
        </button>
        <button
          onClick={() => setTab('fixed')}
          className={cn('flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors', tab === 'fixed' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          <Wallet className="w-4 h-4" /> Fixos & Receitas
        </button>
      </div>
      {tab === 'daily' ? (
        <DailyExpenseForm key={defaultDate} onSaved={onSaved} defaultDate={defaultDate} customCategories={customCategories} />
      ) : (
        <div className="space-y-5">
          <FixedExpenseManager fixedExpenses={fixedExpenses} onSaved={onSaved} monthDate={monthDate} periodLabel={periodLabel} paidMap={paidMap} togglePaid={togglePaid} customCategories={customCategories} />
          <div className="h-px bg-border" />
          <IncomeManager key={defaultDate} incomes={incomes} onSaved={onSaved} defaultDate={defaultDate} onEdit={onEdit} />
        </div>
      )}
    </div>
  );
}

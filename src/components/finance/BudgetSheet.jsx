import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BudgetBar from '@/components/finance/BudgetBar';
import { budgetRows, spendingByCategory } from '@/hooks/useBudgets';
import { allCategoryNames } from '@/lib/categories';
import { formatBRL, parseAmount, parseDate } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const toInput = (n) => String(Number(n).toFixed(2)).replace('.', ',');

// Formulário de um limite (novo ou editando).
function BudgetForm({ category, initial, categories, onSave, onRemove, onCancel }) {
  const [cat, setCat] = useState(category || categories[0] || '');
  const [amount, setAmount] = useState(initial ? toInput(initial) : '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const value = parseAmount(amount);

  const run = async (kind) => {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'save') await onSave(cat, value);
      else await onRemove(cat);
    } catch (e) {
      setError(e.message || 'Não foi possível salvar.');
      setBusy('');
    }
  };

  return (
    <div className="rounded-xl border border-brand/40 bg-card p-3 space-y-2.5">
      {category ? (
        <p className="text-sm font-semibold text-foreground">{category}</p>
      ) : (
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      <div>
        <p className="label-eyebrow text-muted-foreground mb-1">Limite por período</p>
        <Input autoFocus type="text" inputMode="decimal" placeholder="Ex.: 800,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 tnum" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={() => run('save')} disabled={!!busy || !(value > 0) || !cat} className="flex-1 bg-brand hover:bg-brand-strong text-on-brand">
          {busy === 'save' && <Loader2 className="animate-spin" />} Salvar
        </Button>
        {category && (
          <Button type="button" variant="outline" onClick={() => run('remove')} disabled={!!busy} className="text-expense" aria-label="Remover limite">
            {busy === 'remove' ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel} disabled={!!busy}>Cancelar</Button>
      </div>
    </div>
  );
}

export default function BudgetSheet({ open, onOpenChange, budgetsApi, dailyExpenses, fixedExpenses, period, customCategories = [] }) {
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState(null); // categoria | 'new' | null
  const { budgets, available, setBudget, removeBudget } = budgetsApi;
  const rows = budgetRows(budgets, spendingByCategory(dailyExpenses, fixedExpenses));
  const free = allCategoryNames(customCategories).filter((c) => !(c in budgets));
  const totalLimit = rows.reduce((s, r) => s + r.limit, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);

  let daysLeft = null;
  if (period?.status !== 'fechada' && period?.end) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseDate(period.end);
    if (end >= today) daysLeft = Math.round((end - today) / 86400000) + 1;
  }

  const done = () => setEditing(null);

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) done(); }}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn('p-0 flex flex-col', isMobile ? 'max-h-[92vh] rounded-t-2xl' : 'w-full sm:max-w-md')}>
        <SheetHeader className="p-4 pb-3 pr-12 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base font-display">Limites por categoria</SheetTitle>
          <SheetDescription className="text-xs">
            {period?.label}
            {daysLeft ? ` · ${daysLeft === 1 ? 'último dia' : `faltam ${daysLeft} dias`}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 pb-safe">
          {!available && (
            <p className="text-sm text-destructive">O banco ainda não foi atualizado. Rode o arquivo novidades.sql no Supabase (SQL Editor).</p>
          )}
          {available && rows.length === 0 && editing !== 'new' && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Defina quanto quer gastar em cada categoria por {period?.mode === 'invoice' ? 'fatura' : 'mês'}. A barra fica amarela perto do limite e vermelha quando passa.
            </p>
          )}

          {rows.map((r) =>
            editing === r.category ? (
              <BudgetForm
                key={r.category}
                category={r.category}
                initial={r.limit}
                categories={[]}
                onSave={async (c, v) => { await setBudget(c, v); done(); }}
                onRemove={async (c) => { await removeBudget(c); done(); }}
                onCancel={done}
              />
            ) : (
              <BudgetBar key={r.category} row={r} onClick={() => setEditing(r.category)} />
            )
          )}

          {available && (editing === 'new' ? (
            <BudgetForm
              categories={free}
              onSave={async (c, v) => { await setBudget(c, v); done(); }}
              onCancel={done}
            />
          ) : free.length > 0 && (
            <button
              onClick={() => setEditing('new')}
              className="w-full rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:border-brand/40 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Definir limite para uma categoria
            </button>
          ))}

          {rows.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3 text-xs space-y-1 mt-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Total dos limites</span><b className="tnum">{formatBRL(totalLimit)}</b></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usado até agora</span>
                <b className="tnum">{formatBRL(totalSpent)} ({totalLimit ? Math.round((totalSpent / totalLimit) * 100) : 0}%)</b>
              </div>
            </div>
          )}
          {rows.length > 0 && <p className="text-[11px] text-muted-foreground text-center">Toque num limite para mudar o valor ou remover.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

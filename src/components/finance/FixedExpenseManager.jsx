import React, { useState } from 'react';
import { supabase, unwrap } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { PaymentBadge, PAYMENT_METHODS, PAYMENT_ORDER } from '@/components/finance/PaymentBadge';
import { formatBRL, parseAmount, monthStart, monthLabel, monthOfLabel } from '@/lib/format';
import { allCategoryNames } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { Trash2, Plus, Loader2 } from 'lucide-react';

export function fixedPeriodLabel(e) {
  if (e.end_month) return `${monthOfLabel(e.start_month)} até ${monthOfLabel(e.end_month)}`;
  return `desde ${monthOfLabel(e.start_month)}`;
}

function RemoveFixedDialog({ expense, monthDate, periodLabel, onDone }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const thisMonth = monthStart(monthDate);
  const canEnd = !expense.end_month || expense.end_month > thisMonth;

  const run = async (kind) => {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'end') {
        await unwrap(supabase.from('fixed_expenses').update({ end_month: thisMonth }).eq('id', expense.id));
      } else {
        await unwrap(supabase.from('fixed_expenses').delete().eq('id', expense.id));
      }
      setOpen(false);
      onDone?.();
    } catch (e) {
      setError(e.message || 'Não foi possível concluir.');
    } finally {
      setBusy('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button className="text-muted-foreground hover:text-expense transition-colors p-1" aria-label={`Remover ${expense.name}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover “{expense.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Escolha como remover. Encerrar mantém o histórico dos meses anteriores.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2">
          {canEnd && (
            <Button onClick={() => run('end')} disabled={!!busy} className="h-auto py-2.5 flex-col items-start gap-0.5 bg-brand hover:bg-brand-strong whitespace-normal text-left">
              <span className="flex items-center gap-2">{busy === 'end' && <Loader2 className="animate-spin" />}Encerrar em {periodLabel || monthLabel(monthDate)}</span>
              <span className="text-[11px] font-normal opacity-90">Conta até aqui e some a partir do próximo período.</span>
            </Button>
          )}
          <Button variant="outline" onClick={() => run('delete')} disabled={!!busy} className="h-auto py-2.5 flex-col items-start gap-0.5 text-expense hover:text-expense/80 whitespace-normal text-left">
            <span className="flex items-center gap-2">{busy === 'delete' && <Loader2 className="animate-spin" />}Excluir de vez</span>
            <span className="text-[11px] font-normal text-muted-foreground">Some de todos os meses. Use se foi cadastrado por engano.</span>
          </Button>
          <AlertDialogCancel className="mt-1">Cancelar</AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function FixedExpenseManager({ fixedExpenses, onSaved, monthDate, periodLabel, customCategories = [] }) {
  const allCategories = allCategoryNames(customCategories);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('debito');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = parseAmount(amount);
  const day = Number(dueDay);
  const valid = name.trim() && value > 0 && day >= 1 && day <= 31;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await unwrap(
        supabase.from('fixed_expenses').insert({
          name: name.trim(),
          amount: value,
          due_day: day,
          category: category || null,
          payment_method: paymentMethod,
          start_month: monthStart(monthDate),
        })
      );
      setName('');
      setAmount('');
      setDueDay('');
      setCategory('');
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const total = fixedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-semibold text-foreground text-sm">Gastos Fixos</h4>
        <span className="tnum text-xs text-muted-foreground">{formatBRL(total)}</span>
      </div>
      <div className="space-y-1">
        {fixedExpenses.length === 0 && <p className="text-xs text-muted-foreground py-1">Nenhum gasto fixo neste período.</p>}
        {fixedExpenses.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">Dia {e.due_day}</span>
                <PaymentBadge method={e.payment_method} />
                {e.category && <span className="text-[11px] text-muted-foreground">{e.category}</span>}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{fixedPeriodLabel(e)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="tnum text-sm font-semibold text-foreground">{formatBRL(e.amount)}</span>
              <RemoveFixedDialog expense={e} monthDate={monthDate} periodLabel={periodLabel} onDone={onSaved} />
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-2 rounded-lg border border-border p-3 bg-secondary/40">
        <Input placeholder="Nome (ex: Aluguel)" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
        <div className="grid grid-cols-2 gap-2">
          <Input type="text" inputMode="decimal" autoComplete="off" placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 tnum" />
          <Input type="number" inputMode="numeric" min="1" max="31" placeholder="Dia venc." value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="h-9 tnum" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Categoria (opcional)</p>
          <div className="flex gap-1.5 flex-wrap">
            {allCategories.map((c) => (
              <button type="button" key={c} onClick={() => setCategory(category === c ? '' : c)} className={cn('px-2 py-0.5 rounded-full text-[11px] border transition-colors', category === c ? 'bg-brand text-on-brand border-brand' : 'border-border text-muted-foreground hover:text-foreground')}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {PAYMENT_ORDER.map((m) => (
            <button type="button" key={m} onClick={() => setPaymentMethod(m)} className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors', paymentMethod === m ? cn(PAYMENT_METHODS[m].bg, PAYMENT_METHODS[m].text, 'border-transparent') : 'border-border text-muted-foreground hover:text-foreground')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', PAYMENT_METHODS[m].dot)} />{PAYMENT_METHODS[m].label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Passa a contar a partir de <span>{periodLabel || monthLabel(monthDate)}</span>.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={saving || !valid} className="w-full h-9 bg-brand hover:bg-brand-strong">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Adicionar fixo</>}
        </Button>
      </form>
    </div>
  );
}

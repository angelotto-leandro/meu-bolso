import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, unwrap } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatBRL, parseAmount, dayLabel } from '@/lib/format';
import { allCategoryNames } from '@/lib/categories';
import { PAYMENT_METHODS, PAYMENT_ORDER } from '@/components/finance/PaymentBadge';
import { SOURCES } from '@/components/finance/IncomeManager';
import { cn } from '@/lib/utils';
import { Loader2, Trash2 } from 'lucide-react';

const toInput = (n) => (n == null ? '' : String(Number(n).toFixed(2)).replace('.', ','));

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs border transition-colors',
            value === o.value ? 'bg-brand text-on-brand border-brand font-semibold' : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Exclusão: gasto/receita comum pergunta uma vez; parcela pergunta se é só ela ou a compra toda.
function DeleteButton({ entry, onDone }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const row = entry.row;
  const isInstallment = entry.kind === 'expense' && row.installment_group;
  const table = entry.kind === 'expense' ? 'daily_expenses' : 'incomes';

  const run = async (all) => {
    setBusy(all ? 'all' : 'one');
    setError('');
    try {
      const q = supabase.from(table).delete();
      await unwrap(all ? q.eq('installment_group', row.installment_group) : q.eq('id', row.id));
      setOpen(false);
      onDone();
    } catch (e) {
      setError(e.message || 'Não foi possível excluir.');
    } finally {
      setBusy('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full h-11 text-expense hover:text-expense hover:bg-expense-soft hover:border-expense-border">
          <Trash2 /> Excluir {entry.kind === 'expense' ? 'gasto' : 'receita'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isInstallment ? 'Excluir parcela?' : `Excluir ${entry.kind === 'expense' ? 'este gasto' : 'esta receita'}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {isInstallment
              ? `Esta é a parcela ${row.installment_no}/${row.installment_total} de “${row.description || row.category}”.`
              : `${row.description || row.category || 'Lançamento'} · ${formatBRL(row.amount)} · ${dayLabel(row.date)}. Não dá para desfazer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2">
          {isInstallment && (
            <Button variant="destructive" onClick={() => run(true)} disabled={!!busy}>
              {busy === 'all' && <Loader2 className="animate-spin" />} Excluir a compra toda ({row.installment_total} parcelas)
            </Button>
          )}
          <Button variant={isInstallment ? 'outline' : 'destructive'} onClick={() => run(false)} disabled={!!busy}>
            {busy === 'one' && <Loader2 className="animate-spin" />} {isInstallment ? 'Excluir só esta parcela' : 'Excluir'}
          </Button>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// entry = { kind: 'expense' | 'income', row }
export default function EditEntrySheet({ entry, onOpenChange, customCategories = [], onSaved }) {
  const isMobile = useIsMobile();
  const open = !!entry;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [payment, setPayment] = useState('pix');
  const [source, setSource] = useState('salario');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entry) return;
    const r = entry.row;
    setAmount(toInput(r.amount));
    setDate(r.date);
    setCategory(r.category || 'Outros');
    setPayment(r.payment_method || 'pix');
    setSource(r.source || 'outro');
    setDescription(r.description || '');
    setError('');
  }, [entry]);

  if (!entry) return null;
  const isExpense = entry.kind === 'expense';
  const row = entry.row;
  const value = parseAmount(amount);
  const valid = value > 0 && date;

  const categories = allCategoryNames(customCategories);
  if (category && !categories.includes(category)) categories.push(category);

  const close = () => onOpenChange(false);
  const done = () => {
    close();
    onSaved?.();
  };

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      if (isExpense) {
        await unwrap(
          supabase.from('daily_expenses').update({
            amount: value, date, category: category || 'Outros', payment_method: payment, description: description.trim() || null,
          }).eq('id', row.id)
        );
      } else {
        await unwrap(
          supabase.from('incomes').update({ amount: value, date, source, description: description.trim() || null }).eq('id', row.id)
        );
      }
      done();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn('p-0 flex flex-col', isMobile ? 'max-h-[92vh] rounded-t-2xl' : 'w-full sm:max-w-md')}
      >
        <SheetHeader className="p-4 pb-3 pr-12 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base font-display">{isExpense ? 'Editar gasto' : 'Editar receita'}</SheetTitle>
          <SheetDescription className="text-xs">
            {row.installment_group
              ? `Parcela ${row.installment_no}/${row.installment_total} · as mudanças valem só para esta parcela`
              : 'Corrija o que precisar e toque em Salvar.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={save} className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-amount" className="label-eyebrow text-muted-foreground mb-1.5 block">Valor</Label>
              <Input id="edit-amount" type="text" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 tnum text-lg font-semibold" />
            </div>
            <div>
              <Label htmlFor="edit-date" className="label-eyebrow text-muted-foreground mb-1.5 block">Data</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 tnum" />
            </div>
          </div>

          {isExpense ? (
            <>
              <div>
                <p className="label-eyebrow text-muted-foreground mb-1.5">Categoria</p>
                <Chips options={categories.map((c) => ({ value: c, label: c }))} value={category} onChange={setCategory} />
              </div>
              <div>
                <p className="label-eyebrow text-muted-foreground mb-1.5">Forma de pagamento</p>
                <Chips options={PAYMENT_ORDER.map((m) => ({ value: m, label: PAYMENT_METHODS[m].label }))} value={payment} onChange={setPayment} />
              </div>
            </>
          ) : (
            <div>
              <p className="label-eyebrow text-muted-foreground mb-1.5">Origem</p>
              <Chips options={SOURCES.map((s) => ({ value: s.key, label: s.label }))} value={source} onChange={setSource} />
            </div>
          )}

          <div>
            <Label htmlFor="edit-desc" className="label-eyebrow text-muted-foreground mb-1.5 block">Descrição</Label>
            <Input id="edit-desc" placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)} className="h-11" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving || !valid} className="w-full h-12 bg-brand hover:bg-brand-strong text-on-brand font-semibold">
            {saving ? <Loader2 className="animate-spin" /> : 'Salvar alterações'}
          </Button>
          <DeleteButton entry={entry} onDone={done} />
        </form>
      </SheetContent>
    </Sheet>
  );
}

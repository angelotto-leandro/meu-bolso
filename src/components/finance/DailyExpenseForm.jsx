import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, unwrap } from '@/lib/supabase';
import { PAYMENT_METHODS, PAYMENT_ORDER } from '@/components/finance/PaymentBadge';
import { fmtDate, parseAmount, formatBRL } from '@/lib/format';
import { addMonthsKeepDay, splitInstallments, periodNameFor, newGroupId } from '@/lib/installments';
import { allCategoryNames } from '@/lib/categories';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, Check, Minus, Plus } from 'lucide-react';

export default function DailyExpenseForm({ onSaved, defaultDate, customCategories = [], billing }) {
  const allCategories = allCategoryNames(customCategories);
  const [date, setDate] = useState(defaultDate ? new Date(defaultDate + 'T00:00:00') : new Date());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState('');
  const [installments, setInstallments] = useState(false);
  const [count, setCount] = useState(2);

  const value = parseAmount(amount);
  const parcelado = installments && paymentMethod === 'credito';
  const valid = value > 0 && (!parcelado || value / count >= 0.01);
  const parts = parcelado && value > 0 ? splitInstallments(value, count) : [];
  const firstDate = fmtDate(date);
  const lastDate = parcelado ? addMonthsKeepDay(firstDate, count - 1) : firstDate;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      if (parcelado) {
        const group = newGroupId();
        await unwrap(
          supabase.from('daily_expenses').insert(
            parts.map((amt, i) => ({
              amount: amt,
              date: addMonthsKeepDay(firstDate, i),
              category: category || 'Outros',
              payment_method: 'credito',
              description: description.trim() || category || null,
              installment_group: group,
              installment_no: i + 1,
              installment_total: count,
            }))
          )
        );
      } else {
        await unwrap(
          supabase.from('daily_expenses').insert({
            amount: value,
            date: firstDate,
            category: category || 'Outros',
            payment_method: paymentMethod,
            description: description.trim() || null,
          })
        );
      }
      setAmount('');
      setDescription('');
      setCategory('');
      setInstallments(false);
      setCount(2);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      onSaved?.();
    } catch (err) {
      setError(/installment/i.test(err.message || '') ? 'O banco ainda não foi atualizado para parcelas. Rode o arquivo novidades.sql no Supabase.' : err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label className="label-eyebrow text-muted-foreground mb-2 block">Data do gasto</Label>
        <div className="rounded-xl border border-border p-2 flex justify-center bg-card">
          <Calendar mode="single" locale={ptBR} selected={date} defaultMonth={date} onSelect={(d) => d && setDate(d)} />
        </div>
      </div>
      <div>
        <Label htmlFor="amount" className="label-eyebrow text-muted-foreground mb-1.5 block">{parcelado ? 'Valor total da compra' : 'Valor'}</Label>
        <Input id="amount" type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="tnum text-lg font-semibold h-12" />
      </div>
      <div>
        <Label className="label-eyebrow text-muted-foreground mb-1.5 block">Categoria</Label>
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map((c) => (
            <button type="button" key={c} onClick={() => setCategory(c)} className={cn('px-2.5 py-1 rounded-full text-xs border transition-colors', category === c ? 'bg-brand text-on-brand border-brand' : 'border-border text-muted-foreground hover:border-brand/40 hover:text-foreground')}>
              {c}
            </button>
          ))}
        </div>
        <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2" />
      </div>
      <div>
        <Label className="label-eyebrow text-muted-foreground mb-1.5 block">Forma de pagamento</Label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_ORDER.map((m) => {
            const meta = PAYMENT_METHODS[m];
            const active = paymentMethod === m;
            return (
              <button type="button" key={m} onClick={() => setPaymentMethod(m)} className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all', active ? cn('border-transparent ring-2', meta.ring, meta.bg) : 'border-border hover:border-muted-foreground/30')}>
                <span className={cn('w-2.5 h-2.5 rounded-full', meta.dot)} />
                <span className={cn('text-sm font-medium', active ? meta.text : 'text-foreground')}>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {paymentMethod === 'credito' && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-semibold text-foreground">Parcelado no crédito</span>
            <button
              type="button"
              role="switch"
              aria-checked={installments}
              onClick={() => setInstallments((v) => !v)}
              className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', installments ? 'bg-brand' : 'bg-secondary border border-border')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', installments && 'translate-x-5')} />
            </button>
          </label>
          {installments && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Parcelas</span>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCount((c) => Math.max(2, c - 1))} aria-label="Menos parcelas"><Minus /></Button>
                  <span className="font-display font-extrabold text-xl tnum w-12 text-center">{count}x</span>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCount((c) => Math.min(48, c + 1))} aria-label="Mais parcelas"><Plus /></Button>
                </div>
              </div>
              {value > 0 && (
                <p className="text-xs leading-relaxed">
                  <b className="text-brand">
                    {count}x de {formatBRL(parts[parts.length - 1])}
                    {parts[0] !== parts[parts.length - 1] && ` (1ª de ${formatBRL(parts[0])})`}
                  </b>
                  <br />
                  <span className="text-muted-foreground">1ª na {periodNameFor(firstDate, billing)} · última na {periodNameFor(lastDate, billing)}</span>
                </p>
              )}
            </>
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving || !valid} className="w-full h-12 bg-brand hover:bg-brand-strong text-on-brand">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : justSaved ? <><Check className="w-4 h-4" /> Lançado!</> : parcelado ? `Lançar em ${count}x` : 'Lançar gasto'}
      </Button>
    </form>
  );
}

import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, unwrap } from '@/lib/supabase';
import { PAYMENT_METHODS, PAYMENT_ORDER } from '@/components/finance/PaymentBadge';
import { fmtDate, parseAmount } from '@/lib/format';
import { allCategoryNames } from '@/lib/categories';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, Check } from 'lucide-react';

export default function DailyExpenseForm({ onSaved, defaultDate, customCategories = [] }) {
  const allCategories = allCategoryNames(customCategories);
  const [date, setDate] = useState(defaultDate ? new Date(defaultDate + 'T00:00:00') : new Date());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState('');

  const value = parseAmount(amount);
  const valid = value > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await unwrap(
        supabase.from('daily_expenses').insert({
          amount: value,
          date: fmtDate(date),
          category: category || 'Outros',
          payment_method: paymentMethod,
          description: description.trim() || null,
        })
      );
      setAmount('');
      setDescription('');
      setCategory('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
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
        <Label htmlFor="amount" className="label-eyebrow text-muted-foreground mb-1.5 block">Valor</Label>
        <Input id="amount" type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="tnum text-lg font-semibold h-12" />
      </div>
      <div>
        <Label className="label-eyebrow text-muted-foreground mb-1.5 block">Categoria</Label>
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map((c) => (
            <button type="button" key={c} onClick={() => setCategory(c)} className={cn('px-2.5 py-1 rounded-full text-xs border transition-colors', category === c ? 'bg-[#059669] text-white border-[#059669]' : 'border-border text-muted-foreground hover:border-[#059669]/40 hover:text-foreground')}>
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving || !valid} className="w-full h-12 bg-[#059669] hover:bg-[#047857] text-white">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : justSaved ? <><Check className="w-4 h-4" /> Lançado!</> : 'Lançar gasto'}
      </Button>
    </form>
  );
}

import React, { useState } from 'react';
import { supabase, unwrap } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmDelete from '@/components/finance/ConfirmDelete';
import { formatBRL, fmtDate, dayLabel, parseAmount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Trash2, Plus, Loader2 } from 'lucide-react';

const SOURCES = [
  { key: 'salario', label: 'Salário', color: 'bg-brand text-on-brand' },
  { key: 'vale', label: 'Vale', color: 'bg-[#06B6D4] text-white' },
  { key: 'freelancer', label: 'Freelancer', color: 'bg-[#8B5CF6] text-white' },
  { key: 'presente', label: 'Presente', color: 'bg-[#F59E0B] text-white' },
  { key: 'outro', label: 'Outro', color: 'bg-slate-500 text-white' },
];

export function sourceMeta(key) {
  return SOURCES.find((s) => s.key === key) || SOURCES[4];
}

export default function IncomeManager({ incomes, onSaved, defaultDate }) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('salario');
  const [date, setDate] = useState(defaultDate || fmtDate(new Date()));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = parseAmount(amount);
  const valid = value > 0 && date;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await unwrap(supabase.from('incomes').insert({ amount: value, source, date, description: description.trim() || null }));
      setAmount('');
      setDescription('');
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await unwrap(supabase.from('incomes').delete().eq('id', id));
    onSaved?.();
  };

  const total = incomes.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-semibold text-foreground text-sm">Receitas</h4>
        <span className="tnum text-xs text-brand font-medium">{formatBRL(total)}</span>
      </div>
      <div className="space-y-1">
        {incomes.length === 0 && <p className="text-xs text-muted-foreground py-1">Nenhuma receita lançada neste período.</p>}
        {incomes.map((e) => {
          const src = sourceMeta(e.source);
          return (
            <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
              <div className="min-w-0 flex items-center gap-2">
                <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0', src.color)}>{src.label}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.description || src.label}</p>
                  <p className="text-xs text-muted-foreground">{dayLabel(e.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="tnum text-sm font-semibold text-brand">{formatBRL(e.amount)}</span>
                <ConfirmDelete title="Excluir esta receita?" onConfirm={() => remove(e.id)}>
                  <button className="text-muted-foreground hover:text-expense transition-colors p-1" aria-label="Excluir receita"><Trash2 className="w-3.5 h-3.5" /></button>
                </ConfirmDelete>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="space-y-2 rounded-lg border border-border p-3 bg-secondary/40">
        <div className="grid grid-cols-2 gap-2">
          <Input type="text" inputMode="decimal" autoComplete="off" placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 tnum" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 tnum" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SOURCES.map((s) => (
            <button type="button" key={s.key} onClick={() => setSource(s.key)} className={cn('px-2 py-1 rounded-full text-xs border transition-colors', source === s.key ? cn(s.color, 'border-transparent') : 'border-border text-muted-foreground hover:text-foreground')}>
              {s.label}
            </button>
          ))}
        </div>
        <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9" />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={saving || !valid} className="w-full h-9 bg-brand hover:bg-brand-strong">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Adicionar receita</>}
        </Button>
      </form>
    </div>
  );
}

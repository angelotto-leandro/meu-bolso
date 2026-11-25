import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

// Círculo para marcar/desmarcar um gasto fixo como pago no período.
export default function PaidToggle({ paid, late, onToggle, name, size = 'md' }) {
  const [busy, setBusy] = useState(false);
  const click = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await onToggle();
    } catch (err) {
      const msg = err?.message || '';
      window.alert(
        /fixed_payments|relation|schema cache/i.test(msg)
          ? 'O banco ainda não foi atualizado. Rode o arquivo novidades.sql no Supabase (SQL Editor).'
          : `Não foi possível salvar: ${msg}`
      );
    } finally {
      setBusy(false);
    }
  };
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  return (
    <button
      type="button"
      onClick={click}
      role="checkbox"
      aria-checked={!!paid}
      aria-label={paid ? `Desmarcar ${name} como pago` : `Marcar ${name} como pago`}
      className={cn(
        'shrink-0 rounded-full border-2 grid place-items-center transition-colors',
        dim,
        paid ? 'bg-brand border-brand text-on-brand' : late ? 'border-expense' : 'border-muted-foreground/50 hover:border-brand'
      )}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : paid ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : null}
    </button>
  );
}

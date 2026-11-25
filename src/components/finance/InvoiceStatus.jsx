import React from 'react';
import { cn } from '@/lib/utils';
import { Lock, LockOpen, CalendarClock } from 'lucide-react';

// Linha "16/out → 15/nov · Aberta · fecha 16/nov  [Fechar fatura]"
export default function InvoiceStatus({ period, onClose, className }) {
  if (!period || period.mode !== 'invoice') return null;
  const meta = {
    aberta: { text: 'Aberta', icon: LockOpen, cls: 'bg-[#059669]/10 text-[#059669]' },
    fechada: { text: 'Fechada', icon: Lock, cls: 'bg-secondary text-muted-foreground' },
    futura: { text: 'Futura', icon: CalendarClock, cls: 'bg-secondary text-muted-foreground' },
  }[period.status];
  return (
    <div className={cn('flex items-center justify-between gap-2 flex-wrap', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[11px]', meta.cls)}>
          <meta.icon className="w-3 h-3" /> {meta.text}
        </span>
        <span className="tnum">{period.range}</span>
      </div>
      {period.status !== 'futura' && (
        <button onClick={onClose} className="text-xs font-semibold text-[#059669] hover:underline">
          {period.status === 'aberta' ? 'Fechar fatura' : `Fechou ${period.closeLabel} · alterar`}
        </button>
      )}
    </div>
  );
}

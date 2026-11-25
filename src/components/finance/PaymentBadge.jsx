import React from 'react';
import { cn } from '@/lib/utils';

export const PAYMENT_METHODS = {
  debito: { label: 'Débito', dot: 'bg-[#3B82F6]', text: 'text-[#3B82F6] dark:text-[#60A5FA]', bg: 'bg-[#3B82F6]/10', ring: 'ring-[#3B82F6]/25' },
  credito: { label: 'Crédito', dot: 'bg-[#8B5CF6]', text: 'text-[#8B5CF6] dark:text-[#A78BFA]', bg: 'bg-[#8B5CF6]/10', ring: 'ring-[#8B5CF6]/25' },
  pix: { label: 'Pix', dot: 'bg-[#06B6D4]', text: 'text-[#0891B2] dark:text-[#22D3EE]', bg: 'bg-[#06B6D4]/10', ring: 'ring-[#06B6D4]/25' },
  dinheiro: { label: 'Dinheiro', dot: 'bg-[#F59E0B]', text: 'text-[#D97706] dark:text-[#FBBF24]', bg: 'bg-[#F59E0B]/10', ring: 'ring-[#F59E0B]/25' },
};

export const PAYMENT_ORDER = ['debito', 'credito', 'pix', 'dinheiro'];

export function PaymentBadge({ method, size = 'sm' }) {
  const m = PAYMENT_METHODS[method] || PAYMENT_METHODS.dinheiro;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full ring-1 font-medium whitespace-nowrap',
        m.bg,
        m.text,
        m.ring,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={cn('rounded-full', m.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {m.label}
    </span>
  );
}

export default PaymentBadge;

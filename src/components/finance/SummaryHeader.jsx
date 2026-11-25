import React from 'react';
import { ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { formatBRL } from '@/lib/format';
import InvoiceStatus from '@/components/finance/InvoiceStatus';
import { cn } from '@/lib/utils';

export default function SummaryHeader({ period, onCloseInvoice, onOpenMenu, onOpenStatement, onPrev, onNext, receitas, despesasFixas, gastosDiarios, saldo, fixedOpen }) {
  const saldoPositive = saldo >= 0;
  const cards = [
    { label: 'Receitas', value: receitas, icon: TrendingUp, tone: 'emerald', statement: 'receitas' },
    { label: 'Despesas Fixas', value: despesasFixas, icon: PiggyBank, tone: 'slate', statement: 'fixas', note: despesasFixas > 0 ? (fixedOpen > 0 ? `Falta pagar ${formatBRL(fixedOpen)}` : 'Tudo pago ✓') : null },
    { label: 'Gastos Diários', value: gastosDiarios, icon: TrendingDown, tone: 'slate', statement: 'diarios' },
    { label: 'Saldo Restante', value: saldo, icon: Wallet, tone: saldoPositive ? 'emerald' : 'rose', highlight: true },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <button onClick={onOpenMenu} aria-label="Abrir menu" className="w-10 h-10 rounded-xl bg-brand text-on-brand grid place-items-center font-display font-bold text-lg shadow-sm hover:bg-brand-strong transition-colors">B</button>
          <div>
            <p className="label-eyebrow text-muted-foreground">Meu Bolso</p>
            <h1 className="font-display font-bold text-lg text-foreground leading-tight">Controle de Gastos</h1>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
          <button onClick={onPrev} aria-label="Período anterior" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-3 text-sm font-semibold min-w-[150px] text-center text-foreground">{period.label}</span>
          <button onClick={onNext} aria-label="Próximo período" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <InvoiceStatus period={period} onClose={onCloseInvoice} className="justify-end -mt-2" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const positive = c.tone === 'emerald';
          const negative = c.tone === 'rose';
          return (
            <div
              key={c.label}
              onClick={c.statement ? () => onOpenStatement(c.statement) : undefined}
              className={cn(
                'rounded-xl border bg-card p-4 transition-colors',
                c.statement && 'cursor-pointer hover:border-brand/40 hover:shadow-sm',
                c.highlight
                  ? positive
                    ? 'border-brand/30 bg-brand-soft'
                    : 'border-expense-border bg-expense-soft'
                  : 'border-border'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="label-eyebrow text-muted-foreground">{c.label}</span>
                <c.icon className={cn('w-3.5 h-3.5', positive ? 'text-brand' : negative ? 'text-expense' : 'text-muted-foreground')} />
              </div>
              <p className={cn('font-display font-bold tnum tracking-tight text-xl lg:text-2xl', c.highlight ? (positive ? 'text-brand' : 'text-expense') : 'text-foreground')}>
                {formatBRL(c.value)}
              </p>
              {c.note && <p className={cn('text-[11px] mt-1', c.note.startsWith('Tudo') ? 'text-brand' : 'text-muted-foreground')}>{c.note}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

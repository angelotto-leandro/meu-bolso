import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import InvoiceCloseDialog from '@/components/finance/InvoiceCloseDialog';
import { getPeriod, currentPeriodMonth } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { CreditCard, Loader2, Check, Pencil } from 'lucide-react';

const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

export default function BillingSheet({ open, onOpenChange, billing }) {
  const [enabled, setEnabled] = useState(false);
  const [day, setDay] = useState(16);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [editMonth, setEditMonth] = useState(null);

  useEffect(() => {
    if (!open) return;
    setEnabled(!!billing.closeDay);
    setDay(billing.closeDay || 16);
    setError('');
    setSaved(false);
    // Só ao abrir a tela; depois de salvar não reinicia (senão some o aviso "Salvo").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dirty = (enabled ? day : null) !== (billing.closeDay ?? null);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await billing.setCloseDay(enabled ? Number(day) : null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(
        /function|schema cache|column/i.test(e.message || '')
          ? 'O banco ainda não tem esta função. Rode o arquivo fatura.sql no Supabase (SQL Editor).'
          : e.message || 'Não foi possível salvar.'
      );
    } finally {
      setBusy(false);
    }
  };

  // Exemplo e lista de faturas recentes (com o dia já salvo).
  const example = getPeriod(currentPeriodMonth(Number(day), {}), Number(day), {});
  const current = billing.closeDay ? currentPeriodMonth(billing.closeDay, billing.overrides) : null;
  const recent = current ? [1, 0, -1, -2, -3, -4].map((n) => addMonths(current, n)) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 pr-12 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base font-display">Fatura do cartão</SheetTitle>
          <SheetDescription className="text-xs">Organize o app pelo período da fatura em vez do mês.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">Organizar pela fatura</span>
                <span className="block text-[12px] text-muted-foreground">Desligado: o app continua mês a mês.</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled((v) => !v)}
                className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', enabled ? 'bg-[#059669]' : 'bg-secondary border border-border')}
              >
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', enabled && 'translate-x-5')} />
              </button>
            </label>

            {enabled && (
              <div className="space-y-2">
                <label htmlFor="close-day" className="label-eyebrow text-muted-foreground block">Dia em que a fatura fecha</label>
                <select
                  id="close-day"
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base tnum"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>Dia {d}</option>
                  ))}
                </select>
                <p className="text-[12px] text-muted-foreground">
                  Compras feitas no dia {day} já entram na fatura seguinte. Exemplo: a <b className="text-foreground">{example.label}</b> vai de{' '}
                  <b className="text-foreground">{example.range}</b>.
                </p>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button onClick={save} disabled={busy || !dirty} className="w-full bg-[#059669] hover:bg-[#047857]">
              {busy ? <Loader2 className="animate-spin" /> : saved ? <><Check /> Salvo</> : 'Salvar'}
            </Button>
          </div>

          {billing.closeDay && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div>
                <p className="font-display font-semibold text-sm text-foreground">Fechamento de cada fatura</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Se o banco fechou antes ou depois do dia {billing.closeDay}, toque na fatura e ajuste a data. A fatura seguinte começa nesse mesmo dia.
                </p>
              </div>
              <div className="divide-y divide-border">
                {recent.map((m) => {
                  const p = getPeriod(m, billing.closeDay, billing.overrides);
                  return (
                    <button
                      key={p.closeDate}
                      onClick={() => p.status !== 'futura' && setEditMonth(m)}
                      disabled={p.status === 'futura'}
                      className="w-full flex items-center justify-between gap-2 py-2.5 text-left disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {p.label}
                          {p.status === 'aberta' && <span className="ml-1.5 text-[10px] font-semibold text-[#059669] uppercase">aberta</span>}
                        </span>
                        <span className="block text-[11px] text-muted-foreground tnum">{p.range}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
                        <span className={cn('tnum', p.isOverride && 'text-[#059669] font-semibold')}>
                          {p.status === 'futura' ? `fecha ${p.closeLabel}` : p.status === 'aberta' ? `fecha ${p.closeLabel}` : `fechou ${p.closeLabel}`}
                        </span>
                        {p.status !== 'futura' && <Pencil className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="w-3 h-3" /> Datas em verde foram ajustadas por você.
              </p>
            </div>
          )}
        </div>

        <InvoiceCloseDialog open={!!editMonth} onOpenChange={(o) => !o && setEditMonth(null)} monthDate={editMonth} billing={billing} />
      </SheetContent>
    </Sheet>
  );
}

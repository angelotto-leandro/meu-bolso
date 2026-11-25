import React, { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtDate, parseDate, dayLabel, monthStart } from '@/lib/format';
import { getPeriod } from '@/lib/billing';
import { Loader2 } from 'lucide-react';

// Fechar a fatura (ou mudar a data em que ela fechou).
// A partir da data escolhida, os lançamentos passam para a fatura seguinte.
export default function InvoiceCloseDialog({ open, onOpenChange, monthDate, billing }) {
  const period = monthDate ? getPeriod(monthDate, billing.closeDay, billing.overrides) : null;
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !period) return;
    setError('');
    setDate(period.status === 'aberta' ? fmtDate(new Date()) : period.closeDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!period || period.mode !== 'invoice') return null;
  const isOpenInvoice = period.status === 'aberta';
  const key = monthStart(monthDate);

  const save = async () => {
    setError('');
    if (!date) return setError('Escolha a data.');
    if (date <= period.prevCloseDate) return setError(`A data precisa ser depois de ${dayLabel(period.prevCloseDate)}, quando fechou a fatura anterior.`);
    if (date >= period.nextCloseDate) return setError(`A data precisa ser antes de ${dayLabel(period.nextCloseDate)}, quando fecha a próxima fatura.`);
    setBusy('save');
    try {
      await billing.setClosing(key, date);
      onOpenChange(false);
    } catch (e) {
      setError(e.message || 'Não foi possível salvar.');
    } finally {
      setBusy('');
    }
  };

  const reset = async () => {
    setBusy('reset');
    try {
      await billing.setClosing(key, null);
      onOpenChange(false);
    } catch (e) {
      setError(e.message || 'Não foi possível salvar.');
    } finally {
      setBusy('');
    }
  };

  const next = date ? parseDate(date) : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isOpenInvoice ? 'Fechar fatura' : 'Data de fechamento'}</AlertDialogTitle>
          <AlertDialogDescription>
            {period.label}. Em que dia o banco fechou {isOpenInvoice ? 'esta fatura' : 'a fatura'}? Compras feitas a partir desse dia entram na fatura seguinte.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 tnum" />
          {next && !error && (
            <p className="text-xs text-muted-foreground">
              Esta fatura fica até {dayLabel(fmtDate(new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1)))}; a próxima começa em {dayLabel(date)}.
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <AlertDialogFooter>
          {period.isOverride && (
            <Button variant="ghost" onClick={reset} disabled={!!busy} className="sm:mr-auto">
              {busy === 'reset' && <Loader2 className="animate-spin" />} Voltar ao dia {billing.closeDay}
            </Button>
          )}
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button onClick={save} disabled={!!busy} className="bg-brand hover:bg-brand-strong">
            {busy === 'save' && <Loader2 className="animate-spin" />} {isOpenInvoice ? 'Fechar fatura' : 'Salvar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

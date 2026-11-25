import React, { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { supabase, unwrap } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatBRL, dayLabel } from '@/lib/format';
import { getPeriod } from '@/lib/billing';
import { allCategoryNames } from '@/lib/categories';
import { PAYMENT_METHODS, PAYMENT_ORDER, PaymentBadge, InstallmentTag } from '@/components/finance/PaymentBadge';
import { cn } from '@/lib/utils';
import { Search, Loader2, X } from 'lucide-react';

const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

// Tira acentos e deixa minúsculo: "Relógio Café" -> "relogio cafe".
const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-full text-xs border transition-colors',
        on ? 'bg-brand text-on-brand border-brand font-semibold' : 'border-border text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

const toggle = (set, v) => {
  const n = new Set(set);
  n.has(v) ? n.delete(v) : n.add(v);
  return n;
};

// Busca nos gastos: texto (descrição ou categoria), forma de pagamento, categoria e período.
export default function SearchSheet({ open, onOpenChange, monthDate, billing, customCategories = [], onEdit, refreshKey }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [q, setQ] = useState('');
  const [pays, setPays] = useState(new Set());
  const [cats, setCats] = useState(new Set());
  const [range, setRange] = useState('periodo');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllCats, setShowAllCats] = useState(false);

  const isInvoice = !!billing?.closeDay;
  const noun = isInvoice ? 'fatura' : 'mês';
  const categories = allCategoryNames(customCategories);

  const bounds = useMemo(() => {
    if (!monthDate || range === 'tudo') return null;
    const cur = getPeriod(monthDate, billing?.closeDay, billing?.overrides || {});
    if (range === 'periodo') return { start: cur.start, end: cur.end };
    const first = getPeriod(addMonths(monthDate, -2), billing?.closeDay, billing?.overrides || {});
    return { start: first.start, end: cur.end };
  }, [monthDate, range, billing?.closeDay, billing?.overrides]);

  useEffect(() => {
    if (!open || !user?.id) return;
    // Palavras digitadas, sem acento e em minúsculas: "Relógio" = "relogio".
    const words = normalize(q).split(/\s+/).filter(Boolean);
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        let query = supabase.from('daily_expenses').select('*').eq('user_id', user.id);
        if (pays.size) query = query.in('payment_method', [...pays]);
        if (cats.size) query = query.in('category', [...cats]);
        if (bounds) query = query.gte('date', bounds.start).lte('date', bounds.end);
        // Com texto, o app traz mais lançamentos e filtra aqui (ignorando acentos); sem texto, só os 300 mais recentes.
        const data = await unwrap(query.order('date', { ascending: false }).order('created_at', { ascending: false }).limit(words.length ? 3000 : 300));
        const found = words.length
          ? data.filter((e) => {
              const text = normalize(`${e.description || ''} ${e.category || ''}`);
              return words.every((w) => text.includes(w));
            })
          : data;
        setResults(found.slice(0, 300));
      } catch (e) {
        setError(e.message || 'Não foi possível buscar.');
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [open, user?.id, q, pays, cats, bounds, refreshKey]);

  const total = results.reduce((s, e) => s + Number(e.amount || 0), 0);
  const visibleCats = showAllCats ? categories : categories.slice(0, 5);
  const hasFilters = q || pays.size || cats.size || range !== 'periodo';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn('p-0 flex flex-col', isMobile ? 'h-[92vh] rounded-t-2xl' : 'w-full sm:max-w-md')}>
        <SheetHeader className="p-4 pb-3 pr-12 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base font-display">Buscar gastos</SheetTitle>
          <SheetDescription className="text-xs">Procure por nome ou categoria e use os filtros.</SheetDescription>
        </SheetHeader>

        <div className="p-4 pb-2 space-y-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input autoFocus={!isMobile} placeholder="Ex.: ifood, mercado, farmácia" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 pr-9 h-11" />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Limpar busca">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <p className="label-eyebrow text-muted-foreground mb-1.5">Pagamento</p>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_ORDER.map((m) => (
                <Chip key={m} on={pays.has(m)} onClick={() => setPays((s) => toggle(s, m))}>{PAYMENT_METHODS[m].label}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="label-eyebrow text-muted-foreground mb-1.5">Categoria</p>
            <div className="flex flex-wrap gap-1.5">
              {visibleCats.map((c) => (
                <Chip key={c} on={cats.has(c)} onClick={() => setCats((s) => toggle(s, c))}>{c}</Chip>
              ))}
              {categories.length > 5 && (
                <Chip on={false} onClick={() => setShowAllCats((v) => !v)}>{showAllCats ? 'menos' : `+${categories.length - 5}`}</Chip>
              )}
            </div>
          </div>
          <div>
            <p className="label-eyebrow text-muted-foreground mb-1.5">Período</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip on={range === 'periodo'} onClick={() => setRange('periodo')}>{isInvoice ? 'Esta fatura' : 'Este mês'}</Chip>
              <Chip on={range === '3'} onClick={() => setRange('3')}>{isInvoice ? 'Últimas 3 faturas' : 'Últimos 3 meses'}</Chip>
              <Chip on={range === 'tudo'} onClick={() => setRange('tudo')}>Tudo</Chip>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-safe">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {results.length} {results.length === 1 ? 'lançamento' : 'lançamentos'}
            </span>
            <b className="tnum text-expense">{formatBRL(total)}</b>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nada encontrado{hasFilters ? ' com esses filtros' : ` nesta ${noun}`}.
            </p>
          )}
          {results.map((e) => (
            <div
              key={e.id}
              onClick={() => onEdit?.({ kind: 'expense', row: e })}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-brand/40 active:bg-secondary/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">{e.description || e.category || 'Gasto'}</span>
                  <PaymentBadge method={e.payment_method} />
                  <InstallmentTag entry={e} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{dayLabel(e.date)} · {e.category || 'Outros'}</p>
              </div>
              <span className="tnum text-sm font-semibold text-expense shrink-0">- {formatBRL(e.amount)}</span>
            </div>
          ))}
          {results.length === 300 && <p className="text-[11px] text-muted-foreground text-center">Mostrando os 300 mais recentes. Use os filtros para refinar.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

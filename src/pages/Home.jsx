import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useIsMobile } from '@/hooks/use-mobile';
import { fmtDate, formatBRL, dayLabel, parseDate } from '@/lib/format';
import { useBilling } from '@/hooks/useBilling';
import { getPeriod, periodDays, currentPeriodMonth } from '@/lib/billing';
import InvoiceStatus from '@/components/finance/InvoiceStatus';
import InvoiceCloseDialog from '@/components/finance/InvoiceCloseDialog';
import EditEntrySheet from '@/components/finance/EditEntrySheet';
import PaidToggle from '@/components/finance/PaidToggle';
import { fixedStatus, fixedTotals } from '@/lib/fixed';
import { supabase, unwrap } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import SummaryHeader from '@/components/finance/SummaryHeader';
import CalendarMatrix from '@/components/finance/CalendarMatrix';
import TransactionStream from '@/components/finance/TransactionStream';
import QuickEntryPanel from '@/components/finance/QuickEntryPanel';
import MobileEntrySheet from '@/components/finance/MobileEntrySheet';
import AppSidebar from '@/components/finance/AppSidebar';
import StatementSheet from '@/components/finance/StatementSheet';
import ConfirmDelete from '@/components/finance/ConfirmDelete';
import { useCategories } from '@/hooks/useCategories';
import { PaymentBadge, InstallmentTag } from '@/components/finance/PaymentBadge';
import { sourceMeta } from '@/components/finance/IncomeManager';
import { Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CalendarDays, Repeat, Banknote, X } from 'lucide-react';

export default function Home() {
  const billing = useBilling();
  // Mês de referência: o mês do calendário, ou o mês em que a fatura fecha.
  const [monthDate, setMonthDate] = useState(null);
  useEffect(() => {
    if (billing.loaded) setMonthDate(currentPeriodMonth(billing.closeDay, billing.overrides));
    // Só quando carrega ou muda o dia de fechamento; ajustes de data não mudam a fatura que está na tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing.loaded, billing.closeDay]);
  const period = useMemo(
    () => (monthDate ? getPeriod(monthDate, billing.closeDay, billing.overrides) : null),
    [monthDate, billing.closeDay, billing.overrides]
  );
  const [closeOpen, setCloseOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const { dailyExpenses, fixedExpenses, incomes, paidMap, togglePaid, loading, error, reload } = useFinanceData(period, monthDate);
  const [editing, setEditing] = useState(null); // { kind: 'expense' | 'income', row }
  const { categories, reloadCategories } = useCategories();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statement, setStatement] = useState(null);

  // Abre a tela de lançamento via link ?novo=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('novo') === '1' && window.innerWidth < 768) {
      setMobileOpen(true);
      params.delete('novo');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, []);

  const receitas = incomes.reduce((s, e) => s + Number(e.amount || 0), 0);
  const despesasFixas = fixedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const gastosDiarios = dailyExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const saldo = receitas - despesasFixas - gastosDiarios;

  const changeMonth = (delta) => {
    setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelectedDate(null);
  };

  const deleteExpense = async (id) => {
    await unwrap(supabase.from('daily_expenses').delete().eq('id', id));
    reload();
  };

  const defaultEntryDate = selectedDate || fmtDate(new Date());

  if (loading || !period) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="w-8 h-8 border-4 border-secondary border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  const errorBanner = error && (
    <div className="mx-4 mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between gap-2">
      <span>Não foi possível carregar: {error}</span>
      <button onClick={reload} className="font-semibold underline shrink-0">Tentar de novo</button>
    </div>
  );

  const entryProps = {
    onSaved: reload,
    defaultDate: defaultEntryDate,
    monthDate,
    periodLabel: period.label,
    fixedExpenses,
    incomes,
    customCategories: categories,
    paidMap,
    togglePaid,
    onEdit: setEditing,
  };

  const shared = (
    <>
      <AppSidebar
        open={menuOpen}
        onOpenChange={setMenuOpen}
        dailyExpenses={dailyExpenses}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        periodLabel={period.label}
        billing={billing}
        categories={categories}
        onCategoriesChanged={reloadCategories}
      />
      <StatementSheet
        open={!!statement}
        onOpenChange={(o) => !o && setStatement(null)}
        type={statement}
        period={period}
        monthDate={monthDate}
        dailyExpenses={dailyExpenses}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        paidMap={paidMap}
        togglePaid={togglePaid}
        onEdit={setEditing}
      />
      <EditEntrySheet entry={editing} onOpenChange={(o) => !o && setEditing(null)} customCategories={categories} onSaved={reload} />
      <InvoiceCloseDialog open={closeOpen} onOpenChange={setCloseOpen} monthDate={monthDate} billing={billing} />
    </>
  );

  if (isMobile) {
    return (
      <>
        {errorBanner}
        <MobileHome
          period={period}
          onCloseInvoice={() => setCloseOpen(true)}
          onPrev={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          receitas={receitas}
          despesasFixas={despesasFixas}
          gastosDiarios={gastosDiarios}
          saldo={saldo}
          dailyExpenses={dailyExpenses}
          fixedExpenses={fixedExpenses}
          incomes={incomes}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onDelete={deleteExpense}
          onEdit={setEditing}
          monthDate={monthDate}
          paidMap={paidMap}
          togglePaid={togglePaid}
          onNew={() => setMobileOpen(true)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenStatement={setStatement}
        />
        <MobileEntrySheet open={mobileOpen} onOpenChange={setMobileOpen} {...entryProps} />
        {shared}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {errorBanner}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <SummaryHeader
          period={period}
          onCloseInvoice={() => setCloseOpen(true)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenStatement={setStatement}
          onPrev={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          receitas={receitas}
          despesasFixas={despesasFixas}
          gastosDiarios={gastosDiarios}
          saldo={saldo}
          fixedOpen={fixedTotals(fixedExpenses, paidMap).open}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-6 items-start">
          <div className="space-y-4 lg:min-w-0">
            <CalendarMatrix days={periodDays(period)} dailyExpenses={dailyExpenses} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <TransactionStream dailyExpenses={dailyExpenses} selectedDate={selectedDate} onClearFilter={() => setSelectedDate(null)} onDelete={deleteExpense} onEdit={(e) => setEditing({ kind: 'expense', row: e })} />
          </div>
          <div>
            <QuickEntryPanel {...entryProps} />
          </div>
        </div>
      </div>
      {shared}
    </div>
  );
}

function MobileHome(props) {
  const {
    period, onCloseInvoice, onPrev, onNext,
    receitas, despesasFixas, gastosDiarios, saldo,
    dailyExpenses, fixedExpenses, incomes,
    selectedDate, onSelectDate, onDelete, onEdit, monthDate, paidMap, togglePaid, onNew, onOpenMenu, onOpenStatement,
  } = props;

  const totalExpense = despesasFixas + gastosDiarios;
  const totalIn = receitas || 0;
  const totalOut = totalExpense || 0;
  const grand = totalIn + totalOut || 1;
  const inPct = (totalIn / grand) * 100;
  const outPct = (totalOut / grand) * 100;

  const isInvoice = period.mode === 'invoice';
  const days = periodDays(period);
  const crossesMonth = days[0].slice(0, 7) !== days[days.length - 1].slice(0, 7);
  const todayStr = fmtDate(new Date());
  const spendByDay = {};
  dailyExpenses.forEach((e) => {
    spendByDay[e.date] = (spendByDay[e.date] || 0) + Number(e.amount || 0);
  });

  const stripRef = useRef(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-today="true"]');
    if (el) stripRef.current.scrollLeft = el.offsetLeft - stripRef.current.clientWidth / 2 + el.clientWidth / 2;
    else if (stripRef.current) stripRef.current.scrollLeft = 0;
  }, [period.start]);

  const sortedExpenses = [...dailyExpenses].sort((a, b) => (a.date < b.date ? 1 : -1));
  const filteredExpenses = selectedDate ? sortedExpenses.filter((e) => e.date === selectedDate) : sortedExpenses;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Topo */}
      <div className="px-4 pt-5 pb-3 bg-gradient-to-b from-brand-soft to-background">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={onOpenMenu} aria-label="Abrir menu" className="w-9 h-9 rounded-xl bg-brand text-on-brand grid place-items-center font-display font-bold active:scale-95 transition-transform">B</button>
            <div>
              <p className="label-eyebrow text-muted-foreground">Meu Bolso</p>
              <p className="font-display font-bold text-sm text-foreground leading-none">Controle de Gastos</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-0.5">
            <button onClick={onPrev} aria-label="Período anterior" className="p-1.5 rounded-full text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-2 text-xs font-semibold text-center min-w-[110px] text-foreground">{period.shortLabel}</span>
            <button onClick={onNext} aria-label="Próximo período" className="p-1.5 rounded-full text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="rounded-2xl border border-brand/20 bg-card p-5 shadow-sm">
          <InvoiceStatus period={period} onClose={onCloseInvoice} className="mb-3" />
          <p className="label-eyebrow text-muted-foreground mb-1">Saldo restante {isInvoice ? 'da fatura' : 'do mês'}</p>
          <p className={cn('font-display font-bold tnum tracking-tight', saldo < 0 ? 'text-expense' : 'text-foreground', 'text-[clamp(2rem,9vw,3rem)]')}>
            {formatBRL(saldo)}
          </p>
          <div className="mt-4 space-y-2.5">
            <div>
              <button className="w-full flex items-center justify-between text-xs mb-1" onClick={() => onOpenStatement('receitas')}>
                <span className="inline-flex items-center gap-1 text-brand font-medium"><TrendingUp className="w-3 h-3" /> Receitas</span>
                <span className="tnum text-foreground font-medium">{formatBRL(receitas)}</span>
              </button>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${inPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="inline-flex items-center gap-1 text-expense font-medium"><TrendingDown className="w-3 h-3" /> Despesas</span>
                <span className="tnum text-foreground font-medium">{formatBRL(totalExpense)}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-expense rounded-full" style={{ width: `${outPct}%` }} />
              </div>
              <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                <button onClick={() => onOpenStatement('fixas')}>Fixas: <span className="tnum text-foreground">{formatBRL(despesasFixas)}</span></button>
                <button onClick={() => onOpenStatement('diarios')}>Diárias: <span className="tnum text-foreground">{formatBRL(gastosDiarios)}</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dias do mês */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5" />
          <span className="label-eyebrow">Dias {isInvoice ? 'da fatura' : 'do mês'}</span>
        </div>
        <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {days.map((ds) => {
            const date = parseDate(ds);
            const d = date.getDate();
            const showMonth = crossesMonth && (ds === days[0] || d === 1);
            const hasSpend = (spendByDay[ds] || 0) > 0;
            const isSelected = selectedDate === ds;
            const isToday = todayStr === ds;
            return (
              <button
                key={ds}
                data-today={isToday}
                onClick={() => onSelectDate(isSelected ? null : ds)}
                className={cn(
                  'shrink-0 w-12 h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors',
                  isSelected ? 'bg-brand text-on-brand border-brand' : isToday ? 'border-brand/40 bg-brand-soft text-brand' : 'border-border bg-card text-foreground'
                )}
              >
                <span className="text-[10px] uppercase opacity-70">
                  {showMonth ? date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                </span>
                <span className="text-base font-bold tnum">{d}</span>
                <span className={cn('w-1.5 h-1.5 rounded-full', hasSpend ? (isSelected ? 'bg-on-brand' : 'bg-brand') : 'bg-transparent')} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Gastos fixos */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
          <Repeat className="w-3.5 h-3.5" />
          <span className="label-eyebrow">Gastos fixos</span>
          {fixedExpenses.length > 0 && (
            <span className="ml-auto text-[11px] tnum">
              <span className="text-brand">Pago {formatBRL(fixedTotals(fixedExpenses, paidMap).paid)}</span>
              <span className="text-muted-foreground"> · falta {formatBRL(fixedTotals(fixedExpenses, paidMap).open)}</span>
            </span>
          )}
        </div>
        {fixedExpenses.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhum gasto fixo. Toque em “Lançamentos”.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {fixedExpenses.map((e) => {
              const paid = !!paidMap[e.id];
              const st = fixedStatus(e, monthDate, paidMap[e.id]);
              return (
                <div key={e.id} className={cn('shrink-0 w-44 rounded-xl border bg-card p-3', st.tone === 'late' ? 'border-expense-border' : 'border-border')}>
                  <div className="flex items-center justify-between mb-1.5">
                    <PaidToggle paid={paid} late={st.tone === 'late'} name={e.name} onToggle={() => togglePaid(e.id)} />
                    <PaymentBadge method={e.payment_method} />
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                  <p className={cn('tnum font-display font-bold mt-0.5', paid ? 'text-muted-foreground line-through' : 'text-foreground')}>{formatBRL(e.amount)}</p>
                  <p className={cn('text-[11px] mt-0.5 truncate', st.tone === 'late' ? 'text-expense font-medium' : st.tone === 'paid' ? 'text-brand' : 'text-muted-foreground')}>{st.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receitas */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
          <Banknote className="w-3.5 h-3.5" />
          <span className="label-eyebrow">Receitas {isInvoice ? 'da fatura' : 'do mês'}</span>
        </div>
        {incomes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhuma receita lançada.</p>
        ) : (
          <div className="space-y-1.5">
            {incomes.map((e) => {
              const src = sourceMeta(e.source);
              return (
                <div key={e.id} onClick={() => onEdit({ kind: 'income', row: e })} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 active:bg-secondary/60 cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0', src.color)}>{src.label}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.description || src.label}</p>
                      <p className="text-xs text-muted-foreground">{dayLabel(e.date)}</p>
                    </div>
                  </div>
                  <span className="tnum text-sm font-semibold text-brand shrink-0">{formatBRL(e.amount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lançamentos */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="label-eyebrow text-muted-foreground">Lançamentos <span className="normal-case tracking-normal font-normal">· toque para editar</span></span>
          {selectedDate && (
            <button onClick={() => onSelectDate(null)} className="text-xs text-muted-foreground hover:text-foreground">
              {dayLabel(selectedDate)} · limpar
            </button>
          )}
        </div>
        <div className="space-y-2">
          {filteredExpenses.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Nenhum lançamento.</div>
          )}
          {filteredExpenses.map((e) => (
            <div key={e.id} onClick={() => onEdit({ kind: 'expense', row: e })} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 active:bg-secondary/60 cursor-pointer">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">{e.description || e.category || 'Gasto'}</span>
                  <PaymentBadge method={e.payment_method} />
                  <InstallmentTag entry={e} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{dayLabel(e.date)}{e.category && e.description ? ` · ${e.category}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="tnum text-sm font-semibold text-expense">- {formatBRL(e.amount)}</span>
                <span onClick={(ev) => ev.stopPropagation()}>
                  <ConfirmDelete
                    title="Excluir este gasto?"
                    description={`${e.description || e.category || 'Gasto'} · ${formatBRL(e.amount)} · ${dayLabel(e.date)}`}
                    onConfirm={() => onDelete(e.id)}
                  >
                    <button className="p-1.5 -mr-1 text-muted-foreground hover:text-expense" aria-label="Excluir gasto">
                      <X className="w-4 h-4" />
                    </button>
                  </ConfirmDelete>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botão flutuante */}
      <button
        onClick={onNew}
        style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        className="fixed left-1/2 -translate-x-1/2 inline-flex items-center gap-2 h-14 pl-5 pr-6 rounded-full bg-brand text-on-brand shadow-lg shadow-brand/30 active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
        <span className="font-display font-semibold">Lançamentos</span>
      </button>
    </div>
  );
}

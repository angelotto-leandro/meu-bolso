import React, { useState, useEffect } from 'react';
import { supabase, unwrap } from '@/lib/supabase';
import { formatBRL, dayLabel } from '@/lib/format';
import { PaymentBadge } from '@/components/finance/PaymentBadge';
import { sourceMeta } from '@/components/finance/IncomeManager';
import { fixedPeriodLabel } from '@/components/finance/FixedExpenseManager';
import { cn } from '@/lib/utils';
import { Loader2, ChevronLeft } from 'lucide-react';

function Section({ title, total, income, count, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="label-eyebrow text-muted-foreground">{title}</p>
        <span className={cn('tnum text-xs font-semibold', income ? 'text-[#059669]' : 'text-rose-600')}>{formatBRL(total)}</span>
      </div>
      {count === 0 ? <p className="text-xs text-muted-foreground">Nenhum registro.</p> : <div className="space-y-1.5">{children}</div>}
    </div>
  );
}

const sum = (list) => list.reduce((s, e) => s + Number(e.amount || 0), 0);

export default function AdminUsersPanel() {
  const [users, setUsers] = useState(null);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    unwrap(supabase.from('profiles').select('id, email, role').order('email')).then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    setData(null);
    if (!selected) return;
    Promise.all([
      unwrap(supabase.from('daily_expenses').select('*').eq('user_id', selected.id).order('date', { ascending: false }).limit(500)),
      unwrap(supabase.from('fixed_expenses').select('*').eq('user_id', selected.id).order('due_day').limit(500)),
      unwrap(supabase.from('incomes').select('*').eq('user_id', selected.id).order('date', { ascending: false }).limit(500)),
    ])
      .then(([daily, fixed, incomes]) => setData({ daily, fixed, incomes }))
      .catch(() => setData({ daily: [], fixed: [], incomes: [] }));
  }, [selected]);

  if (selected) {
    const daily = data?.daily || [];
    const fixed = data?.fixed || [];
    const incomes = data?.incomes || [];

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelected(null)} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors" aria-label="Voltar">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="label-eyebrow text-muted-foreground">Cadastros de</p>
            <p className="text-sm font-semibold text-foreground truncate" title={selected.email}>{selected.email}</p>
          </div>
        </div>

        {!data ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
          </div>
        ) : (
          <>
            <Section title="Receitas" income count={incomes.length} total={sum(incomes)}>
              {incomes.map((e) => {
                const src = sourceMeta(e.source);
                return (
                  <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0', src.color)}>{src.label}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-foreground truncate">{e.description || src.label}</p>
                        <p className="text-[11px] text-muted-foreground">{dayLabel(e.date)}</p>
                      </div>
                    </div>
                    <span className="tnum text-xs font-semibold text-[#059669] shrink-0">+ {formatBRL(e.amount)}</span>
                  </div>
                );
              })}
            </Section>

            <Section title="Despesas fixas" count={fixed.length} total={sum(fixed.filter((e) => !e.end_month))}>
              {fixed.map((e) => (
                <div key={e.id} className={cn('flex items-center justify-between gap-2 rounded-lg border border-border p-2.5', e.end_month && 'opacity-60')}>
                  <div className="flex items-center gap-2 min-w-0">
                    <PaymentBadge method={e.payment_method} />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground">Todo dia {e.due_day} · {fixedPeriodLabel(e)}</p>
                    </div>
                  </div>
                  <span className="tnum text-xs font-semibold text-rose-600 shrink-0">- {formatBRL(e.amount)}</span>
                </div>
              ))}
            </Section>

            <Section title="Gastos diários" count={daily.length} total={sum(daily)}>
              {daily.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <PaymentBadge method={e.payment_method} />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate">{e.description || e.category || 'Gasto'}</p>
                      <p className="text-[11px] text-muted-foreground">{dayLabel(e.date)}{e.category && e.description ? ` · ${e.category}` : ''}</p>
                    </div>
                  </div>
                  <span className="tnum text-xs font-semibold text-rose-600 shrink-0">- {formatBRL(e.amount)}</span>
                </div>
              ))}
            </Section>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {!users ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhum usuário encontrado.</p>
      ) : (
        <div className="space-y-1">
          {users.map((u) => (
            <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center justify-between gap-2 py-2.5 px-2 rounded-lg hover:bg-secondary text-left transition-colors">
              <span className="text-sm text-foreground truncate">{u.email}</span>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', u.role === 'admin' ? 'bg-[#059669]/10 text-[#059669]' : 'bg-secondary text-muted-foreground')}>
                {u.role === 'admin' ? 'Admin' : 'Usuário'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

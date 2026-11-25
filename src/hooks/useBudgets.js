import { useState, useEffect, useCallback } from 'react';
import { supabase, unwrap } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

// Limites por categoria: { categoria: valor }
export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState({});
  const [available, setAvailable] = useState(true); // false = banco ainda sem a tabela

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase.from('category_budgets').select('category, amount').eq('user_id', user.id);
    if (error) {
      setAvailable(false);
      return;
    }
    setAvailable(true);
    setBudgets(Object.fromEntries((data || []).map((b) => [b.category, Number(b.amount)])));
  }, [user?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setBudget = async (category, amount) => {
    await unwrap(supabase.from('category_budgets').upsert({ user_id: user.id, category, amount }, { onConflict: 'user_id,category' }));
    setBudgets((b) => ({ ...b, [category]: amount }));
  };

  const removeBudget = async (category) => {
    await unwrap(supabase.from('category_budgets').delete().eq('user_id', user.id).eq('category', category));
    setBudgets((b) => {
      const n = { ...b };
      delete n[category];
      return n;
    });
  };

  return { budgets, available, setBudget, removeBudget, reload };
}

// Quanto foi gasto em cada categoria no período (gastos do dia a dia + fixos).
export function spendingByCategory(dailyExpenses, fixedExpenses) {
  const m = {};
  for (const e of dailyExpenses) m[e.category || 'Outros'] = (m[e.category || 'Outros'] || 0) + Number(e.amount || 0);
  for (const e of fixedExpenses) if (e.category) m[e.category] = (m[e.category] || 0) + Number(e.amount || 0);
  return m;
}

export function budgetRows(budgets, spending) {
  return Object.entries(budgets)
    .map(([category, limit]) => {
      const spent = spending[category] || 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return { category, limit, spent, pct, tone: pct > 100 ? 'over' : pct >= 80 ? 'near' : 'ok' };
    })
    .sort((a, b) => b.pct - a.pct);
}

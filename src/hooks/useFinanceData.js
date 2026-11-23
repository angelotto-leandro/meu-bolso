import { useState, useEffect, useCallback } from 'react';
import { supabase, unwrap } from '@/lib/supabase';
import { monthStart, monthEnd } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';

export function useFinanceData(monthDate) {
  const { user } = useAuth();
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const start = monthStart(monthDate);
    const end = monthEnd(monthDate);
    try {
      const [d, f, i] = await Promise.all([
        unwrap(supabase.from('daily_expenses').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false })),
        // Gasto fixo conta no mês se começou até o fim do mês e não terminou antes do início dele.
        unwrap(supabase.from('fixed_expenses').select('*').eq('user_id', user.id).lte('start_month', end).or(`end_month.is.null,end_month.gte.${start}`).order('due_day')),
        unwrap(supabase.from('incomes').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false })),
      ]);
      setDailyExpenses(d);
      setFixedExpenses(f);
      setIncomes(i);
      setError(null);
    } catch (e) {
      setError(e.message || 'Erro ao carregar os dados');
    } finally {
      setLoading(false);
    }
  }, [monthDate, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Atualiza ao voltar para o app (ex.: depois de lançar pelo Atalho do iPhone).
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  return { dailyExpenses, fixedExpenses, incomes, loading, error, reload: load };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase, unwrap } from '@/lib/supabase';
import { monthStart, monthEnd } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';

// period = { start, end } (mês ou fatura); monthDate = mês de referência (para os gastos fixos).
export function useFinanceData(period, monthDate) {
  const { user } = useAuth();
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const start = period?.start;
  const end = period?.end;
  const mStart = monthDate ? monthStart(monthDate) : null;
  const mEnd = monthDate ? monthEnd(monthDate) : null;

  const load = useCallback(async () => {
    if (!user?.id || !start || !end) return;
    try {
      const [d, f, i] = await Promise.all([
        unwrap(supabase.from('daily_expenses').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false })),
        // Gasto fixo conta uma vez por mês/fatura: se começou até esse mês e não terminou antes dele.
        unwrap(supabase.from('fixed_expenses').select('*').eq('user_id', user.id).lte('start_month', mEnd).or(`end_month.is.null,end_month.gte.${mStart}`).order('due_day')),
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
  }, [user?.id, start, end, mStart, mEnd]);

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

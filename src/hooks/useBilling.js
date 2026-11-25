import { useState, useEffect, useCallback } from 'react';
import { supabase, unwrap } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

// Dia de fechamento da fatura (null = mês a mês) e datas reais de fechamento.
export function useBilling() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [closeDay, setCloseDayState] = useState(null);
  const [overrides, setOverrides] = useState({});

  const reload = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [profile, closings] = await Promise.all([
        unwrap(supabase.from('profiles').select('billing_close_day').eq('id', user.id).maybeSingle()),
        unwrap(supabase.from('invoice_closings').select('month, close_date').eq('user_id', user.id)),
      ]);
      setCloseDayState(profile?.billing_close_day ?? null);
      setOverrides(Object.fromEntries((closings || []).map((c) => [c.month, c.close_date])));
    } catch {
      // Banco ainda sem a atualização da fatura: segue mês a mês.
      setCloseDayState(null);
      setOverrides({});
    } finally {
      setLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setCloseDay = async (day) => {
    await unwrap(supabase.rpc('set_billing_close_day', { dia: day }));
    setCloseDayState(day);
  };

  // monthKey = 'AAAA-MM-01' da fatura; date = 'AAAA-MM-DD' ou null para voltar ao dia padrão.
  const setClosing = async (monthKey, date) => {
    if (date) {
      await unwrap(
        supabase.from('invoice_closings').upsert({ user_id: user.id, month: monthKey, close_date: date }, { onConflict: 'user_id,month' })
      );
      setOverrides((o) => ({ ...o, [monthKey]: date }));
    } else {
      await unwrap(supabase.from('invoice_closings').delete().eq('user_id', user.id).eq('month', monthKey));
      setOverrides((o) => {
        const n = { ...o };
        delete n[monthKey];
        return n;
      });
    }
  };

  return { loaded, closeDay, overrides, setCloseDay, setClosing, reload };
}

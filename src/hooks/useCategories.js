import { useState, useEffect, useCallback } from 'react';
import { supabase, unwrap } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const list = await unwrap(supabase.from('categories').select('*').eq('user_id', user.id).order('name'));
    setCategories(list);
  }, [user?.id]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return { categories, reloadCategories: reload };
}

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null); // { id, email, role }
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [recovering, setRecovering] = useState(false);

  const loadProfile = useCallback(async (s) => {
    if (!s?.user) {
      setUser(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('role, email').eq('id', s.user.id).maybeSingle();
    setUser({ id: s.user.id, email: s.user.email || data?.email, role: data?.role || 'user' });
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      setIsLoadingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
      // Não chamar o Supabase direto aqui dentro (pode travar); adia um tique.
      setTimeout(() => loadProfile(s), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = import.meta.env.BASE_URL + 'login';
  };

  return (
    <AuthContext.Provider value={{ session, user, isAuthenticated: !!session, isLoadingAuth, recovering, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};

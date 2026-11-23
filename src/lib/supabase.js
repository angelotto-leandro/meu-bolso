import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const GOOGLE_LOGIN = import.meta.env.VITE_GOOGLE_LOGIN === 'true';

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

// Endereço público do app (com o caminho do GitHub Pages, se houver).
export const appUrl = (path = '') => window.location.origin + import.meta.env.BASE_URL + path;

// Lança o erro do Supabase em vez de devolver { data, error }.
export async function unwrap(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

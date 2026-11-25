import React, { createContext, useContext, useEffect, useState } from 'react';

// Aparência do app: 'auto' (segue o celular), 'light' ou 'dark'. Fica salva só neste aparelho.
const KEY = 'meu-bolso-tema';
const COLORS = { light: '#F8FAFC', dark: '#000000' };
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function applyTheme(pref) {
  const resolved = pref === 'auto' ? (media().matches ? 'dark' : 'light') : pref;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', COLORS[resolved]));
  return resolved;
}

const ThemeContext = createContext({ pref: 'auto', resolved: 'light', setPref: () => {} });

export function ThemeProvider({ children }) {
  const [pref, setPrefState] = useState(getThemePref);
  const [resolved, setResolved] = useState(() => applyTheme(getThemePref()));

  useEffect(() => {
    setResolved(applyTheme(pref));
    if (pref !== 'auto') return;
    const mq = media();
    const onChange = () => setResolved(applyTheme('auto'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const setPref = (p) => {
    try {
      if (p === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      // sem armazenamento: vale só até fechar o app
    }
    setPrefState(p);
  };

  return <ThemeContext.Provider value={{ pref, resolved, setPref }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

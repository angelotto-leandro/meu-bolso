import React from 'react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { SunMoon, Sun, Moon } from 'lucide-react';

const OPTIONS = [
  { value: 'auto', label: 'Automático', icon: SunMoon },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
];

export default function ThemePicker() {
  const { pref, setPref } = useTheme();
  return (
    <div>
      <p className="label-eyebrow text-muted-foreground mb-2">Aparência</p>
      <div className="flex p-1 gap-1 rounded-xl bg-secondary/60" role="radiogroup" aria-label="Aparência">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={pref === o.value}
            onClick={() => setPref(o.value)}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors',
              pref === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <o.icon className="w-3.5 h-3.5" /> {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

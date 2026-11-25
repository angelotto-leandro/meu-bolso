import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useAuth } from '@/lib/AuthContext';
import { supabase, unwrap } from '@/lib/supabase';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Tags, PieChart, Loader2, UserCircle2, LogOut, Users, Smartphone, ChevronRight, CreditCard, Target, BarChart3 } from 'lucide-react';
import AdminUsersPanel from '@/components/finance/AdminUsersPanel';
import ChartsPanel from '@/components/finance/ChartsPanel';
import ThemePicker from '@/components/ThemePicker';
import ShortcutSheet from '@/components/finance/ShortcutSheet';
import BillingSheet from '@/components/finance/BillingSheet';

export default function AppSidebar({ open, onOpenChange, dailyExpenses, fixedExpenses, incomes, periodLabel, billing, categories, onCategoriesChanged, onOpenBudgets, onOpenEvolution }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('categories');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);

  const customNames = categories.map((c) => c.name);

  const addCategory = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if ([...DEFAULT_CATEGORIES, ...customNames].some((n) => n.toLowerCase() === name.toLowerCase())) {
      setNewName('');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await unwrap(supabase.from('categories').insert({ name }));
      setNewName('');
      onCategoriesChanged?.();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (id) => {
    await unwrap(supabase.from('categories').delete().eq('id', id)).catch(() => {});
    onCategoriesChanged?.();
  };

  const tabClass = (t) =>
    cn('flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors', tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[300px] sm:max-w-sm p-0 flex flex-col">
          <SheetHeader className="p-4 pb-3 border-b border-border text-left space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-brand text-on-brand grid place-items-center font-display font-bold text-lg shrink-0">B</div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-display">Meu Bolso</SheetTitle>
                <SheetDescription asChild>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate" title={user?.email}>{user?.email || 'Carregando…'}</span>
                  </div>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <button
              onClick={() => setShortcutOpen(true)}
              className="w-full flex items-center gap-3 rounded-xl border border-brand/25 bg-brand-soft p-3 text-left hover:border-brand/50 transition-colors"
            >
              <span className="w-9 h-9 rounded-lg bg-brand text-on-brand grid place-items-center shrink-0"><Smartphone className="w-4 h-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Atalho do iPhone</span>
                <span className="block text-[11px] text-muted-foreground">Gasto ou ganho com dois toques</span>
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setBillingOpen(true)}
              className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-brand/40 transition-colors"
            >
              <span className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] grid place-items-center shrink-0"><CreditCard className="w-4 h-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Fatura do cartão</span>
                <span className="block text-[11px] text-muted-foreground">
                  {billing?.closeDay ? `Por fatura · fecha dia ${billing.closeDay}` : 'Desligado · mês a mês'}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onOpenChange(false); onOpenBudgets?.(); }}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-left hover:border-brand/40 transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 text-[#D97706] dark:text-[#FBBF24] grid place-items-center shrink-0"><Target className="w-4 h-4" /></span>
                <span className="text-xs font-semibold text-foreground leading-tight">Limites por categoria</span>
              </button>
              <button
                onClick={() => { onOpenChange(false); onOpenEvolution?.(); }}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-left hover:border-brand/40 transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 text-[#3B82F6] dark:text-[#60A5FA] grid place-items-center shrink-0"><BarChart3 className="w-4 h-4" /></span>
                <span className="text-xs font-semibold text-foreground leading-tight">Evolução</span>
              </button>
            </div>

            <div className="flex p-1 gap-1 rounded-xl bg-secondary/60">
              <button onClick={() => setTab('categories')} className={tabClass('categories')}>
                <Tags className="w-3.5 h-3.5" /> Categorias
              </button>
              <button onClick={() => setTab('table')} className={tabClass('table')}>
                <PieChart className="w-3.5 h-3.5" /> Gráficos
              </button>
              {user?.role === 'admin' && (
                <button onClick={() => setTab('users')} className={tabClass('users')}>
                  <Users className="w-3.5 h-3.5" /> Usuários
                </button>
              )}
            </div>

            {tab === 'categories' ? (
              <div className="space-y-4">
                <div>
                  <p className="label-eyebrow text-muted-foreground mb-2">Padrão</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_CATEGORIES.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="label-eyebrow text-muted-foreground mb-2">Minhas categorias</p>
                  {categories.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma categoria personalizada ainda.</p>}
                  <div>
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                        <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                        <button onClick={() => removeCategory(c.id)} className="text-muted-foreground hover:text-expense transition-colors shrink-0 p-1" aria-label={`Excluir ${c.name}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <form onSubmit={addCategory} className="flex gap-2">
                  <Input placeholder="Nova categoria" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9" maxLength={60} />
                  <Button type="submit" size="icon" disabled={saving || !newName.trim()} className="h-9 w-9 shrink-0 bg-brand hover:bg-brand-strong" aria-label="Adicionar categoria">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </form>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            ) : tab === 'users' ? (
              <AdminUsersPanel />
            ) : (
              <ChartsPanel dailyExpenses={dailyExpenses} fixedExpenses={fixedExpenses} incomes={incomes} periodLabel={periodLabel} />
            )}
          </div>

          <div className="p-4 border-t border-border shrink-0 space-y-3">
            <ThemePicker />
            <Button variant="outline" onClick={() => logout()} className="w-full text-expense hover:text-expense/80 hover:bg-expense-soft hover:border-expense-border">
              <LogOut className="w-4 h-4" /> Sair da conta
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <ShortcutSheet open={shortcutOpen} onOpenChange={setShortcutOpen} />
      {billing && <BillingSheet open={billingOpen} onOpenChange={setBillingOpen} billing={billing} />}
    </>
  );
}

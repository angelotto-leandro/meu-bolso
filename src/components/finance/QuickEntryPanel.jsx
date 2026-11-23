import React from 'react';
import EntryTabs from './EntryTabs';

export default function QuickEntryPanel(props) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden sticky top-4 shadow-sm">
      <div className="p-4 pb-0">
        <h2 className="font-display font-bold text-foreground text-base">Lançamento rápido</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Registre gastos, fixos e receitas.</p>
      </div>
      <div className="p-4 max-h-[calc(100vh-3rem)] overflow-y-auto">
        <EntryTabs {...props} />
      </div>
    </div>
  );
}

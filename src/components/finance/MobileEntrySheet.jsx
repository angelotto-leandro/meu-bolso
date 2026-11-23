import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import EntryTabs from './EntryTabs';

export default function MobileEntrySheet({ open, onOpenChange, ...props }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle className="font-display font-bold text-lg">Novo Lançamento</DrawerTitle>
          <DrawerDescription className="sr-only">Lance gastos, gastos fixos e receitas</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-safe overflow-y-auto">
          <EntryTabs {...props} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { isConfigured } from '@/lib/supabase';
import '@/index.css';

function NotConfigured() {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-sm space-y-2">
        <p className="font-display font-bold text-lg">Falta configurar o Supabase</p>
        <p className="text-muted-foreground">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (arquivo <code>.env</code> ou variáveis do GitHub) e gere o app de novo.
        </p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isConfigured ? <App /> : <NotConfigured />}</React.StrictMode>
);

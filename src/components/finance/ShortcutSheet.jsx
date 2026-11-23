import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase, SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Copy, Check, KeyRound, Loader2, AlertTriangle } from 'lucide-react';

function CopyField({ label, value, secret }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt('Copie o texto:', value);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <p className="label-eyebrow text-muted-foreground mb-1">{label}</p>
      <div className="flex items-stretch gap-1.5">
        <code className={cn('flex-1 min-w-0 rounded-lg border border-border bg-secondary/50 px-2.5 py-2 text-[11px] break-all', secret && 'font-semibold text-foreground')}>{value}</code>
        <Button type="button" variant="outline" size="icon" onClick={copy} className="shrink-0 h-auto w-10" aria-label={`Copiar ${label}`}>
          {copied ? <Check className="text-[#059669]" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-[#059669] text-white text-xs font-bold grid place-items-center shrink-0 mt-0.5">{n}</span>
      <div className="min-w-0 flex-1 space-y-1.5 text-sm text-foreground">
        <p className="font-semibold">{title}</p>
        <div className="text-[13px] text-muted-foreground space-y-1.5">{children}</div>
      </div>
    </li>
  );
}

const B = ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>;
const C = ({ children }) => <code className="px-1 py-0.5 rounded bg-secondary text-foreground text-[12px]">{children}</code>;

export default function ShortcutSheet({ open, onOpenChange }) {
  const [hasToken, setHasToken] = useState(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    supabase.rpc('has_shortcut_token').then(({ data }) => setHasToken(!!data));
  }, [open]);

  const generate = async () => {
    if (hasToken && !token && !window.confirm('Gerar um novo código desativa o anterior. O Atalho que já está no iPhone vai parar de funcionar até você trocar o código nele. Continuar?')) return;
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.rpc('generate_shortcut_token');
    setBusy(false);
    if (err) return setError(err.message);
    setToken(data);
    setHasToken(true);
  };

  const urlCategorias = `${SUPABASE_URL}/rest/v1/rpc/atalho_categorias`;
  const urlLancar = `${SUPABASE_URL}/rest/v1/rpc/atalho_lancar`;
  const tokenText = token || 'SEU_CÓDIGO';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 pr-12 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base font-display">Atalho do iPhone</SheetTitle>
          <SheetDescription className="text-xs">
            Dois toques na traseira do iPhone para lançar um gasto, sem abrir o app.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Código pessoal */}
          <div className="rounded-xl border border-[#059669]/25 bg-[#ECFDF5] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#059669]" />
              <p className="font-display font-semibold text-sm text-foreground">Seu código pessoal</p>
            </div>
            {token ? (
              <>
                <CopyField label="Código (aparece só agora)" value={token} secret />
                <p className="flex gap-1.5 text-[12px] text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Copie agora e cole no Atalho. Por segurança ele não aparece de novo. Não envie para outras pessoas: quem tiver o código consegue lançar gastos na sua conta.
                </p>
              </>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {hasToken
                  ? 'Você já gerou um código antes. Se perdeu ou vai configurar outro iPhone, gere um novo (o anterior para de funcionar).'
                  : 'Gere o código que liga o Atalho do iPhone à sua conta.'}
              </p>
            )}
            {!token && (
              <Button onClick={generate} disabled={busy || hasToken === null} className="w-full bg-[#059669] hover:bg-[#047857]">
                {busy && <Loader2 className="animate-spin" />} {hasToken ? 'Gerar novo código' : 'Gerar meu código'}
              </Button>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-3">
            <CopyField label="Link das categorias" value={urlCategorias} />
            <CopyField label="Link para lançar" value={urlLancar} />
            <CopyField label="Chave (cabeçalho apikey)" value={SUPABASE_KEY} />
          </div>

          {/* Passo a passo */}
          <div>
            <p className="font-display font-semibold text-sm text-foreground mb-3">Montar o Atalho (uma vez só)</p>
            <ol className="space-y-4">
              <Step n={1} title="Abra o app Atalhos e crie um atalho novo">
                <p>Toque em <B>+</B> e dê o nome <B>Lançar gasto</B>. Adicione as ações abaixo, nesta ordem (use a busca de ações).</p>
              </Step>
              <Step n={2} title="Obter Conteúdo de URL (busca suas categorias)">
                <p>URL: o <B>Link das categorias</B>.</p>
                <p>Toque na setinha e ajuste: Método <B>POST</B>. Em <B>Cabeçalhos</B>, adicione <C>apikey</C> com a <B>Chave</B>.</p>
                <p>Corpo da Solicitação: <B>JSON</B>. Adicione o campo <C>token</C> (Texto) com o seu <B>código</B>.</p>
              </Step>
              <Step n={3} title="Escolher da Lista">
                <p>Lista: <B>Conteúdos da URL</B>. Em “Mostrar mais”, Pergunta: <C>Categoria</C>.</p>
              </Step>
              <Step n={4} title="Pedir Entrada (valor)">
                <p>Tipo: <B>Número</B>. Pergunta: <C>Valor do gasto</C>. Ative <B>Permitir Decimais</B>.</p>
              </Step>
              <Step n={5} title="Pedir Entrada (data)">
                <p>Tipo: <B>Data</B>. Pergunta: <C>Data</C>. Resposta Padrão: <B>Data Atual</B>.</p>
              </Step>
              <Step n={6} title="Formatar Data">
                <p>Data: a <B>Entrada Fornecida</B> do passo 5. Formato da Data: <B>Personalizado</B>, com o texto <C>yyyy-MM-dd</C>. Formato da Hora: <B>Nenhum</B>.</p>
              </Step>
              <Step n={7} title="Lista + Escolher da Lista (pagamento)">
                <p>Ação <B>Lista</B> com os itens: <C>Débito</C> <C>Crédito</C> <C>Pix</C> <C>Dinheiro</C>.</p>
                <p>Depois <B>Escolher da Lista</B> com essa lista. Pergunta: <C>Forma de pagamento</C>.</p>
              </Step>
              <Step n={8} title="Obter Conteúdo de URL (lança o gasto)">
                <p>URL: o <B>Link para lançar</B>. Método <B>POST</B>, cabeçalho <C>apikey</C> com a <B>Chave</B>, como no passo 2.</p>
                <p>Corpo: <B>JSON</B>, com estes campos do tipo Texto:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li><C>token</C> → seu código</li>
                  <li><C>valor</C> → Entrada Fornecida (passo 4)</li>
                  <li><C>data</C> → Data Formatada (passo 6)</li>
                  <li><C>categoria</C> → Item Escolhido (passo 3)</li>
                  <li><C>pagamento</C> → Item Escolhido (passo 7)</li>
                </ul>
                <p>Para pôr uma variável, toque no campo e escolha na barra acima do teclado (ou em “Selecionar Variável”).</p>
              </Step>
              <Step n={9} title="Mostrar Notificação">
                <p>Texto: <B>Conteúdos da URL</B> (do passo 8). Ela mostra “✅ R$ 25,90 em Mercado” ou o erro, se algo der errado.</p>
              </Step>
              <Step n={10} title="Ligar ao Toque Atrás">
                <p>Ajustes → Acessibilidade → Toque → <B>Toque Atrás</B> → <B>Toque Duplo</B> → escolha <B>Lançar gasto</B>.</p>
              </Step>
            </ol>
          </div>

          <div className="rounded-xl border border-border p-3 text-[12px] text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground text-[13px]">Dicas</p>
            <p>• Teste primeiro tocando no atalho dentro do app Atalhos. Na primeira vez o iPhone pede permissão para acessar o site do Supabase: toque em <B>Permitir</B>.</p>
            <p>• Para a família: depois de pronto, você pode compartilhar o atalho por link do iCloud. Cada pessoa troca o <C>token</C> pelo código dela (nos passos 2 e 8).</p>
            <p>• O gasto aparece no app na hora em que você abrir ou voltar para ele.</p>
          </div>

          <details className="text-[12px] text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground text-[13px]">Exemplo do corpo JSON (para conferir)</summary>
            <pre className="mt-2 rounded-lg bg-secondary/60 p-3 overflow-x-auto text-[11px] text-foreground">{`{
  "token": "${tokenText}",
  "valor": "25,90",
  "data": "2026-11-23",
  "categoria": "Mercado",
  "pagamento": "Pix"
}`}</pre>
          </details>
        </div>
      </SheetContent>
    </Sheet>
  );
}
